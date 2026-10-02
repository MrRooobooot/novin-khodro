#!/usr/bin/env node

/**
 * Novin Khodro — Master E2E & Specification Test Runner
 *
 * Usage:
 *   node tests/run_tests.js             # Run all test suites (Tiers 1-4)
 *   node tests/run_tests.js --tier1     # Run only Tier 1 Feature Coverage
 *   node tests/run_tests.js --tier2     # Run only Tier 2 Boundaries
 *   node tests/run_tests.js --tier3     # Run only Tier 3 Combinations
 *   node tests/run_tests.js --tier4     # Run only Tier 4 Workflows
 *   node tests/run_tests.js --json      # Output structured JSON summary
 */

const path = require('path');
const { defaultHarness, colors } = require('./helpers/test_runner.js');

async function main() {
  const args = process.argv.slice(2);
  const isJson = args.includes('--json');
  const specificTier = args.some(a => ['--tier0', '-0', '--tier1', '-1', '--tier2', '-2', '--tier3', '-3', '--tier4', '-4'].includes(a));
  const runTier0 = !specificTier || args.includes('--tier0') || args.includes('-0');
  const runTier1 = !specificTier || args.includes('--tier1') || args.includes('-1');
  const runTier2 = !specificTier || args.includes('--tier2') || args.includes('-2');
  const runTier3 = !specificTier || args.includes('--tier3') || args.includes('-3');
  const runTier4 = !specificTier || args.includes('--tier4') || args.includes('-4');

  // Load selected test suites
  if (runTier0) {
    require('./tier0_domain_units.test.js');
  }
  if (runTier1) {
    require('./tier1_feature_coverage.test.js');
  }
  if (runTier2) {
    require('./tier2_boundaries.test.js');
  }
  if (runTier3) {
    require('./tier3_combinations.test.js');
  }
  if (runTier4) {
    require('./tier4_workflows.test.js');
  }
  if (!specificTier || args.includes('--tier5') || args.includes('-5')) {
    require('./tier5_ikco_profile.test.js');
  }
  if (!specificTier || args.includes('--tier6') || args.includes('-6')) {
    require('./tier6_zero_prices.test.js');
  }
  if (!specificTier || args.includes('--tier7') || args.includes('-7')) {
    require('./tier7_perf_responsive.test.js');
  }

  const results = await defaultHarness.run();

  if (isJson) {
    console.log(JSON.stringify({
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      durationMs: results.duration,
      exitCode: results.exitCode,
      failures: results.failures.map(f => ({
        suite: f.suiteName,
        test: f.testName,
        message: f.error.message || String(f.error),
      })),
    }, null, 2));
  }

  process.exit(results.exitCode);
}

main().catch(err => {
  console.error(`${colors.red}Fatal Runner Error:${colors.reset}`, err);
  process.exit(1);
});
