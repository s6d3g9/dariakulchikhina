#!/bin/bash
set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== E2E Test: Messenger CLI Dispatcher ===${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INGEST_PORT=5555
INGEST_TOKEN="test-ingest-token"
FIXTURE_FILE="${FIXTURE_FILE:-$SCRIPT_DIR/fixtures/simple-run.ndjson}"

# Generate test IDs
RUN_ID=$(node -e "console.log(require('crypto').randomUUID())")
AGENT_ID=$(node -e "console.log(require('crypto').randomUUID())")

echo -e "${YELLOW}Generated test IDs:${NC}"
echo "  Run ID: $RUN_ID"
echo "  Agent ID: $AGENT_ID"

# Run the test harness
cd "$SCRIPT_DIR"
export INGEST_PORT=$INGEST_PORT
export INGEST_TOKEN=$INGEST_TOKEN
export RUN_ID=$RUN_ID
export AGENT_ID=$AGENT_ID
export FIXTURE_FILE=$FIXTURE_FILE

node --experimental-strip-types test-runner.mjs || exit 1

echo -e "\n${GREEN}✓ E2E test completed successfully${NC}"
