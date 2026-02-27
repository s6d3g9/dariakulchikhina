# 🤖 AI SYSTEM CONTEXT v3.0: BPMN & MICRO-TRANSACTIONS
**Project Type:** Project & Construction Management ERP (Premium Segment)
**Active Module:** `[MODULE: APARTMENT_PREMIUM_WORKFLOW]`
**Format:** Machine-Readable Business Process Logic

## 📌 INSTRUCTIONS FOR AI AGENT
1. **Mapping:** Use this document to map API endpoints, database triggers, and UI states. 
2. **Transitions:** A phase CANNOT transition to the next state until all mandatory `Artifacts` in the current phase are generated and `State_Change` criteria are met.
3. **Missing Logic:** If a user requests a feature not explicitly covered here, use the PMBOK/RIBA framework to infer the closest logical implementation and prompt the user for confirmation.

---

## ⚙️ WORKFLOW ENGINE: MICRO-STEPS & TRIGGERS

### PHASE 0: PRE-CONTRACT & DISCOVERY (Инициация)
* **Step 0.1: Lead Capture**
    * *Trigger:* Client fills out web form / incoming call.
    * *System Action:* Create `Project` entity. Set `Project.Status = LEAD_NEW`.
* **Step 0.2: Smart Briefing**
    * *Trigger:* PM sends survey link to Client. Client submits.
    * *System Action:* Parse answers into `DesignBrief` JSON. Tag requirements (e.g., `has_kids`, `smart_home`).
* **Step 0.3: Site Survey & Digital Twin**
    * *Trigger:* Engineer uploads laser scan (`.e57`) and MEP audit report.
    * *System Action:* Store files in S3. Create `SurveyReport`. Set `Project.Status = SURVEY_COMPLETED`.
* **Step 0.4: ToR & Contracting**
    * *Trigger:* PM generates Terms of Reference (ToR) + Stage 1 Invoice.
    * *System Action:* Send via e-Sign API. Wait for webhook `sign_completed` and `payment_received`.
    * *State_Change:* `Project.Status = DESIGN_ACTIVE`.
    * *Artifacts:* Signed `Contract_ToR.pdf`, `Invoice_Advance.pdf`.

### PHASE 1: CONCEPT & SPATIAL DESIGN (Эскиз)
* **Step 1.1: Space Planning**
    * *Trigger:* Architect uploads 2D layouts (`.dwg` / `.pdf`).
    * *System Action:* Notify Client. Enable `Approval Workflow`.
    * *State_Change:* Client clicks "Approve" -> `Layout.Status = APPROVED_LOCKED`.
* **Step 1.2: Moodboarding**
    * *Trigger:* Designer uploads references and textures.
    * *System Action:* Render interactive gallery. Enable "Pin Comments".
* **Step 1.3: White-box 3D Approval**
    * *Trigger:* Designer uploads volumetric 3D model.
    * *System Action:* Request Client signature.
    * *State_Change:* `Phase1.Status = COMPLETED`. Lock geometry modifications.

### PHASE 2: TECHNICAL DESIGN & ENGINEERING (Рабочий проект)
* **Step 2.1: Photorealistic 3D Rendering**
    * *Trigger:* Designer uploads final renders.
    * *System Action:* Version control activated (v1, v2). Client approves per room.
* **Step 2.2: MEP Integration (Инженерные сети)**
    * *Trigger:* Subcontractors upload HVAC, Plumbing, Smart Home schemes.
    * *System Action:* PM runs clash detection. Create `ClashTicket` if conflicts exist.
* **Step 2.3: Custom Millwork Detailing**
    * *Trigger:* Designer uploads custom furniture drawings.
    * *System Action:* Extract material quantities for BoQ (Bill of Quantities).
* **Step 2.4: Permitting & HOA Approval (Согласование с УК)** *(CRITICAL)*
    * *Trigger:* PM submits MEP & Layout plans to Building Management (УК).
    * *System Action:* Track approval status. Halt Stage 4 if `HOA_Approval = PENDING`.
* **Step 2.5: Final Blueprint Assembly**
    * *Trigger:* All drawings approved.
    * *System Action:* Merge into Master-PDF. Apply "Approved for Construction" watermark.
    * *State_Change:* `Phase2.Status = READY_FOR_CONSTRUCTION`.

### PHASE 3: PROCUREMENT & VALUE ENGINEERING (Сметы и закупки)
* **Step 3.1: BoQ Generation**
    * *Trigger:* Parser extracts item lists from blueprints.
    * *System Action:* Populate `Dynamic BoQ` table. Assign unique `Item_ID`.
* **Step 3.2: Tendering (RFP)**
    * *Trigger:* PM sends Request for Proposal to vendors (e.g., Windows, Kitchen).
    * *System Action:* Vendors submit bids via external portal. System compares bids side-by-side.
