import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { claudeAdapter } from "../claude.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface GoldenCase {
  input: string;
  expected: unknown[];
}

const golden: GoldenCase[] = JSON.parse(
  readFileSync(join(__dirname, "claude.golden.json"), "utf8")
);

for (const [i, { input, expected }] of golden.entries()) {
  test(`golden case ${i + 1}: ${input.slice(0, 60)}...`, () => {
    const state = { finalText: "", tokensIn: 0, tokensOut: 0, costUsd: 0 };
    const ctx = { runId: "r1", state };
    const result = claudeAdapter.parseLine(input, ctx);
    assert.deepEqual(result, expected);
  });
}
