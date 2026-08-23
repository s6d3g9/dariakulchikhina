import type { Aabb, Vec3 } from './contracts.ts'
import { isFiniteVec3, vec3 } from './frames.ts'

export function validateAabbShape(bounds: Aabb): boolean {
  return (
    isFiniteVec3(bounds.min)
    && isFiniteVec3(bounds.max)
    && bounds.min.x <= bounds.max.x
    && bounds.min.y <= bounds.max.y
    && bounds.min.z <= bounds.max.z
  )
}

export function inflateAabb(bounds: Aabb, radiusM: number): Aabb {
  if (!validateAabbShape(bounds)) {
    throw new RangeError('cannot inflate an invalid AABB')
  }
  if (!Number.isFinite(radiusM) || radiusM < 0) {
    throw new RangeError('AABB uncertainty radius must be finite and non-negative')
  }
  return {
    min: vec3(
      bounds.min.x - radiusM,
      bounds.min.y - radiusM,
      bounds.min.z - radiusM,
    ),
    max: vec3(
      bounds.max.x + radiusM,
      bounds.max.y + radiusM,
      bounds.max.z + radiusM,
    ),
  }
}

export function unionAabbs(values: readonly Aabb[]): Aabb {
  if (values.length === 0 || values.some(value => !validateAabbShape(value))) {
    throw new RangeError('AABB union requires at least one valid bound')
  }
  return values.slice(1).reduce<Aabb>((result, value) => ({
    min: vec3(
      Math.min(result.min.x, value.min.x),
      Math.min(result.min.y, value.min.y),
      Math.min(result.min.z, value.min.z),
    ),
    max: vec3(
      Math.max(result.max.x, value.max.x),
      Math.max(result.max.y, value.max.y),
      Math.max(result.max.z, value.max.z),
    ),
  }), values[0]!)
}

export function aabbContains(
  container: Aabb,
  candidate: Aabb,
  toleranceM = 0,
): boolean {
  if (!validateAabbShape(container) || !validateAabbShape(candidate)) return false
  if (!Number.isFinite(toleranceM) || toleranceM < 0) return false
  return (
    candidate.min.x >= container.min.x - toleranceM
    && candidate.min.y >= container.min.y - toleranceM
    && candidate.min.z >= container.min.z - toleranceM
    && candidate.max.x <= container.max.x + toleranceM
    && candidate.max.y <= container.max.y + toleranceM
    && candidate.max.z <= container.max.z + toleranceM
  )
}

export function aabbInteriorOverlapDepths(a: Aabb, b: Aabb): Vec3 {
  if (!validateAabbShape(a) || !validateAabbShape(b)) {
    throw new RangeError('overlap requires valid AABBs')
  }
  return vec3(
    Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x)),
    Math.max(0, Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y)),
    Math.max(0, Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z)),
  )
}

export function aabbHasInteriorOverlap(
  a: Aabb,
  b: Aabb,
  toleranceM = 0,
): boolean {
  if (!Number.isFinite(toleranceM) || toleranceM < 0) return false
  const overlap = aabbInteriorOverlapDepths(a, b)
  return (
    overlap.x > toleranceM
    && overlap.y > toleranceM
    && overlap.z > toleranceM
  )
}

export function robustAabb(
  bounds: Aabb,
  uncertaintyRadiusM: number,
): Aabb {
  return inflateAabb(bounds, uncertaintyRadiusM)
}
