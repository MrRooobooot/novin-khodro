#!/usr/bin/env node

/**
 * Novin Khodro — Adversarial Stress & Strict Compliance Test Suite
 * Executed by: teamwork_preview_challenger_m1_2
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { DOMSimulator } = require('./helpers/dom_simulator.js');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const htmlContent = fs.readFileSync(indexPath, 'utf8');

const domSim = new DOMSimulator(rootDir);
const doc = domSim.createDocument();

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function runTest(category, name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [${category}] ${name}`);
  } catch (err) {
    failedTests.push({ category, name, error: err });
    console.error(`  ✗ [${category}] ${name}\n    Error: ${err.message}`);
  }
}

console.log('=====================================================================');
console.log('ADVERSARIAL STRESS & STRICT SPECIFICATION CONFORMANCE TEST SUITE');
console.log('Testing File:', indexPath);
console.log('=====================================================================\n');

// -------------------------------------------------------------------------
// SUITE 1: Advanced Heading & Landmark Outline
// -------------------------------------------------------------------------
console.log('Suite 1: Advanced Heading & Landmark Outline');

runTest('Landmarks', 'Document has exactly one <main>, one <header role="banner">, and one <footer role="contentinfo">', () => {
  const mains = doc.querySelectorAll('main');
  assert.strictEqual(mains.length, 1, 'Document must have exactly 1 <main> element');
  assert.strictEqual(mains[0].id, 'main-content', '<main> element must have id="main-content"');
  
  const headers = doc.querySelectorAll('header[role="banner"]');
  assert.strictEqual(headers.length, 1, 'Document must have exactly 1 header with role="banner"');
  
  const footers = doc.querySelectorAll('footer[role="contentinfo"]');
  assert.strictEqual(footers.length, 1, 'Document must have exactly 1 footer with role="contentinfo"');
});

runTest('Headings', 'Headings follow strict hierarchy without skipping levels (H1 -> H2 -> H3 -> H4)', () => {
  const h1s = doc.querySelectorAll('h1');
  assert.strictEqual(h1s.length, 1, 'Document must have exactly 1 H1 heading');
  assert.ok(h1s[0].textContent.includes('نوین خودرو'), 'H1 heading must contain brand name');
  
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  assert.ok(headings.length >= 8, 'Document must have multiple structured headings');
  
  let maxLevelSeen = 1;
  headings.forEach(h => {
    const level = parseInt(h.tagName.substring(1), 10);
    assert.ok(level <= maxLevelSeen + 1, `Heading level skipped: H${level} appeared after H${maxLevelSeen}`);
    maxLevelSeen = Math.max(maxLevelSeen, level);
  });
});

// -------------------------------------------------------------------------
// SUITE 2: Interactive Nesting & Tabindex Integrity
// -------------------------------------------------------------------------
console.log('\nSuite 2: Interactive Nesting & Tabindex Integrity');

runTest('Nesting', 'No interactive elements are nested within other interactive elements (no <a> in <button> or <button> in <a>)', () => {
  const interactiveContainers = doc.querySelectorAll('a, button');
  interactiveContainers.forEach(container => {
    const nestedInteractive = container.querySelectorAll('a, button, input, select, textarea');
    assert.strictEqual(
      nestedInteractive.length,
      0,
      `Illegal interactive nesting found in <${container.tagName} class="${container.className}"> containing <${nestedInteractive[0] ? nestedInteractive[0].tagName : ''}>`
    );
  });
});

runTest('Tabindex', 'No positive tabindex values exist (only tabindex="0" or tabindex="-1" allowed)', () => {
  const tabindexRegex = /\stabindex=["']([^"']+)["']/g;
  let match;
  while ((match = tabindexRegex.exec(htmlContent)) !== null) {
    const val = parseInt(match[1], 10);
    assert.ok(
      val <= 0,
      `Illegal positive tabindex="${match[1]}" found! Positive tabindex disrupts natural tab order (WCAG 2.4.3).`
    );
  }
});

// -------------------------------------------------------------------------
// SUITE 3: Media & Link Safety
// -------------------------------------------------------------------------
console.log('\nSuite 3: Media & Link Safety');

runTest('Media Assets', 'All <img> tags have non-empty alt, explicit width & height, decoding="async", and onerror handlers', () => {
  const images = doc.querySelectorAll('img');
  assert.ok(images.length >= 4, 'Must have at least 4 hero images');
  
  images.forEach((img, idx) => {
    const alt = img.getAttribute('alt');
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const decoding = img.getAttribute('decoding');
    const onerror = img.getAttribute('onerror');
    
    assert.ok(alt && alt.trim().length > 0, `Image #${idx + 1} lacks non-empty alt attribute`);
    assert.ok(width && parseInt(width, 10) > 0, `Image #${idx + 1} lacks explicit numeric width attribute`);
    assert.ok(height && parseInt(height, 10) > 0, `Image #${idx + 1} lacks explicit numeric height attribute`);
    assert.strictEqual(decoding, 'async', `Image #${idx + 1} should have decoding="async"`);
    assert.ok(onerror && onerror.includes('data:image/svg+xml'), `Image #${idx + 1} lacks SVG fallback in onerror attribute`);
  });
});

runTest('Link Safety', 'All external links (target="_blank") have rel="noopener" for security and tab-nabbing defense', () => {
  const blankLinks = doc.querySelectorAll('a[target="_blank"]');
  assert.ok(blankLinks.length >= 3, 'Must have target="_blank" links');
  
  blankLinks.forEach((link, idx) => {
    const rel = (link.getAttribute('rel') || '').toLowerCase();
    assert.ok(
      rel.includes('noopener'),
      `External link #${idx + 1} (href: "${link.getAttribute('href')}") lacks rel="noopener"!`
    );
  });
});

// -------------------------------------------------------------------------
// SUITE 4: Touch Targets & Typography
// -------------------------------------------------------------------------
console.log('\nSuite 4: Touch Targets & Typography');

runTest('Meta Settings', 'Viewport meta allows user scaling and does not disable zoom (no user-scalable=no)', () => {
  const viewportMeta = doc.querySelector('meta[name="viewport"]');
  assert.ok(viewportMeta, 'Viewport meta must exist');
  const content = viewportMeta.getAttribute('content') || '';
  assert.ok(content.includes('width=device-width'), 'Viewport must specify width=device-width');
  assert.ok(!content.includes('user-scalable=no'), 'Viewport must NOT disable user scaling (WCAG 1.4.4)');
  assert.ok(!content.includes('maximum-scale=1'), 'Viewport must NOT restrict maximum-scale to 1');
});

runTest('Font Preloading', 'Head contains preconnect hints to fonts.googleapis.com and fonts.gstatic.com with crossorigin', () => {
  const preconnects = doc.querySelectorAll('link[rel="preconnect"]');
  assert.ok(preconnects.length >= 2, 'Must have at least 2 preconnect link tags');
  
  const googleFonts = Array.from(preconnects).some(l => (l.getAttribute('href') || '').includes('fonts.googleapis.com'));
  const gstatic = Array.from(preconnects).some(l => (l.getAttribute('href') || '').includes('fonts.gstatic.com') && l.hasAttribute('crossorigin'));
  
  assert.ok(googleFonts, 'Must preconnect to fonts.googleapis.com');
  assert.ok(gstatic, 'Must preconnect to fonts.gstatic.com with crossorigin');
});

// -------------------------------------------------------------------------
// Summary Output
// -------------------------------------------------------------------------
console.log('\n=====================================================================');
console.log(`STRESS & CONFORMANCE TEST RESULTS:`);
console.log(`  Total Executed: ${totalTests}`);
console.log(`  Passed:         ${passedTests} ✓`);
console.log(`  Failed:         ${failedTests.length} ✗`);
console.log(`  Verdict:        ${failedTests.length === 0 ? 'APPROVE' : 'FAIL'}`);
console.log('=====================================================================');

if (failedTests.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
