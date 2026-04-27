/**
 * Standalone test runner for tenders-ingest. Run via:
 *   pnpm --filter @daria/tenders-ingest test
 */
import { runFilterTests } from './filter.test.ts'
import { runTorgiMapperTests } from './sources/torgi-mapper.test.ts'
import {
  runPipelineTests,
  runPipelineClassificationTests,
} from './pipeline.test.ts'

async function main(): Promise<void> {
  await runFilterTests()
  await runTorgiMapperTests()
  await runPipelineTests()
  await runPipelineClassificationTests()
  console.log('\nAll tenders-ingest tests passed.')
}

main().catch((err) => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
