import type {
  LocalFrame,
  Matrix4,
  SpatialAssetProfileV1,
  SpatialContractIssue,
  ToleranceProfile,
} from './contracts.ts'
import {
  determinantMatrix4LinearPart,
  isValidRightHandedFrame,
} from './frames.ts'

function issue(code: string, path: string, message: string): SpatialContractIssue {
  return { code, path, message }
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function finitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function validateMatrix4(
  matrix: Matrix4,
  path: string,
  issues: SpatialContractIssue[],
): void {
  if (matrix.length !== 16 || matrix.some(value => !Number.isFinite(value))) {
    issues.push(issue('matrix.invalid', path, 'matrix must contain 16 finite numbers'))
  }
}

function validateFrame(
  frame: LocalFrame,
  tolerance: ToleranceProfile,
  path: string,
  issues: SpatialContractIssue[],
): void {
  if (!isValidRightHandedFrame(frame, tolerance)) {
    issues.push(issue(
      'frame.not-right-orthonormal',
      path,
      'frame must be finite, right-handed and orthonormal within tolerance',
    ))
  }
}

export function validateProfilePorts(
  value: SpatialAssetProfileV1,
  stateSet: ReadonlySet<string>,
  tolerance: ToleranceProfile,
  issues: SpatialContractIssue[],
): void {
  value.ports.forEach((port, index) => {
    validateFrame(port.frame, tolerance, `$.ports[${index}].frame`, issues)
    if (
      !finiteNonNegative(port.distanceRangeM.min)
      || !finiteNonNegative(port.distanceRangeM.max)
      || port.distanceRangeM.max < port.distanceRangeM.min
    ) {
      issues.push(issue(
        'profile.port-distance',
        `$.ports[${index}].distanceRangeM`,
        'port distance range must be finite, non-negative and ordered',
      ))
    }
    if (!finitePositive(port.positionToleranceM) || !finitePositive(port.angleToleranceRad)) {
      issues.push(issue(
        'profile.port-tolerance',
        `$.ports[${index}]`,
        'port tolerances must be finite and positive',
      ))
    }
    if (port.activeInStates.some(state => !stateSet.has(state))) {
      issues.push(issue(
        'profile.port-state',
        `$.ports[${index}].activeInStates`,
        'port references an unknown state',
      ))
    }
  })
}

export function validateProfileMirrors(
  value: SpatialAssetProfileV1,
  surfaceSet: ReadonlySet<string>,
  portSet: ReadonlySet<string>,
  tolerance: ToleranceProfile,
  issues: SpatialContractIssue[],
): void {
  value.mirrors.forEach((mirror, index) => {
    validateMatrix4(
      mirror.reflectionInCanonical,
      `$.mirrors[${index}].reflectionInCanonical`,
      issues,
    )
    const determinant = determinantMatrix4LinearPart(mirror.reflectionInCanonical)
    if (!Number.isFinite(determinant)
        || Math.abs(determinant + 1) > tolerance.determinant) {
      issues.push(issue(
        'profile.mirror-determinant',
        `$.mirrors[${index}].reflectionInCanonical`,
        'mirror linear transform must have determinant -1',
      ))
    }
    for (const pair of mirror.surfacePairs) {
      if (!surfaceSet.has(pair.leftId) || !surfaceSet.has(pair.rightId)) {
        issues.push(issue(
          'profile.mirror-surface',
          `$.mirrors[${index}].surfacePairs`,
          'mirror references an unknown surface',
        ))
      }
    }
    for (const pair of mirror.portPairs) {
      if (!portSet.has(pair.leftId) || !portSet.has(pair.rightId)) {
        issues.push(issue(
          'profile.mirror-port',
          `$.mirrors[${index}].portPairs`,
          'mirror references an unknown port',
        ))
      }
    }
  })
}
