#!/usr/bin/env node
import {runPrBot} from '../../../scripts/pr-bot.mjs'
try {process.exitCode=await runPrBot(process.argv.slice(2))}
catch(error) {console.error(error.message);process.exitCode=2}
