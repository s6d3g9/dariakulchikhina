import type {
  LocalFrame,
  Matrix4,
  Quaternion,
  SymmetryProfile,
  ToleranceProfile,
  Vec3,
} from './contracts.ts'

export const IDENTITY_MATRIX_4: Matrix4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z)
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z)
}

export function scaleVec3(value: Vec3, scale: number): Vec3 {
  return vec3(value.x * scale, value.y * scale, value.z * scale)
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  )
}

export function normVec3(value: Vec3): number {
  return Math.hypot(value.x, value.y, value.z)
}

export function normalizeVec3(value: Vec3): Vec3 {
  const norm = normVec3(value)
  if (!Number.isFinite(norm) || norm === 0) {
    throw new RangeError('cannot normalize a zero or non-finite vector')
  }
  return scaleVec3(value, 1 / norm)
}

export function isFiniteVec3(value: Vec3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)
}

export function frameDeterminant(frame: LocalFrame): number {
  return dotVec3(frame.right, crossVec3(frame.front, frame.up))
}

export function frameOrthonormalError(frame: LocalFrame): number {
  return Math.max(
    Math.abs(normVec3(frame.right) - 1),
    Math.abs(normVec3(frame.front) - 1),
    Math.abs(normVec3(frame.up) - 1),
    Math.abs(dotVec3(frame.right, frame.front)),
    Math.abs(dotVec3(frame.front, frame.up)),
    Math.abs(dotVec3(frame.up, frame.right)),
  )
}

export function isValidRightHandedFrame(
  frame: LocalFrame,
  tolerance: ToleranceProfile,
): boolean {
  if (
    !isFiniteVec3(frame.origin)
    || !isFiniteVec3(frame.right)
    || !isFiniteVec3(frame.front)
    || !isFiniteVec3(frame.up)
  ) {
    return false
  }
  return (
    frameOrthonormalError(frame) <= tolerance.frame
    && Math.abs(frameDeterminant(frame) - 1) <= tolerance.determinant
  )
}

export function translationMatrix(translation: Vec3): Matrix4 {
  return [
    1, 0, 0, translation.x,
    0, 1, 0, translation.y,
    0, 0, 1, translation.z,
    0, 0, 0, 1,
  ]
}

export function multiplyMatrix4(a: Matrix4, b: Matrix4): Matrix4 {
  const out = new Array<number>(16).fill(0)
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0
      for (let inner = 0; inner < 4; inner += 1) {
        sum += a[row * 4 + inner]! * b[inner * 4 + column]!
      }
      out[row * 4 + column] = sum
    }
  }
  return out as unknown as Matrix4
}

export function transformPoint(matrix: Matrix4, point: Vec3): Vec3 {
  const x = matrix[0] * point.x + matrix[1] * point.y + matrix[2] * point.z + matrix[3]
  const y = matrix[4] * point.x + matrix[5] * point.y + matrix[6] * point.z + matrix[7]
  const z = matrix[8] * point.x + matrix[9] * point.y + matrix[10] * point.z + matrix[11]
  const w = matrix[12] * point.x + matrix[13] * point.y + matrix[14] * point.z + matrix[15]
  if (!Number.isFinite(w) || Math.abs(w) < Number.EPSILON) {
    throw new RangeError('transform produced an invalid homogeneous coordinate')
  }
  return vec3(x / w, y / w, z / w)
}

export function determinantMatrix4LinearPart(matrix: Matrix4): number {
  const a = matrix[0]
  const b = matrix[1]
  const c = matrix[2]
  const d = matrix[4]
  const e = matrix[5]
  const f = matrix[6]
  const g = matrix[8]
  const h = matrix[9]
  const i = matrix[10]
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
}

export function reflectionMatrixFromNormal(normal: Vec3): Matrix4 {
  const n = normalizeVec3(normal)
  const xx = 1 - 2 * n.x * n.x
  const xy = -2 * n.x * n.y
  const xz = -2 * n.x * n.z
  const yy = 1 - 2 * n.y * n.y
  const yz = -2 * n.y * n.z
  const zz = 1 - 2 * n.z * n.z
  return [
    xx, xy, xz, 0,
    xy, yy, yz, 0,
    xz, yz, zz, 0,
    0, 0, 0, 1,
  ]
}

export function composeWorldTransform(
  hostToWorld: Matrix4,
  solverToHost: Matrix4,
  reflectionInCanonical: Matrix4,
  sourceToCanonical: Matrix4,
): Matrix4 {
  return multiplyMatrix4(
    hostToWorld,
    multiplyMatrix4(
      solverToHost,
      multiplyMatrix4(reflectionInCanonical, sourceToCanonical),
    ),
  )
}

export function canonicalizeQuaternion(value: Quaternion): Quaternion {
  const norm = Math.hypot(value.x, value.y, value.z, value.w)
  if (!Number.isFinite(norm) || norm === 0) {
    throw new RangeError('cannot canonicalize a zero or non-finite quaternion')
  }
  let normalized: Quaternion = {
    x: value.x / norm,
    y: value.y / norm,
    z: value.z / norm,
    w: value.w / norm,
  }
  const signProbe = Math.abs(normalized.w) > Number.EPSILON
    ? normalized.w
    : Math.abs(normalized.x) > Number.EPSILON
      ? normalized.x
      : Math.abs(normalized.y) > Number.EPSILON
        ? normalized.y
        : normalized.z
  if (signProbe < 0) {
    normalized = {
      x: -normalized.x,
      y: -normalized.y,
      z: -normalized.z,
      w: -normalized.w,
    }
  }
  return normalized
}

function normalizePositiveAngle(angleRad: number, period: number): number {
  const value = ((angleRad % period) + period) % period
  return Math.abs(value - period) <= Number.EPSILON * 16 ? 0 : value
}

export function canonicalizeYawBySymmetry(
  angleRad: number,
  symmetry: SymmetryProfile,
): number {
  if (!Number.isFinite(angleRad)) {
    throw new RangeError('yaw must be finite')
  }
  if (symmetry.kind === 'orientation-invariant') return 0
  if (symmetry.kind === 'cyclic'
      && (!Number.isInteger(symmetry.rotationalOrder) || symmetry.rotationalOrder < 2)) {
    throw new RangeError('cyclic symmetry requires an integer order of at least 2')
  }
  const period = symmetry.kind === 'cyclic'
    ? (2 * Math.PI) / symmetry.rotationalOrder
    : 2 * Math.PI
  return normalizePositiveAngle(angleRad, period)
}
