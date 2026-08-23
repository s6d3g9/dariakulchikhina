import assert from 'node:assert/strict'
import test from 'node:test'

import type { Aabb, LocalFrame, ToleranceProfile } from '../src/contracts.ts'
import {
  IDENTITY_MATRIX_4,
  aabbContains,
  aabbHasInteriorOverlap,
  canonicalizeQuaternion,
  canonicalizeYawBySymmetry,
  composeWorldTransform,
  determinantMatrix4LinearPart,
  inflateAabb,
  isValidRightHandedFrame,
  reflectionMatrixFromNormal,
  transformPoint,
  translationMatrix,
  vec3,
} from '../src/index.ts'

const tolerance: ToleranceProfile = {
  version: '1.0.0',
  determinant: 1e-9,
  frame: 1e-7,
  geometryM: 1e-6,
  portM: 1e-3,
  angleRad: 1e-3,
}

const rightHandedFrame: LocalFrame = {
  origin: vec3(0, 0, 0),
  right: vec3(1, 0, 0),
  front: vec3(0, 1, 0),
  up: vec3(0, 0, 1),
}

test('right-handed frame is accepted and reflected frame is rejected', () => {
  assert.equal(isValidRightHandedFrame(rightHandedFrame, tolerance), true)
  assert.equal(isValidRightHandedFrame({
    ...rightHandedFrame,
    up: vec3(0, 0, -1),
  }, tolerance), false)
})

test('world transform applies source calibration, mirror, solver and host in order', () => {
  const sourceToCanonical = translationMatrix(vec3(1, 0, 0))
  const reflection = reflectionMatrixFromNormal(vec3(1, 0, 0))
  const solverToHost = translationMatrix(vec3(0, 3, 0))
  const hostToWorld = translationMatrix(vec3(10, 0, 0))
  const transform = composeWorldTransform(
    hostToWorld,
    solverToHost,
    reflection,
    sourceToCanonical,
  )

  assert.ok(Math.abs(determinantMatrix4LinearPart(reflection) + 1) < 1e-12)
  assert.deepEqual(transformPoint(transform, vec3(1, 0, 0)), vec3(8, 3, 0))
})

test('identity transform keeps a point unchanged', () => {
  assert.deepEqual(transformPoint(IDENTITY_MATRIX_4, vec3(1, -2, 3)), vec3(1, -2, 3))
})

test('quaternion sign aliases canonicalize to one representation', () => {
  const positive = canonicalizeQuaternion({ x: 1, y: 2, z: 3, w: 4 })
  const negative = canonicalizeQuaternion({ x: -1, y: -2, z: -3, w: -4 })
  assert.deepEqual(positive, negative)
})

test('cyclic symmetry removes duplicate yaw classes', () => {
  const symmetry = { kind: 'cyclic', rotationalOrder: 4 } as const
  const canonical = canonicalizeYawBySymmetry(Math.PI / 4, symmetry)
  for (let turn = -8; turn <= 8; turn += 1) {
    const equivalent = Math.PI / 4 + turn * Math.PI / 2
    assert.ok(Math.abs(canonicalizeYawBySymmetry(equivalent, symmetry) - canonical) < 1e-12)
  }
  assert.equal(canonicalizeYawBySymmetry(123.4, { kind: 'orientation-invariant' }), 0)
})

test('uncertainty growth cannot restore containment feasibility', () => {
  const room: Aabb = { min: vec3(0, 0, 0), max: vec3(10, 10, 3) }
  const nearWall: Aabb = { min: vec3(0.1, 1, 0.5), max: vec3(1, 2, 1.5) }
  const smallUncertainty = inflateAabb(nearWall, 0.05)
  const largeUncertainty = inflateAabb(nearWall, 0.2)

  assert.equal(aabbContains(room, smallUncertainty), true)
  assert.equal(aabbContains(room, largeUncertainty), false)
})

test('surface contact is not interior collision but positive volume is', () => {
  const a: Aabb = { min: vec3(0, 0, 0), max: vec3(1, 1, 1) }
  const touching: Aabb = { min: vec3(1, 0, 0), max: vec3(2, 1, 1) }
  const overlapping: Aabb = { min: vec3(0.9, 0, 0), max: vec3(2, 1, 1) }

  assert.equal(aabbHasInteriorOverlap(a, touching), false)
  assert.equal(aabbHasInteriorOverlap(a, overlapping), true)
})
