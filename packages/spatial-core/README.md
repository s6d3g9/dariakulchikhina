# Shell v6 spatial core

Executable foundation for the spatial placement kernel.

Current scope:

- public spatial contracts and restricted-audit separation;
- canonical hashing for public plans and Revit step operation IDs;
- frame, mirror and cyclic-symmetry math;
- uncertainty-aware AABB primitives;
- semantic validation of profiles, requests, constraints and plans;
- one versioned JSON Schema registry;
- Node property/contract tests.

This package deliberately does not implement a second World Model resolver or
Command Runtime. `SpatialRevitApplyParameters` is payload-only and must be
wrapped by the canonical Shell v6 `CommandEnvelope`.

Verification from the repository root:

```bash
/srv/v6/node_modules/.bin/tsc -p packages/spatial-core/tsconfig.json
node --test packages/spatial-core/test/*.test.ts
```
