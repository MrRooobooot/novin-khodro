/**
 * Novin Khodro — CSS Architecture & Rules Static Analyzer
 * Inspects CSS tokens, GPU animations, media queries (reduced-motion),
 * focus-visible rings, layout shift rules, and mobile bottom sheet styles.
 */

const fs = require('fs');
const path = require('path');

class CssAnalyzer {
  constructor(projectRoot = path.resolve(__dirname, '../..')) {
    this.projectRoot = projectRoot;
    this.cssFiles = {
      style: path.join(projectRoot, 'css/style.css'),
      installment: path.join(projectRoot, 'css/installment.css'),
      responsive: path.join(projectRoot, 'css/responsive.css'),
    };
    this.rawContent = {};
    this.combinedContent = '';
    this.loadFiles();
  }

  loadFiles() {
    for (const [key, filePath] of Object.entries(this.cssFiles)) {
      if (fs.existsSync(filePath)) {
        this.rawContent[key] = fs.readFileSync(filePath, 'utf8');
      } else {
        this.rawContent[key] = '';
      }
    }
    this.combinedContent = Object.values(this.rawContent).join('\n\n');
  }

  /**
   * Extract all CSS Custom Properties defined in :root or [data-theme]
   */
  getRootVariables() {
    const vars = {};
    const rootRegex = /(?::root|\[data-theme[^\]]*\])\s*\{([^}]+)\}/gi;
    let match;
    while ((match = rootRegex.exec(this.combinedContent)) !== null) {
      const declarations = match[1].split(';');
      for (const decl of declarations) {
        const [prop, val] = decl.split(':').map(s => s && s.trim());
        if (prop && prop.startsWith('--') && val) {
          vars[prop] = val;
        }
      }
    }
    return vars;
  }

  /**
   * Check if specific CSS custom properties are defined
   */
  hasRootVariable(varName) {
    const vars = this.getRootVariables();
    return Object.prototype.hasOwnProperty.call(vars, varName);
  }

  /**
   * Extract all selectors matching a pattern
   */
  findRulesMatching(selectorPattern) {
    const matches = [];
    // Clean comments first
    const cleaned = this.combinedContent.replace(/\/\*[\s\S]*?\*\//g, '');
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;

    const patterns = typeof selectorPattern === 'string'
      ? selectorPattern.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    while ((match = ruleRegex.exec(cleaned)) !== null) {
      const selectors = match[1].trim();
      const body = match[2].trim();
      if (patterns) {
        if (patterns.some(p => selectors.includes(p))) {
          matches.push({ selectors, body });
        }
      } else if (selectorPattern instanceof RegExp) {
        if (selectorPattern.test(selectors)) {
          matches.push({ selectors, body });
        }
      }
    }
    return matches;
  }

  /**
   * Check if prefers-reduced-motion media query is implemented
   */
  hasReducedMotionSupport() {
    const regex = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i;
    return regex.test(this.combinedContent);
  }

  /**
   * Check for universal :focus-visible rules
   */
  hasFocusVisibleRules() {
    const focusVisibleRegex = /:focus-visible\b/i;
    return focusVisibleRegex.test(this.combinedContent);
  }

  /**
   * Inspect transitions for GPU acceleration vs forbidden reflow properties
   */
  analyzeTransitions() {
    const cleaned = this.combinedContent.replace(/\/\*[\s\S]*?\*\//g, '');
    const transitionRegex = /transition(?:-property)?\s*:\s*([^;]+);/gi;
    let match;
    const allTransitions = [];
    const forbiddenReflowTransitions = [];

    while ((match = transitionRegex.exec(cleaned)) !== null) {
      const val = match[1].trim().toLowerCase();
      allTransitions.push(val);

      // Transitioning all, width, height, top, left, margin, padding causes layout thrashing
      if (
        val === 'all' ||
        /\ball\b/.test(val) ||
        /\b(?:width|height|top|left|right|bottom|margin|padding)\b/.test(val)
      ) {
        forbiddenReflowTransitions.push(val);
      }
    }

    return {
      total: allTransitions.length,
      transitions: allTransitions,
      forbiddenCount: forbiddenReflowTransitions.length,
      forbidden: forbiddenReflowTransitions,
      isGpuOptimized: forbiddenReflowTransitions.length === 0 && allTransitions.length > 0,
    };
  }

  /**
   * Check mobile bottom-sheet styling rules
   */
  getMobileSheetInfo() {
    const hasDvh = /dvh\b/i.test(this.combinedContent);
    const hasSafeArea = /safe-area-inset-bottom/i.test(this.combinedContent);
    const hasScrollbarGutter = /scrollbar-gutter\s*:\s*stable/i.test(this.combinedContent);
    const hasAspectRatio = /aspect-ratio\s*:/i.test(this.combinedContent);

    return {
      hasDvh,
      hasSafeArea,
      hasScrollbarGutter,
      hasAspectRatio,
    };
  }

  /**
   * Check for blocking @import in CSS
   */
  hasBlockingImports() {
    const importRegex = /@import\s+(?:url\()?['"][^'"]+['"]\)?;/gi;
    return importRegex.test(this.combinedContent);
  }
}

module.exports = CssAnalyzer;