* **Step 3.3: Value Engineering (Оптимизация бюджета)** *(CRITICAL)*
    * *Trigger:* Total BoQ exceeds target budget.
    * *System Action:* Activate VE module. Propose alternative materials (lower cost, same aesthetic). Track `Savings_Amount`.
* **Step 3.4: Master Budget Lock**
    * *Trigger:* Client approves final BoQ and Payment Schedule.
    * *System Action:* `BoQ.Status = BASELINE_LOCKED`. Generate Long-lead Purchase Orders (POs).

### PHASE 4: EXECUTION & SITE MANAGEMENT (Стройка)
* **Step 4.1: Site Mobilization & Rough-in**
    * *Trigger:* Contractor checks in on site.
    * *System Action:* Start `WBS_Task` tracking (Gantt). Contractor posts daily photos to `SiteJournal`.
* **Step 4.2: Design Supervision (Авторский надзор)**
    * *Trigger:* Architect inspects site, finds discrepancy.
    * *System Action:* Architect creates `RFI_Ticket` or `DefectLog` entry. Assigns to Contractor. SLA timer starts.
* **Step 4.3: Change Order Management** *(CRITICAL)*
    * *Trigger:* Client requests scope change (e.g., add heated floor).
    * *System Action:* Create `ChangeOrder`. Auto-calculate cost impact and schedule delay. Require e-Sign.
    * *State_Change:* If approved, mutate `BoQ` and `WBS_Timeline`.
* **Step 4.4: Progress Billing (Актирование)**
    * *Trigger:* Milestone reached (e.g., "Drywall completed").
    * *System Action:* Generate `Progress_Invoice`. Client pays.

### PHASE 5: COMMISSIONING & HANDOVER (Сдача объекта)
* **Step 5.1: MEP Commissioning (ПНР)**
    * *Trigger:* Engineer tests HVAC/Smart Home.
    * *System Action:* Upload `Test_Protocol.pdf` to As-Built Archive.
* **Step 5.2: Snagging (Дефектовка)**
    * *Trigger:* PM and Client walk through the site.
    * *System Action:* Create `SnagTicket` with photo, location coordinates, and priority.
    * *State_Change:* Track `SnagTicket` from OPEN -> FIXING -> VERIFIED_CLOSED.
* **Step 5.3: Retention Release (Возврат удержания)** *(CRITICAL)*
    * *Trigger:* All Snags closed. Handover act signed.
    * *System Action:* Unlock the 5% `Retention_Money` withheld from the Contractor's payments. Issue final invoice.
* **Step 5.4: Digital Handover**
    * *Trigger:* Project close-out checklist complete.
    * *System Action:* Compile `AsBuiltArchive` (Drawings, Warranties, Care Manuals).
    * *State_Change:* `Project.Status = COMPLETED`. Move to `WARRANTY_MAINTENANCE`.

---
## 🔄 SYSTEM AUTOMATIONS & WEBHOOKS (For Backend Devs)
* `on_status_change(APPROVED)`: Auto-unlock next phase in UI.
* `on_budget_variance(>5%)`: Send alert notification to PM and Client.
* `on_schedule_delay(>3 days)`: Highlight Gantt path in RED, request mitigation plan from Contractor.

---

## 🗃️ DATA MODEL MAP

| BPMN Status         | `projects.status` value | Фаза                       |
|---------------------|------------------------|----------------------------|
| LEAD_NEW            | `lead`                 | 0 · Инициация              |
| SURVEY_COMPLETED    | `survey`               | 0 · Инициация              |
| DESIGN_ACTIVE       | `concept`              | 1 · Эскиз                  |
| READY_FOR_CONSTRUCTION | `working_project`   | 2 · Рабочий проект         |
| PROCUREMENT_ACTIVE  | `procurement`          | 3 · Сметы и закупки        |
| CONSTRUCTION_ACTIVE | `construction`         | 4 · Стройка                |
| COMMISSIONING       | `commissioning`        | 5 · Сдача объекта          |
| COMPLETED           | `completed`            | ✓ Завершён                 |

## 🏷️ PHASE DEFINITIONS (for UI)

```ts
export const PROJECT_PHASES = [
  { key: 'lead',          label: 'Инициация',         short: '0',  color: 'gray'   },
  { key: 'concept',       label: 'Эскиз',             short: '1',  color: 'violet' },
  { key: 'working_project', label: 'Рабочий проект',  short: '2',  color: 'blue'   },
  { key: 'procurement',   label: 'Закупки',           short: '3',  color: 'amber'  },
  { key: 'construction',  label: 'Стройка',           short: '4',  color: 'orange' },
  { key: 'commissioning', label: 'Сдача',             short: '5',  color: 'green'  },
  { key: 'completed',     label: 'Завершён',          short: '✓',  color: 'teal'   },
]
```
