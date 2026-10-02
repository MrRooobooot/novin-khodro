/**
 * Novin Khodro — Zero-Dependency Test Runner Harness
 * Pure Node.js test runner supporting synchronous and asynchronous tests,
 * nested describe suites, lifecycle hooks, structured colored output, and exit codes.
 */

const assert = require('assert');

// ANSI Color Codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class TestHarness {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];
    this.startTime = 0;
  }

  describe(name, fn) {
    const parentSuite = this.currentSuite;
    const suite = {
      name,
      parent: parentSuite,
      tests: [],
      beforeAllHooks: [],
      afterAllHooks: [],
      beforeEachHooks: [],
      afterEachHooks: [],
    };

    if (parentSuite) {
      parentSuite.suites = parentSuite.suites || [];
      parentSuite.suites.push(suite);
    } else {
      this.suites.push(suite);
    }

    this.currentSuite = suite;
    try {
      fn();
    } catch (err) {
      console.error(`${colors.red}Error executing describe block "${name}":${colors.reset}`, err);
    } finally {
      this.currentSuite = parentSuite;
    }
  }

  beforeAll(fn) {
    if (this.currentSuite) this.currentSuite.beforeAllHooks.push(fn);
  }

  afterAll(fn) {
    if (this.currentSuite) this.currentSuite.afterAllHooks.push(fn);
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachHooks.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachHooks.push(fn);
  }

  test(name, fn) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => this.test(name, fn));
      return;
    }
    this.currentSuite.tests.push({ name, fn, skipped: false });
    this.totalTests++;
  }

  skip(name, fn) {
    if (!this.currentSuite) return;
    this.currentSuite.tests.push({ name, fn, skipped: true });
    this.totalTests++;
    this.skippedTests++;
  }

  async runSuite(suite, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}${colors.bright}${colors.cyan}▶ ${suite.name}${colors.reset}`);

    // Run beforeAll hooks
    for (const hook of suite.beforeAllHooks) {
      await hook();
    }

    // Run tests in current suite
    for (const t of suite.tests) {
      if (t.skipped) {
        this.skippedTests++;
        console.log(`${indent}  ${colors.yellow}○ [SKIP] ${t.name}${colors.reset}`);
        continue;
      }

      const testIndent = `${indent}  `;
      const startTime = Date.now();

      // Collect all beforeEach hooks from root to current suite
      const beforeEachHooks = this.collectHooks(suite, 'beforeEachHooks');
      const afterEachHooks = this.collectHooks(suite, 'afterEachHooks');

      try {
        for (const hook of beforeEachHooks) {
          await hook();
        }

        await t.fn();

        for (const hook of afterEachHooks) {
          await hook();
        }

        const duration = Date.now() - startTime;
        this.passedTests++;
        console.log(`${testIndent}${colors.green}✓${colors.reset} ${colors.gray}${t.name}${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
      } catch (err) {
        const duration = Date.now() - startTime;
        this.failedTests++;
        const failureRecord = {
          suiteName: suite.name,
          testName: t.name,
          error: err,
          duration,
        };
        this.failures.push(failureRecord);
        console.log(`${testIndent}${colors.red}✗ ${t.name}${colors.reset} ${colors.dim}(${duration}ms)${colors.reset}`);
        console.log(`${testIndent}  ${colors.red}${err.message || err}${colors.reset}`);
        if (err.expected !== undefined && err.actual !== undefined) {
          console.log(`${testIndent}  ${colors.yellow}Expected: ${JSON.stringify(err.expected)}${colors.reset}`);
          console.log(`${testIndent}  ${colors.yellow}Actual:   ${JSON.stringify(err.actual)}${colors.reset}`);
        }
      }
    }

    // Run child suites
    if (suite.suites) {
      for (const childSuite of suite.suites) {
        await this.runSuite(childSuite, depth + 1);
      }
    }

    // Run afterAll hooks
    for (const hook of suite.afterAllHooks) {
      await hook();
    }
  }

  collectHooks(suite, hookName) {
    const hooks = [];
    let curr = suite;
    while (curr) {
      if (curr[hookName]) {
        hooks.unshift(...curr[hookName]);
      }
      curr = curr.parent;
    }
    return hooks;
  }

  async run() {
    this.startTime = Date.now();
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];

    console.log(`\n${colors.bright}${colors.blue}═════════════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}   Novin Khodro Automated E2E & Specification Test Suite Runner     ${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═════════════════════════════════════════════════════════════════════${colors.reset}\n`);

    for (const suite of this.suites) {
      await this.runSuite(suite, 0);
    }

    const totalDuration = Date.now() - this.startTime;
    console.log(`\n${colors.bright}─────────────────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`${colors.bright}Test Execution Summary:${colors.reset}`);
    console.log(`  Total Tests:    ${colors.bright}${this.totalTests}${colors.reset}`);
    console.log(`  Passed:         ${colors.green}${this.passedTests} ✓${colors.reset}`);
    console.log(`  Failed:         ${this.failedTests > 0 ? colors.red : colors.green}${this.failedTests} ✗${colors.reset}`);
    console.log(`  Skipped:        ${this.skippedTests > 0 ? colors.yellow : colors.gray}${this.skippedTests} ○${colors.reset}`);
    console.log(`  Total Duration: ${colors.cyan}${totalDuration}ms${colors.reset}`);
    console.log(`${colors.bright}─────────────────────────────────────────────────────────────────────${colors.reset}\n`);

    if (this.failures.length > 0) {
      console.log(`${colors.bright}${colors.red}Failures Summary (${this.failures.length}):${colors.reset}`);
      this.failures.forEach((f, idx) => {
        console.log(`\n${idx + 1}) [${f.suiteName}] > ${f.testName}`);
        console.log(`${colors.red}${f.error.stack || f.error.message || f.error}${colors.reset}`);
      });
      console.log('');
    }

    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      skipped: this.skippedTests,
      duration: totalDuration,
      failures: this.failures,
      exitCode: this.failedTests > 0 ? 1 : 0,
    };
  }

  reset() {
    this.suites = [];
    this.currentSuite = null;
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.skippedTests = 0;
    this.failures = [];
  }
}

// Singleton global harness for clean modular import
const defaultHarness = new TestHarness();

module.exports = {
  TestHarness,
  defaultHarness,
  describe: defaultHarness.describe.bind(defaultHarness),
  it: defaultHarness.test.bind(defaultHarness),
  test: defaultHarness.test.bind(defaultHarness),
  skip: defaultHarness.skip.bind(defaultHarness),
  beforeAll: defaultHarness.beforeAll.bind(defaultHarness),
  afterAll: defaultHarness.afterAll.bind(defaultHarness),
  beforeEach: defaultHarness.beforeEach.bind(defaultHarness),
  afterEach: defaultHarness.afterEach.bind(defaultHarness),
  assert,
  colors,
};
