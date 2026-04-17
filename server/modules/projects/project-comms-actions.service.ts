import { ensureHybridControl } from '~/shared/utils/project-control'
import {
  createExtraService,
  createExtraServiceInvoice,
  createHybridTask,
  createWorkStatusTask,
  HYBRID_TASK_STATUS_LABELS,
  loadProject,
  normalizePayloadText,
  parsePrefixedNumber,
  persistHybridControl,
  PROJECT_STATUS_LABELS,
  resolveProjectStatus,
  setProjectStatus,
  updateHybridTask,
  updateWorkStatusTask,
  workStatusLabel,
  type MessengerProjectMutationActionId,
  type MessengerProjectMutationPayload,
  type ProjectCommunicationActionResult,
} from '~/server/modules/projects/project-comms-action-helpers.service'

export type { MessengerProjectMutationActionId, MessengerProjectMutationPayload, ProjectCommunicationActionResult }

export async function executeProjectCommunicationAction(
  slug: string,
  actionId: MessengerProjectMutationActionId,
  payload: MessengerProjectMutationPayload,
): Promise<ProjectCommunicationActionResult> {
  const { project } = await loadProject(slug)

  switch (actionId) {
    case 'create_task': {
      if (normalizePayloadText(payload.sprintId)) {
        const control = ensureHybridControl(project.profile.hybridControl, project)
        const task = createHybridTask(control, project, payload)
        await persistHybridControl(project, control)
        return {
          message: `Задача добавлена в контроль проекта: ${task.title}`,
          mutation: {
            kind: 'hybrid-task',
            id: task.id,
            label: task.title,
          },
        }
      }

      const task = await createWorkStatusTask(project, payload)
      return {
        message: `Задача добавлена в статус работ: ${task.title}`,
        mutation: {
          kind: 'work-status',
          id: String(task.id),
          label: task.title,
        },
      }
    }

    case 'assign_task': {
      if (payload.taskMode === 'existing') {
        if (payload.taskId?.startsWith('hybrid:')) {
          const control = ensureHybridControl(project.profile.hybridControl, project)
          const task = updateHybridTask(control, payload, 'assign_task')
          await persistHybridControl(project, control)
          return {
            message: `Задача обновлена в контроле проекта: ${task.title}`,
            mutation: {
              kind: 'hybrid-task',
              id: task.id,
              label: task.title,
            },
          }
        }

        const task = await updateWorkStatusTask(project, payload, 'assign_task')
        return {
          message: `Задача переназначена: ${task.title}`,
          mutation: {
            kind: 'work-status',
            id: String(task.id),
            label: task.title,
          },
        }
      }

      const contractorId = parsePrefixedNumber(payload.subjectId, 'contractor:')
      if (normalizePayloadText(payload.sprintId) && !contractorId) {
        const control = ensureHybridControl(project.profile.hybridControl, project)
        const task = createHybridTask(control, project, payload)
        await persistHybridControl(project, control)
        return {
          message: `Задача добавлена в контроль проекта: ${task.title}`,
          mutation: {
            kind: 'hybrid-task',
            id: task.id,
            label: task.title,
          },
        }
      }

      const task = await createWorkStatusTask(project, payload)
      return {
        message: `Задача назначена в статус работ: ${task.title}`,
        mutation: {
          kind: 'work-status',
          id: String(task.id),
          label: task.title,
        },
      }
    }

    case 'update_work_status': {
      if (payload.taskId?.startsWith('hybrid:')) {
        const control = ensureHybridControl(project.profile.hybridControl, project)
        const task = updateHybridTask(control, payload, 'update_work_status')
        await persistHybridControl(project, control)
        return {
          message: `Статус задачи обновлён: ${HYBRID_TASK_STATUS_LABELS[task.status]}`,
          mutation: {
            kind: 'hybrid-task',
            id: task.id,
            label: task.title,
          },
        }
      }

      const task = await updateWorkStatusTask(project, payload, 'update_work_status')
      return {
        message: `Статус задачи обновлён: ${payload.taskStatusLabel || workStatusLabel(task.status)}`,
        mutation: {
          kind: 'work-status',
          id: String(task.id),
          label: task.title,
        },
      }
    }

    case 'change_phase':
    case 'accept_stage': {
      const updated = await setProjectStatus(project, actionId, payload)
      const label = PROJECT_STATUS_LABELS[resolveProjectStatus(updated.status)] || updated.status
      return {
        message: actionId === 'accept_stage'
          ? `Этап принят. Текущая фаза: ${label}`
          : `Фаза проекта обновлена: ${label}`,
        mutation: {
          kind: 'project-status',
          id: updated.slug,
          label,
        },
      }
    }

    case 'order_extra_service': {
      const service = await createExtraService(project, payload)
      return {
        message: `Доп. услуга добавлена: ${service.title}`,
        mutation: {
          kind: 'extra-service',
          id: String(service.id),
          label: service.title,
        },
      }
    }

    case 'create_invoice': {
      const result = await createExtraServiceInvoice(project, payload)
      return {
        message: 'Счёт и доп. соглашение сформированы',
        mutation: {
          kind: 'document',
          id: String(result.invoiceDoc.id),
          label: result.invoiceDoc.title,
        },
      }
    }

    default:
      throw createError({
        statusCode: 400,
        statusMessage: 'Действие пока не поддерживается для прямой записи из чата',
      })
  }
}
