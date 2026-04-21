#!/usr/bin/env -S node --experimental-strip-types
import { main } from "../../clicore2messenger/src/cli.ts";
await main(process.argv);
