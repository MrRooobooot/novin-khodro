/**
 * Novin Khodro — Zero-Dependency Headless DOM & Sandboxed Runtime Simulator
 * Parses HTML, builds a queryable DOM tree, supports event bubbling/delegation,
 * and executes client scripts in a sandboxed Node.js VM context.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

/**
 * Lightweight DOM Element Simulation
 */
class DOMElement {
  constructor(tagName, attributes = {}, parentNode = null) {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.attributes = { ...attributes };
    this.parentNode = parentNode;
    this.children = [];
    this._textContent = '';
    this._innerHTML = '';
    this.eventListeners = {};
    this.style = {};
    this._value = attributes.value !== undefined ? String(attributes.value) : '';
    this._initialValue = this._value;

    this.classList = {
      _classes: new Set(
        (attributes.class || '')
          .split(/\s+/)
          .filter(Boolean)
      ),
      add: (...classes) => {
        classes.forEach(c => this.classList._classes.add(c));
        this.attributes.class = Array.from(this.classList._classes).join(' ');
      },
      remove: (...classes) => {
        classes.forEach(c => this.classList._classes.delete(c));
        this.attributes.class = Array.from(this.classList._classes).join(' ');
      },
      toggle: (className, force) => {
        if (force === true) {
          this.classList.add(className);
          return true;
        } else if (force === false) {
          this.classList.remove(className);
          return false;
        }
        if (this.classList._classes.has(className)) {
          this.classList.remove(className);
          return false;
        } else {
          this.classList.add(className);
          return true;
        }
      },
      contains: (className) => this.classList._classes.has(className),
      toString: () => Array.from(this.classList._classes).join(' '),
    };
  }

  get className() {
    return Array.from(this.classList._classes).join(' ');
  }

  set className(val) {
    this.classList._classes = new Set((val || '').split(/\s+/).filter(Boolean));
    this.attributes.class = val || '';
  }

  get id() {
    return this.attributes.id || '';
  }

  set id(val) {
    this.attributes.id = String(val || '');
  }

  get href() {
    return this.attributes.href || '';
  }

  set href(val) {
    this.attributes.href = String(val || '');
  }

  get src() {
    return this.attributes.src || '';
  }

  set src(val) {
    this.attributes.src = String(val || '');
  }

  get alt() {
    return this.attributes.alt || '';
  }

  set alt(val) {
    this.attributes.alt = String(val || '');
  }

  get type() {
    return this.attributes.type || '';
  }

  set type(val) {
    this.attributes.type = String(val || '');
  }

  get disabled() {
    return this.attributes.disabled !== undefined && this.attributes.disabled !== false;
  }

  set disabled(val) {
    if (val) {
      this.attributes.disabled = '';
    } else {
      delete this.attributes.disabled;
    }
  }

  get value() {
    return this._value !== undefined ? this._value : (this._initialValue || '');
  }

  set value(val) {
    this._value = val !== undefined && val !== null ? String(val) : '';
  }

  get textContent() {
    if (this.children.length === 0) {
      return this._textContent || '';
    }
    return this.children.map(c => c.textContent).join(' ').trim();
  }

  set textContent(text) {
    this.children = [];
    this._textContent = text || '';
    this._innerHTML = escapeHtml(this._textContent);
  }

  get innerHTML() {
    if (this.children.length > 0) {
      return this.children.map(c => c.outerHTML).join('');
    }
    return this._innerHTML || escapeHtml(this._textContent || '');
  }

  set innerHTML(htmlString) {
    this._innerHTML = htmlString || '';
    this._textContent = stripHtml(this._innerHTML);
    try {
      this.children = [];
      const nodes = parseHtmlToNodes(htmlString, this);
      this.children = nodes;
    } catch {
      this.children = [];
    }
  }

  get outerHTML() {
    const isVoid = ['img', 'input', 'br', 'hr', 'link', 'meta', 'source'].includes(this.tagName.toLowerCase());
    const attrEntries = Object.entries(this.attributes);
    const attrStr = attrEntries.length > 0 ? ' ' + attrEntries.map(([k, v]) => `${k}="${escapeAttr(v)}"`).join(' ') : '';

    if (isVoid) {
      return `<${this.tagName.toLowerCase()}${attrStr}>`;
    }
    const inner = this.children.length > 0 ? this.children.map(c => c.outerHTML).join('') : (this._innerHTML || escapeHtml(this._textContent || ''));
    return `<${this.tagName.toLowerCase()}${attrStr}>${inner}</${this.tagName.toLowerCase()}>`;
  }

