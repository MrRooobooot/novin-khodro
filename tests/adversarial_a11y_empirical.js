#!/usr/bin/env node

/**
 * Novin Khodro — Empirical Adversarial Accessibility & Interactive Bindings Test Suite
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

function runTest(suite, name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err) {
    failedTests.push({ suite, name, error: err });
    console.error(`  ✗ [${suite}] ${name}\n    Error: ${err.message}`);
  }
}

console.log('=====================================================================');
console.log('EMPIRICAL ADVERSARIAL ACCESSIBILITY & BINDINGS VERIFICATION SUITE');
console.log('Testing File:', indexPath);
console.log('=====================================================================\n');

// -------------------------------------------------------------------------
// SUITE 1: Interactive Controls Accessible Names & Labels
// -------------------------------------------------------------------------
console.log('Suite 1: Interactive Controls Accessible Names & Labels');

runTest('Interactive Controls', 'All <button> elements have computed accessible names', () => {
  const buttons = doc.querySelectorAll('button');
  assert.ok(buttons.length > 0, 'Document must contain buttons');
  
  buttons.forEach((btn, idx) => {
    const ariaLabel = btn.getAttribute('aria-label');
    const ariaLabelledby = btn.getAttribute('aria-labelledby');
    let labelledbyText = '';
    if (ariaLabelledby) {
      const labelEl = doc.getElementById(ariaLabelledby);
      if (labelEl) labelledbyText = labelEl.textContent.trim();
    }
    const innerText = btn.textContent.trim();
    const title = btn.getAttribute('title');
    const accessibleName = ariaLabel || labelledbyText || innerText || title;
    
    assert.ok(
      accessibleName && accessibleName.length > 0,
      `Button #${idx} (tag: ${btn.tagName}, class: "${btn.className}", id: "${btn.id}") lacks an accessible name!`
    );
  });
});

runTest('Interactive Controls', 'All anchor links (<a href>) have computed accessible names', () => {
  const links = doc.querySelectorAll('a[href]');
  assert.ok(links.length > 0, 'Document must contain links');
  
  links.forEach((a, idx) => {
    const ariaLabel = a.getAttribute('aria-label');
    const ariaLabelledby = a.getAttribute('aria-labelledby');
    let labelledbyText = '';
    if (ariaLabelledby) {
      const labelEl = doc.getElementById(ariaLabelledby);
      if (labelEl) labelledbyText = labelEl.textContent.trim();
    }
    const innerText = a.textContent.trim();
    const title = a.getAttribute('title');
    const accessibleName = ariaLabel || labelledbyText || innerText || title;
    
    assert.ok(
      accessibleName && accessibleName.length > 0,
      `Link #${idx} (href: "${a.getAttribute('href')}", class: "${a.className}", id: "${a.id}") lacks an accessible name!`
    );
  });
});

runTest('Interactive Controls', 'All <input> and <select> controls have associated labels or aria-label', () => {
  const controls = doc.querySelectorAll('input, select');
  assert.ok(controls.length > 0, 'Document must contain inputs/selects');
  
  controls.forEach((input, idx) => {
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (type === 'hidden') return;
    
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledby = input.getAttribute('aria-labelledby');
    const id = input.id;
    let explicitLabel = null;
    if (id) {
      explicitLabel = doc.querySelector(`label[for="${id}"]`);
    }
    const placeholder = input.getAttribute('placeholder');
    const title = input.getAttribute('title');
    
    const hasLabel = !!(ariaLabel || ariaLabelledby || (explicitLabel && explicitLabel.textContent.trim()) || placeholder || title);
    
    assert.ok(
      hasLabel,
      `Control #${idx} (tag: ${input.tagName}, type: "${type}", id: "${id}", class: "${input.className}") lacks an associated label or accessible name!`
    );
  });
});

runTest('Interactive Controls', 'All inline SVGs inside interactive buttons/links have aria-hidden="true" and focusable="false"', () => {
  const svgs = doc.querySelectorAll('button svg, a svg');
  assert.ok(svgs.length > 0, 'SVGs inside interactive elements must exist');
  
  svgs.forEach((svg, idx) => {
    const ariaHidden = svg.getAttribute('aria-hidden');
    const focusable = svg.getAttribute('focusable');
    assert.strictEqual(
      ariaHidden,
      'true',
      `SVG #${idx} inside interactive container lacks aria-hidden="true"! (Parent: ${svg.parentNode ? svg.parentNode.tagName : 'unknown'})`
    );
    assert.strictEqual(
      focusable,
      'false',
      `SVG #${idx} inside interactive container lacks focusable="false"! (Parent: ${svg.parentNode ? svg.parentNode.tagName : 'unknown'})`
    );
  });
});

runTest('Interactive Controls', 'All decorative SVGs across the document are hidden from assistive technology', () => {
  const allSvgs = doc.querySelectorAll('svg');
  assert.ok(allSvgs.length > 0, 'Document must contain SVGs');
  
  allSvgs.forEach((svg, idx) => {
    const directHidden = svg.getAttribute('aria-hidden') === 'true';
    const parentHidden = svg.parentNode && svg.parentNode.getAttribute('aria-hidden') === 'true';
    const isHidden = directHidden || parentHidden;
    const focusable = svg.getAttribute('focusable');
    
    assert.ok(
      isHidden,
      `SVG #${idx} is neither directly aria-hidden nor enclosed in an aria-hidden container!`
    );
    assert.strictEqual(
      focusable,
      'false',
      `SVG #${idx} lacks focusable="false" for cross-browser accessibility!`
    );
  });
});

// -------------------------------------------------------------------------
// SUITE 2: Modal ARIA Attributes & Structural Integrity
// -------------------------------------------------------------------------
console.log('\nSuite 2: Modal ARIA Attributes & Structural Integrity');

runTest('Modal ARIA', 'Modal overlay #carModal has role="dialog" and aria-modal="true"', () => {
  const modal = doc.getElementById('carModal');
  assert.ok(modal, 'Element #carModal must exist in DOM');
  assert.strictEqual(modal.getAttribute('role'), 'dialog', '#carModal must have role="dialog"');
  assert.strictEqual(modal.getAttribute('aria-modal'), 'true', '#carModal must have aria-modal="true"');
});

runTest('Modal ARIA', 'Modal overlay #carModal is initially aria-hidden="true" and has tabindex="-1"', () => {
  const modal = doc.getElementById('carModal');
  assert.ok(modal, 'Element #carModal must exist in DOM');
  assert.strictEqual(modal.getAttribute('aria-hidden'), 'true', '#carModal must be initially aria-hidden="true"');
  assert.strictEqual(modal.getAttribute('tabindex'), '-1', '#carModal must have tabindex="-1" for programmatic focus');
});

runTest('Modal ARIA', 'Modal aria-labelledby points to an existing non-empty DOM element (#modalTitle)', () => {
  const modal = doc.getElementById('carModal');
  assert.ok(modal, 'Element #carModal must exist');
  const labelledby = modal.getAttribute('aria-labelledby');
  assert.ok(labelledby, '#carModal must have aria-labelledby attribute');
  
  const titleEl = doc.getElementById(labelledby);
  assert.ok(titleEl, `#carModal aria-labelledby="${labelledby}" references a non-existent DOM element!`);
  assert.ok(titleEl.textContent.trim().length > 0, `#carModal title element #${labelledby} must not be empty`);
});

runTest('Modal ARIA', 'Modal close button #modalClose exists inside modal and has descriptive aria-label', () => {
  const modal = doc.getElementById('carModal');
  assert.ok(modal, '#carModal must exist');
  const closeBtn = doc.getElementById('modalClose');
  assert.ok(closeBtn, '#modalClose must exist');
  const ariaLabel = closeBtn.getAttribute('aria-label');
  assert.ok(ariaLabel && ariaLabel.trim().length > 0, '#modalClose must have a non-empty aria-label');
  assert.ok(ariaLabel.includes('بستن'), `#modalClose aria-label ("${ariaLabel}") must clearly indicate close action`);
});

runTest('Modal ARIA', 'Modal content container has role="document"', () => {
  const content = doc.querySelector('#carModal .modal-content');
  assert.ok(content, '.modal-content inside #carModal must exist');
  assert.strictEqual(content.getAttribute('role'), 'document', '.modal-content must have role="document"');
});

// -------------------------------------------------------------------------
// SUITE 3: Form Inputs, Labels & Error Descriptors
// -------------------------------------------------------------------------
console.log('\nSuite 3: Form Inputs, Labels & Error Descriptors');

runTest('Form A11y', 'Form #sellCarForm has novalidate and accessible heading association', () => {
  const form = doc.getElementById('sellCarForm');
  assert.ok(form, '#sellCarForm must exist');
  assert.ok(form.hasAttribute('novalidate'), '#sellCarForm must have novalidate attribute for custom JS validation');
  const labelledby = form.getAttribute('aria-labelledby');
  assert.ok(labelledby, '#sellCarForm must have aria-labelledby');
  const heading = doc.getElementById(labelledby);
  assert.ok(heading, `#sellCarForm aria-labelledby="${labelledby}" references non-existent heading!`);
  assert.ok(heading.textContent.trim().length > 0, 'Form heading must have text content');
});

runTest('Form A11y', 'Required form inputs have matching labels with for="..." and aria-required="true"', () => {
  const requiredInputs = ['sellCarModel', 'sellOwnerPhone'];
  
  requiredInputs.forEach(id => {
    const input = doc.getElementById(id);
    assert.ok(input, `Required input #${id} must exist`);
    assert.ok(input.hasAttribute('required'), `Input #${id} must have HTML5 required attribute`);
    assert.strictEqual(input.getAttribute('aria-required'), 'true', `Input #${id} must have aria-required="true"`);
    assert.strictEqual(input.getAttribute('aria-invalid'), 'false', `Input #${id} must initialize with aria-invalid="false"`);
    
    const label = doc.querySelector(`label[for="${id}"]`);
    assert.ok(label, `Input #${id} must have an explicit <label for="${id}">`);
    assert.ok(label.textContent.trim().length > 0, `Label for #${id} must have descriptive text`);
    
    const star = label.querySelector('.req-star');
    if (star) {
      assert.strictEqual(star.getAttribute('aria-hidden'), 'true', `Asterisk in label for #${id} must have aria-hidden="true"`);
    }
  });
});

runTest('Form A11y', 'All form input aria-describedby references resolve to existing DOM error or hint elements', () => {
  const inputs = doc.querySelectorAll('#sellCarForm input');
  assert.ok(inputs.length > 0, '#sellCarForm must contain inputs');
  
  inputs.forEach(input => {
    const describedBy = input.getAttribute('aria-describedby');
    if (describedBy) {
      const ids = describedBy.split(/\s+/).filter(Boolean);
      ids.forEach(refId => {
        const refEl = doc.getElementById(refId);
        assert.ok(refEl, `Input #${input.id} aria-describedby="${describedBy}" references non-existent element #${refId}!`);
        
        if (refId.toLowerCase().includes('error')) {
          assert.strictEqual(refEl.getAttribute('role'), 'alert', `Error element #${refId} must have role="alert"`);
          assert.strictEqual(refEl.getAttribute('aria-live'), 'assertive', `Error element #${refId} must have aria-live="assertive"`);
        }
      });
    }
  });
});

runTest('Form A11y', 'Form submit button has type="submit" and explicit accessible label', () => {
  const submitBtn = doc.getElementById('sellSubmitBtn');
  assert.ok(submitBtn, '#sellSubmitBtn must exist');
  assert.strictEqual(submitBtn.getAttribute('type'), 'submit', '#sellSubmitBtn must have type="submit"');
  assert.ok(submitBtn.hasAttribute('aria-label') || submitBtn.textContent.trim().length > 0, '#sellSubmitBtn must have an accessible label');
});

// -------------------------------------------------------------------------
// SUITE 4: Accordion Linkages & ARIA Symmetry
// -------------------------------------------------------------------------
console.log('\nSuite 4: Accordion Linkages & ARIA Symmetry');

runTest('Accordion Symmetry', 'All FAQ items have symmetric aria-controls <-> id and aria-labelledby <-> id linkages', () => {
  const faqItems = doc.querySelectorAll('.faq-item');
  assert.ok(faqItems.length >= 4, 'There must be at least 4 FAQ items');
  
  faqItems.forEach((item, idx) => {
    const btn = item.querySelector('.faq-question');
    const panel = item.querySelector('.faq-answer');
    
    assert.ok(btn, `FAQ item #${idx + 1} must contain a .faq-question button`);
    assert.ok(panel, `FAQ item #${idx + 1} must contain a .faq-answer panel`);
    
    const btnId = btn.id;
    const btnControls = btn.getAttribute('aria-controls');
    const btnExpanded = btn.getAttribute('aria-expanded');
    
    const panelId = panel.id;
    const panelRole = panel.getAttribute('role');
    const panelLabelledby = panel.getAttribute('aria-labelledby');
    
    // Check button properties
    assert.ok(btnId, `FAQ button #${idx + 1} must have a unique id`);
    assert.ok(btnControls, `FAQ button #${btnId} must have aria-controls`);
    assert.ok(btnExpanded === 'true' || btnExpanded === 'false', `FAQ button #${btnId} aria-expanded must be 'true' or 'false' (got '${btnExpanded}')`);
    
    // Check panel properties
    assert.ok(panelId, `FAQ panel #${idx + 1} must have a unique id`);
    assert.strictEqual(panelRole, 'region', `FAQ panel #${panelId} must have role="region"`);
    assert.ok(panelLabelledby, `FAQ panel #${panelId} must have aria-labelledby`);
    
    // Check bidirectional symmetry
    assert.strictEqual(
      btnControls,
      panelId,
      `FAQ button #${btnId} aria-controls="${btnControls}" does not match panel id="${panelId}"!`
    );
    assert.strictEqual(
      panelLabelledby,
      btnId,
      `FAQ panel #${panelId} aria-labelledby="${panelLabelledby}" does not match button id="${btnId}"!`
    );
  });
});

runTest('Accordion Symmetry', 'Default open FAQ item (#1) has aria-expanded="true" and class "open"', () => {
  const firstFaq = doc.querySelector('.faq-item');
  assert.ok(firstFaq, 'First FAQ item must exist');
  assert.ok(firstFaq.classList.contains('open'), 'First FAQ item should have class "open"');
  const btn = firstFaq.querySelector('.faq-question');
  assert.strictEqual(btn.getAttribute('aria-expanded'), 'true', 'Default open FAQ button must have aria-expanded="true"');
});

runTest('Accordion Symmetry', 'Collapsed FAQ items have aria-expanded="false" and lack class "open"', () => {
  const faqItems = doc.querySelectorAll('.faq-item');
  for (let i = 1; i < faqItems.length; i++) {
    const item = faqItems[i];
    const btn = item.querySelector('.faq-question');
    assert.strictEqual(btn.getAttribute('aria-expanded'), 'false', `Collapsed FAQ #${i + 1} must have aria-expanded="false"`);
  }
});

// -------------------------------------------------------------------------
// SUITE 5: Tablists, Sliders & Toggle Controls
// -------------------------------------------------------------------------
console.log('\nSuite 5: Tablists, Sliders & Toggle Controls');

runTest('Tablists & Sliders', 'Hero slider dots form an accessible tablist linked to slide items', () => {
  const tablist = doc.querySelector('.slider-dots[role="tablist"]');
  assert.ok(tablist, '.slider-dots must have role="tablist"');
  assert.ok(tablist.hasAttribute('aria-label'), '.slider-dots must have aria-label');
  
  const dots = tablist.querySelectorAll('.slider-dot');
  assert.strictEqual(dots.length, 4, 'Must have 4 slider dots');
  
  dots.forEach((dot, idx) => {
    assert.strictEqual(dot.getAttribute('role'), 'tab', `Slider dot #${idx + 1} must have role="tab"`);
    assert.ok(dot.id, `Slider dot #${idx + 1} must have an id`);
    assert.ok(dot.hasAttribute('aria-label'), `Slider dot #${idx + 1} must have aria-label`);
    
    const ariaSelected = dot.getAttribute('aria-selected');
    assert.ok(ariaSelected === 'true' || ariaSelected === 'false', `Slider dot #${idx + 1} aria-selected must be boolean string`);
    
    const controls = dot.getAttribute('aria-controls');
    assert.ok(controls, `Slider dot #${idx + 1} must have aria-controls`);
    const targetSlide = doc.getElementById(controls);
    assert.ok(targetSlide, `Slider dot #${dot.id} aria-controls="${controls}" references non-existent slide #${controls}!`);
  });
});

runTest('Tablists & Sliders', 'Category filter buttons form an accessible group linked to #carsGrid', () => {
  const tablist = doc.querySelector('.filter-categories-pills[role="group"]');
  assert.ok(tablist, '.filter-categories-pills must have role="group"');
  assert.ok(tablist.hasAttribute('aria-label'), '.filter-categories-pills must have aria-label');
  
  const pills = tablist.querySelectorAll('.cat-pill');
  assert.ok(pills.length >= 5, 'Must have at least 5 category filter pills');
  
  pills.forEach((pill, idx) => {
    assert.strictEqual(pill.tagName, 'BUTTON', `Category pill #${idx + 1} must be a native button`);
    assert.ok(pill.id, `Category pill #${idx + 1} must have an id`);
    
    const ariaSelected = pill.getAttribute('aria-pressed');
    assert.ok(ariaSelected === 'true' || ariaSelected === 'false', `Category pill #${idx + 1} aria-pressed must be boolean string`);
    
    const controls = pill.getAttribute('aria-controls');
    assert.strictEqual(controls, 'carsGrid', `Category button #${pill.id} aria-controls must be "carsGrid"`);
    const grid = doc.getElementById(controls);
    assert.ok(grid, `Category pill references non-existent #${controls}`);
  });
});

runTest('Calculator Sliders', 'Installment calculator sliders have full ARIA range attributes', () => {
  const sliders = [
    { id: 'calcPriceSlider', min: '300', max: '5000' },
    { id: 'downPaymentPercent', min: '40', max: '70' }
  ];
  
  sliders.forEach(cfg => {
    const slider = doc.getElementById(cfg.id);
    assert.ok(slider, `#${cfg.id} must exist`);
    assert.ok(slider.hasAttribute('aria-label'), `#${cfg.id} must have aria-label`);
    assert.strictEqual(slider.getAttribute('aria-valuemin'), cfg.min, `#${cfg.id} aria-valuemin must match min`);
    assert.strictEqual(slider.getAttribute('aria-valuemax'), cfg.max, `#${cfg.id} aria-valuemax must match max`);
    assert.ok(slider.hasAttribute('aria-valuenow'), `#${cfg.id} must have aria-valuenow`);
    assert.ok(slider.hasAttribute('aria-valuetext'), `#${cfg.id} must have aria-valuetext`);
  });
});

runTest('Calculator Presets', 'Calculator preset buttons and tenure buttons have role="group" and aria-pressed', () => {
  const groups = doc.querySelectorAll('.quick-preset-row, .tenure-buttons');
  assert.ok(groups.length >= 3, 'Must have at least 3 preset/tenure button groups');
  
  groups.forEach((group, idx) => {
    assert.strictEqual(group.getAttribute('role'), 'group', `Button group #${idx + 1} must have role="group"`);
    assert.ok(
      group.hasAttribute('aria-label') || group.hasAttribute('aria-labelledby'),
      `Button group #${idx + 1} must have aria-label or aria-labelledby`
    );
    
    const buttons = group.querySelectorAll('button');
    assert.ok(buttons.length >= 3, `Button group #${idx + 1} must have buttons`);
    buttons.forEach(btn => {
      const pressed = btn.getAttribute('aria-pressed');
      assert.ok(pressed === 'true' || pressed === 'false', `Button in group lacks valid aria-pressed (got "${pressed}")`);
    });
  });
});

// -------------------------------------------------------------------------
// SUITE 6: Document-Wide Reference Integrity & ID Uniqueness
// -------------------------------------------------------------------------
console.log('\nSuite 6: Document-Wide Reference Integrity & ID Uniqueness');

runTest('Reference Integrity', 'All IDs in index.html are globally unique (zero duplicates)', () => {
  const idRegex = /\sid=["']([^"']+)["']/g;
  let match;
  const seenIds = new Map();
  const duplicates = [];
  
  while ((match = idRegex.exec(htmlContent)) !== null) {
    const id = match[1];
    if (seenIds.has(id)) {
      duplicates.push(id);
    } else {
      seenIds.set(id, 1);
    }
  }
  
  assert.strictEqual(
    duplicates.length,
    0,
    `Found duplicate IDs in index.html: ${duplicates.join(', ')}`
  );
});

runTest('Reference Integrity', 'Every ARIA reference attribute (aria-labelledby, aria-describedby, aria-controls) resolves to an existing DOM ID', () => {
  const brokenReferences = [];
  
  // Test all elements in DOM
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(el => {
    const refAttrs = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-errormessage', 'for'];
    refAttrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val) {
        const targetIds = val.split(/\s+/).filter(Boolean);
        targetIds.forEach(targetId => {
          const targetNode = doc.getElementById(targetId);
          if (!targetNode) {
            brokenReferences.push({
              sourceTag: el.tagName,
              sourceId: el.id || 'none',
              sourceClass: el.className || 'none',
              attribute: attr,
              targetId: targetId
            });
          }
        });
      }
    });
  });
  
  assert.strictEqual(
    brokenReferences.length,
    0,
    `Found broken ARIA references:\n${brokenReferences.map(b => `  - <${b.sourceTag} id="${b.sourceId}" class="${b.sourceClass}"> ${b.attribute}="${b.targetId}" (Element #${b.targetId} NOT FOUND)`).join('\n')}`
  );
});

runTest('Reference Integrity', 'Live regions #catalogStatus and #toastContainer exist in static HTML', () => {
  const catalogStatus = doc.getElementById('catalogStatus');
  assert.ok(catalogStatus, '#catalogStatus live region must exist');
  assert.strictEqual(catalogStatus.getAttribute('role'), 'status');
  assert.strictEqual(catalogStatus.getAttribute('aria-live'), 'polite');
  
  const toastContainer = doc.getElementById('toastContainer');
  assert.ok(toastContainer, '#toastContainer live region must exist');
  assert.strictEqual(toastContainer.getAttribute('role'), 'status');
  assert.strictEqual(toastContainer.getAttribute('aria-live'), 'polite');
});

runTest('Reference Integrity', 'Skip link is the first focusable interactive element in body', () => {
  const firstInteractive = doc.querySelector('a, button, input, select, textarea');
  assert.ok(firstInteractive, 'First interactive element must exist');
  assert.strictEqual(firstInteractive.getAttribute('href'), '#main-content', 'First interactive element must be Skip Link to #main-content');
  assert.ok(firstInteractive.classList.contains('skip-link'), 'Skip link must have class "skip-link"');
  const main = doc.getElementById('main-content');
  assert.ok(main, 'Skip link target #main-content must exist in DOM');
});

// -------------------------------------------------------------------------
// Summary Output
// -------------------------------------------------------------------------
console.log('\n=====================================================================');
console.log(`TEST RESULTS SUMMARY:`);
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