  contains(node) {
    for (let current = node; current; current = current.parentNode) {
      if (current === this) return true;
    }
    return false;
  }

  getAttribute(name) {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  setAttribute(name, value) {
    const strVal = String(value !== undefined && value !== null ? value : '');
    this.attributes[name] = strVal;
    if (name === 'class') {
      this.classList._classes = new Set(strVal.split(/\s+/).filter(Boolean));
    } else if (name === 'value') {
      this._value = strVal;
    }
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name === 'class') {
      this.classList._classes.clear();
    } else if (name === 'value') {
      this._value = '';
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(type, listener) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    if (!this.eventListeners[type]) return;
    this.eventListeners[type] = this.eventListeners[type].filter(l => l !== listener);
  }

  get ownerDocument() {
    let curr = this;
    while (curr) {
      if (curr._ownerDocument) return curr._ownerDocument;
      if (curr._ownerDoc) return curr._ownerDoc;
      curr = curr.parentNode;
    }
    return null;
  }

  get sandboxContext() {
    let curr = this;
    while (curr) {
      if (curr._sandboxContext) return curr._sandboxContext;
      if (curr._sbContext) return curr._sbContext;
      if (curr.ownerDocument && curr.ownerDocument.defaultView) return curr.ownerDocument.defaultView;
      curr = curr.parentNode;
    }
    return null;
  }

  dispatchEvent(event) {
    event.target = event.target || this;
    event.currentTarget = this;

    // 1. Check inline on<type> attribute (e.g. onclick="openCarModal(1)")
    const inlineAttr = this.getAttribute(`on${event.type}`);
    if (inlineAttr) {
      const ctx = this.sandboxContext || (this.ownerDocument && this.ownerDocument._sandboxContext);
      if (ctx) {
        try {
          vm.runInContext(inlineAttr, ctx);
        } catch {
          // fallback
        }
      } else {
        try {
          const doc = this.ownerDocument;
          const win = doc ? doc.defaultView : globalThis;
          const fn = new Function('event', `with(this) { ${inlineAttr} }`);
          fn.call(win, event);
        } catch {
          // ignore
        }
      }
    }

    // 2. Dispatch registered event listeners
    const listeners = this.eventListeners[event.type] || [];
    for (const l of listeners) {
      try {
        l.call(this, event);
      } catch (err) {
        console.error(`Error in event listener for ${event.type}:`, err);
      }
    }

    // 3. Bubbling
    if (event.bubbles && this.parentNode && typeof this.parentNode.dispatchEvent === 'function') {
      this.parentNode.dispatchEvent(event);
    }
    return !event.defaultPrevented;
  }

  click() {
    const event = new DOMEvent('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(event);
  }

  focus() {
    this._isFocused = true;
    if (this._ownerDocument) {
      this._ownerDocument.activeElement = this;
    }
  }

  blur() {
    this._isFocused = false;
    if (this._ownerDocument && this._ownerDocument.activeElement === this) {
      this._ownerDocument.activeElement = null;
    }
  }

  reset() {
    if (this.tagName === 'FORM') {
      const inputs = this.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.value = input._initialValue || '';
      });
    }
  }

  getElementById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.getElementById ? child.getElementById(id) : null;
      if (found) return found;
    }
    return null;
  }

  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const matchFn = createSelectorMatcher(selector);

    const traverse = (node) => {
      if (matchFn(node)) {
        results.push(node);
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const child of this.children) {
      traverse(child);
    }
    return results;
  }

  getElementsByTagName(tagName) {
    const upper = tagName.toUpperCase();
    return this.querySelectorAll(upper === '*' ? '*' : upper.toLowerCase());
  }

  getElementsByClassName(className) {
    return this.querySelectorAll(`.${className}`);
  }

  closest(selector) {
    let curr = this;
    const matchFn = createSelectorMatcher(selector);
    while (curr && curr.nodeType === 1) {
      if (matchFn(curr)) return curr;
      curr = curr.parentNode;
    }
    return null;
  }
}

class DOMEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles !== undefined ? options.bubbles : true;
    this.cancelable = options.cancelable !== undefined ? options.cancelable : true;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.key = options.key || '';
    this.code = options.code || '';
    this.clientX = options.clientX || 0;
    this.clientY = options.clientY || 0;
  }

  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  stopPropagation() {
    this.bubbles = false;
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(text) {
  if (text === undefined || text === null) return '';
  return String(text).replace(/"/g, '&quot;');
}

function stripHtml(html) {
  return String(html).replace(/<[^>]+>/g, '').trim();
}

/**
 * Robust CSS Selector Matcher
 * Supports: #id, .class, tag, tag.class, [attr], [attr="val"], [attr*="val"], [attr^="val"], [attr$="val"],
 * compound selectors like ".cat-pill[data-category='chinese']", descendant selectors ("header nav a"),
 * and comma-separated lists.
 */
function createSelectorMatcher(selector) {
  const sel = selector.trim();
  if (!sel) return () => false;

  // Comma-separated selectors: "a, button, input"
  if (sel.includes(',')) {
    const subMatchers = sel.split(',').map(s => createSelectorMatcher(s.trim()));
    return (node) => subMatchers.some(m => m(node));
  }

  // Descendant selector (e.g. ".card img" or "header .logo")
  // Note: Ignore spaces inside attribute brackets [attr="foo bar"]
  const parts = [];
  let inBracket = false;
  let currentToken = '';

  for (let i = 0; i < sel.length; i++) {
    const char = sel[i];
    if (char === '[') inBracket = true;
    if (char === ']') inBracket = false;

    if (/\s/.test(char) && !inBracket) {
      if (currentToken.trim()) {
        parts.push(currentToken.trim());
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken.trim()) parts.push(currentToken.trim());

  if (parts.length > 1) {
    return (node) => {
      const lastPartMatcher = parseCompoundSelector(parts[parts.length - 1]);
      if (!lastPartMatcher(node)) return false;

      let curr = node.parentNode;
      let partIdx = parts.length - 2;

      while (curr && partIdx >= 0) {
        const partMatcher = parseCompoundSelector(parts[partIdx]);
        if (partMatcher(curr)) {
          partIdx--;
        }
        curr = curr.parentNode;
      }
      return partIdx < 0;
    };
  }

  return parseCompoundSelector(sel);
}

function parseCompoundSelector(compound) {
  if (compound === '*') return () => true;

  // Regex to extract tag, classes, IDs, attributes, pseudo
  const tagMatch = compound.match(/^([a-zA-Z0-9\-]+)/);
  const tag = tagMatch ? tagMatch[1].toUpperCase() : null;

  const idMatches = Array.from(compound.matchAll(/#([a-zA-Z0-9\-_]+)/g)).map(m => m[1]);
  const classMatches = Array.from(compound.matchAll(/\.([a-zA-Z0-9\-_]+)/g)).map(m => m[1]);

  const attrMatches = [];
  const attrRegex = /\[([a-zA-Z0-9\-_]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/g;
  let aMatch;
  while ((aMatch = attrRegex.exec(compound)) !== null) {
    const attrName = aMatch[1];
    const operator = aMatch[2] || '';
    const val = aMatch[3] !== undefined ? aMatch[3] : (aMatch[4] !== undefined ? aMatch[4] : (aMatch[5] !== undefined ? aMatch[5] : ''));
    attrMatches.push({ name: attrName, operator, val });
  }

  return (node) => {
    if (!node || node.nodeType !== 1) return false;

    // Check tag
    if (tag && node.tagName !== tag) return false;

    // Check IDs
    for (const id of idMatches) {
      if (node.id !== id && node.getAttribute('id') !== id) return false;
    }

    // Check classes
    for (const cls of classMatches) {
      if (!node.classList.contains(cls)) return false;
    }

    // Check attributes
    for (const attr of attrMatches) {
      if (!node.hasAttribute(attr.name)) return false;
      if (attr.operator) {
        const nodeVal = node.getAttribute(attr.name) || '';
        if (attr.operator === '=' && nodeVal !== attr.val) return false;
        if (attr.operator === '*=' && !nodeVal.includes(attr.val)) return false;
        if (attr.operator === '^=' && !nodeVal.startsWith(attr.val)) return false;
        if (attr.operator === '$=' && !nodeVal.endsWith(attr.val)) return false;
      }
    }

    return true;
  };
}

/**
 * Fast Robust HTML Parser to DOMElement Tree
 */
function parseHtmlToNodes(htmlString, parent = null) {
  const rootNodes = [];
  const stack = [];
  let currentParent = parent;

  // Regex to match tags and text tokens
  const tagRegex = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z0-9\-]+)([^>]*?)(\/?)>|([^<]+)/g;
  let match;

  while ((match = tagRegex.exec(htmlString)) !== null) {
    const [fullMatch, isClosing, tagName, rawAttrs, isSelfClosing, textContent] = match;

    if (fullMatch.startsWith('<!--')) {
      // Comment, skip
      continue;
    }

    if (textContent) {
      const trimmed = textContent.trim();
      if (trimmed && currentParent) {
        currentParent._textContent = (currentParent._textContent || '') + ' ' + trimmed;
      }
      continue;
    }

    if (tagName) {
      const lowerTag = tagName.toLowerCase();
      const isAutoSelfClosing = isSelfClosing === '/' || ['img', 'input', 'br', 'hr', 'link', 'meta', 'source'].includes(lowerTag);

      if (isClosing) {
        // Pop stack
        if (stack.length > 0) {
          stack.pop();
          currentParent = stack.length > 0 ? stack[stack.length - 1] : parent;
        }
      } else {
        // Parse attributes
        const attributes = {};
        const attrRegex = /([a-zA-Z0-9\-:_]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
          const attrName = attrMatch[1];
          const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : (attrMatch[4] !== undefined ? attrMatch[4] : ''));
          attributes[attrName] = attrVal;
        }

        const parentNode = stack.length > 0 ? stack[stack.length - 1] : parent;
        const elem = new DOMElement(tagName, attributes, parentNode);

        if (stack.length === 0) {
          rootNodes.push(elem);
        } else {
          stack[stack.length - 1].children.push(elem);
        }

        if (!isAutoSelfClosing) {
          stack.push(elem);
          currentParent = elem;
        }
      }
    }
  }

  return rootNodes;
}

/**
 * Sandboxed Browser Environment Simulator
 */
class DOMSimulator {
  constructor(projectRoot = path.resolve(__dirname, '../..')) {
    this.projectRoot = projectRoot;
    this.htmlPath = path.join(projectRoot, 'index.html');
    this.carsDataPath = path.join(projectRoot, 'js/cars-data.js');
    this.appJsPath = path.join(projectRoot, 'js/app.js');

    this.rawHtml = fs.readFileSync(this.htmlPath, 'utf8');
    this.rawCarsData = fs.readFileSync(this.carsDataPath, 'utf8');
    this.rawAppJs = fs.readFileSync(this.appJsPath, 'utf8');

    this.document = null;
    this.window = null;
  }

  /**
   * Parse fresh document tree from index.html
   */
  createDocument() {
    const docElement = new DOMElement('HTML', { lang: 'fa', dir: 'rtl' });
    const nodes = parseHtmlToNodes(this.rawHtml);

    // Set docElement children
    docElement.children = nodes;
    nodes.forEach(n => { n.parentNode = docElement; });

    const docEventListeners = {};

    const doc = {
      nodeType: 9,
      documentElement: docElement,
      body: docElement.querySelector('body') || docElement,
      head: docElement.querySelector('head') || docElement,
      activeElement: null,
      getElementById: (id) => docElement.getElementById(id),
      querySelector: (sel) => docElement.querySelector(sel),
      querySelectorAll: (sel) => docElement.querySelectorAll(sel),
      getElementsByTagName: (tag) => docElement.getElementsByTagName(tag),
      getElementsByClassName: (cls) => docElement.getElementsByClassName(cls),
      createElement: (tagName) => {
        const el = new DOMElement(tagName);
        el._ownerDocument = doc;
        return el;
      },
      addEventListener: (type, fn) => {
        if (!docEventListeners[type]) docEventListeners[type] = [];
        docEventListeners[type].push(fn);
      },
      removeEventListener: (type, fn) => {
        if (!docEventListeners[type]) return;
        docEventListeners[type] = docEventListeners[type].filter(l => l !== fn);
      },
      dispatchEvent: (event) => {
        event.target = event.target || doc;
        event.currentTarget = doc;
        const listeners = docEventListeners[event.type] || [];
        for (const l of listeners) {
          try {
            l.call(doc, event);
          } catch (err) {
            console.error(`Error in document listener for ${event.type}:`, err);
          }
        }
        return !event.defaultPrevented;
      },
    };

    // Link ownerDocument on all elements
    const linkDoc = (elem) => {
      elem._ownerDocument = doc;
      elem.children.forEach(linkDoc);
    };
    linkDoc(docElement);

    return doc;
  }

  /**
   * Set up a sandboxed browser environment with window, document, timers, and storage
   */
  createSandboxEnvironment() {
    const doc = this.createDocument();
    const timers = new Set();
    const intervals = new Set();
    const winEventListeners = {};

    const mockLocalStorage = {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
      clear() { this._store = {}; },
    };

    const win = {
      document: doc,
      navigator: { userAgent: 'Mozilla/5.0 (Node-E2E-Runner)', language: 'fa-IR' },
      localStorage: mockLocalStorage,
      location: { href: 'http://localhost/', hash: '', search: '', pathname: '/' },
      matchMedia: (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
      IntersectionObserver: class {
        constructor(callback) { this.callback = callback; }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
      setTimeout: (fn, delay = 0) => {
        const id = setTimeout(fn, delay);
        timers.add(id);
        return id;
      },
      clearTimeout: (id) => {
        timers.delete(id);
        clearTimeout(id);
      },
      setInterval: (fn, delay = 0) => {
        const id = setInterval(fn, delay);
        intervals.add(id);
        return id;
      },
      clearInterval: (id) => {
        intervals.delete(id);
        clearInterval(id);
      },
      addEventListener: (type, fn) => {
        if (!winEventListeners[type]) winEventListeners[type] = [];
        winEventListeners[type].push(fn);
      },
      removeEventListener: (type, fn) => {
        if (!winEventListeners[type]) return;
        winEventListeners[type] = winEventListeners[type].filter(l => l !== fn);
      },
      dispatchEvent: (event) => {
        event.target = event.target || win;
        event.currentTarget = win;
        const listeners = winEventListeners[event.type] || [];
        for (const l of listeners) {
          try {
            l.call(win, event);
          } catch (err) {
            console.error(`Error in window listener for ${event.type}:`, err);
          }
        }
        return !event.defaultPrevented;
      },
      Event: DOMEvent,
      CustomEvent: DOMEvent,
      KeyboardEvent: DOMEvent,
      MouseEvent: DOMEvent,
      encodeURIComponent,
      decodeURIComponent,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      Math,
      Number,
      String,
      Array,
      Object,
      JSON,
      RegExp,
      console,
    };

    win.window = win;
    win.self = win;
    win.globalThis = win;
    doc.defaultView = win;
    if (doc.documentElement) doc.documentElement._win = win;

    return {
      window: win,
      document: doc,
      cleanup: () => {
        timers.forEach(t => clearTimeout(t));
        intervals.forEach(i => clearInterval(i));
        timers.clear();
        intervals.clear();
      },
    };
  }

  /**
   * Load and evaluate full application (cars-data.js + app.js) in sandboxed environment
   */
  loadApp() {
    const env = this.createSandboxEnvironment();
    const sandbox = vm.createContext(env.window);
    env.document.defaultView = sandbox;
    if (env.document.documentElement) env.document.documentElement._win = sandbox;

    const linkSandbox = (elem) => {
      elem._sandboxContext = sandbox;
      elem.children.forEach(linkSandbox);
    };
    linkSandbox(env.document.documentElement);

    // Combine scripts and attach carsData & carBrands to window for clean access
    const combinedScript = `
      ${this.rawCarsData}
      if (typeof carsData !== 'undefined') window.carsData = carsData;
      if (typeof carBrands !== 'undefined') window.carBrands = carBrands;
      ${this.rawAppJs}
    `;

    vm.runInContext(combinedScript, sandbox);

    // Dispatch DOMContentLoaded event
    const domLoadedEvent = new DOMEvent('DOMContentLoaded', { bubbles: true, cancelable: true });
    env.document.dispatchEvent(domLoadedEvent);

    return {
      window: env.window,
      document: env.document,
      carsData: env.window.carsData,
      carBrands: env.window.carBrands,
      cleanup: env.cleanup,
    };
  }
}

module.exports = {
  DOMElement,
  DOMEvent,
  DOMSimulator,
  parseHtmlToNodes,
  escapeHtml,
  stripHtml,
};
