'use strict';
/* Smoke test for dsh-composer-plus/lib/client.js: runs the browser bundle in
 * Node with a tiny fake module loader, DOM and slot registry, then drives the
 * right-click file menu for changed-files cards, delivered file cards, file-tree
 * rows and rendered file-path links. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

//#region fake DOM
class FakeNode {}
class FakeElement extends FakeNode {
  constructor(tag, attrs = {}, children = [], text = '') {
    super();
    this.tagName = String(tag).toUpperCase();
    this.attrs = { ...attrs };
    this.children = [];
    this.parent = null;
    this.ownText = text;
    this.clicked = 0;
    for (const child of children) this.append(child);
  }
  append(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }
  hasAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name);
  }
  get isConnected() {
    return true;
  }
  get dataset() {
    const out = {};
    for (const [key, value] of Object.entries(this.attrs)) {
      if (key.startsWith('data-')) {
        out[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      }
    }
    return out;
  }
  click() {
    this.clicked += 1;
  }
  contains(element) {
    let node = element;
    while (node !== null && node !== undefined) {
      if (node === this) return true;
      node = node.parent;
    }
    return false;
  }
  closest(selector) {
    let node = this;
    while (node !== null && node !== undefined) {
      if (matchesSelector(node, selector)) return node;
      node = node.parent;
    }
    return null;
  }
  matches(selector) {
    return matchesSelector(this, selector);
  }
  get className() {
    return this.attrs.class ?? '';
  }
  querySelector(selector) {
    if (selector.startsWith(':scope > ')) {
      const inner = selector.slice(':scope > '.length);
      return this.children.find((child) => matchesSelector(child, inner)) ?? null;
    }
    return this.querySelectorAll(selector)[0] ?? null;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  get textContent() {
    return this.ownText + this.children.map((child) => child.textContent).join('');
  }
}

function matchesSelector(element, selector) {
  if (selector === 'button') return element.tagName === 'BUTTON';
  if (selector === 'button[title]') return element.tagName === 'BUTTON' && element.hasAttribute('title');
  if (selector === '[data-conversation-session]') return element.hasAttribute('data-conversation-session');
  if (selector === '[data-sidebar-right-session]') return element.hasAttribute('data-sidebar-right-session');
  if (selector === "[role='menu']") return element.getAttribute('role') === 'menu';
  if (selector === '[data-changed-files]') return element.hasAttribute('data-changed-files');
  if (selector === '[data-presented-file]') return element.hasAttribute('data-presented-file');
  if (selector === '[data-files-path][data-files-entry]') {
    return element.hasAttribute('data-files-path') && element.hasAttribute('data-files-entry');
  }
  if (selector === "[data-files-state='tree']") return element.getAttribute('data-files-state') === 'tree';
  if (selector === 'button[aria-describedby]') {
    return element.tagName === 'BUTTON' && element.hasAttribute('aria-describedby');
  }
  return false;
}

const byId = new Map();
const listeners = [];
global.Node = FakeNode;
global.Element = FakeElement;
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }, configurable: true });
global.document = {
  documentElement: { dataset: { platform: 'darwin' } },
  head: { appendChild() {} },
  body: {},
  createElement(tag) {
    return { tagName: String(tag).toUpperCase(), dataset: {}, textContent: '', remove() {} };
  },
  getElementById(id) {
    return byId.get(id) ?? null;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
  addEventListener(type, listener) {
    listeners.push({ type, listener });
  },
  removeEventListener() {}
};
global.MutationObserver = class MutationObserver {
  observe() {}
  disconnect() {}
};
global.window = {
  requestAnimationFrame(callback) {
    callback();
    return 1;
  },
  __ModuleLoader__: { load(definition) { loaded = definition; } }
};

//#endregion

//#region fake module loader and plugin context
let loaded;
const ReactFake = {
  Fragment: Symbol('Fragment'),
  createElement(type, props, ...children) {
    return { type, props: props ?? {}, children };
  },
  useSyncExternalStore(subscribe, getSnapshot) {
    return getSnapshot();
  }
};
const jsxRuntimeFake = {
  jsx(type, props, key) {
    return { type, props: props ?? {}, key };
  },
  jsxs(type, props, key) {
    return { type, props: props ?? {}, key };
  }
};
const primitivesFake = new Proxy({}, {
  get(_target, name) {
    if (name === 'Menu' || name === 'Toast') return name;
    if (name === 'FileTypeIcon') return function FileTypeIcon() {};
    return function Icon() {};
  }
});
const MODULES = {
  react: ReactFake,
  'react/jsx-runtime': jsxRuntimeFake,
  '@deepseek-ai/dsh-client-ui-primitives': primitivesFake
};
const requireFake = (name) => {
  if (Object.prototype.hasOwnProperty.call(MODULES, name)) return MODULES[name];
  throw new Error('unexpected require: ' + name);
};

const bundle = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
new Function('window', 'document', 'navigator', 'Element', 'Node', bundle)(
  global.window, global.document, global.navigator, global.Element, global.Node
);
if (loaded === undefined) throw new Error('bundle never registered a module');
if (loaded.id !== 'dsh-composer-plus') throw new Error('unexpected bundle id: ' + loaded.id);
const exported = loaded.factory(requireFake);
if (typeof exported.apply !== 'function') throw new Error('missing apply');
if (!Array.isArray(exported.inject) || !exported.inject.includes('remote.session')) {
  throw new Error('missing remote.session injection');
}

const effects = [];
const registered = [];
let sessionRequests = [];
const ctx = {
  effect(fn) {
    effects.push(fn);
    return () => {};
  },
  locale: {
    register() {
      return () => {};
    },
    bind() {
      return (key, values) => (values === undefined ? key : key + JSON.stringify(values));
    }
  },
  slots: {
    inject(name, callback) {
      return callback();
    },
    register(definition, component) {
      registered.push({ definition, component });
      return () => {};
    }
  },
  modelDirectories: {},
  sessions: {
    list: {
      getSnapshot: () => ({ current: 'session-1', byId: { 'session-1': { cwd: '/ws' } } })
    }
  },
  remote: {
    session: {
      async openWorkspacePath(request) {
        sessionRequests.push(request);
        return { ok: true, value: { opened: true } };
      }
    }
  }
};

const disposals = [];
exported.apply(ctx);
for (const effect of effects) {
  const dispose = effect();
  if (typeof dispose === 'function') disposals.push(dispose);
}


//#endregion

//#region helpers and cases
function assert(condition, message) {
  if (!condition) throw new Error('assertion failed: ' + message);
}
function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
const contextmenu = listeners.find((entry) => entry.type === 'contextmenu');
assert(contextmenu !== undefined, 'contextmenu listener registered');
const slots = registered.filter((entry) => entry.definition.name === 'shell.overlay');
assert(slots.length === 1, 'one shell.overlay entry registered');
const slot = slots[0];
assert(slot.definition.id === 'composer-plus-files', 'slot definition');
const props = slot.definition.inject();
function fire(target, x = 40, y = 60) {
  const event = {
    target,
    clientX: x,
    clientY: y,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {}
  };
  contextmenu.listener(event);
  return event;
}
function renderedNodes(rendered) {
  if (rendered === null) return [];
  const children = rendered.children ?? rendered.props.children ?? [];
  const flat = [];
  for (const child of children) {
    if (Array.isArray(child)) flat.push(...child);
    else flat.push(child);
  }
  return flat;
}
function menuNode() {
  return renderedNodes(slot.component(props)).find((child) => child.type === 'Menu') ?? null;
}
function toastNode() {
  return renderedNodes(slot.component(props)).find((child) => child.type === 'Toast') ?? null;
}
function items() {
  const menu = menuNode();
  assert(menu !== null, 'menu rendered');
  return menu.props.items;
}

// 1. changed-files card: reveal the hidden path of a single-file card.
const hidden = new FakeElement('span', { hidden: '' }, [], '/ws/out/试稿_v2.txt');
byId.set('path-1', hidden);
const title = new FakeElement('span', {}, [], '已编辑 试稿_v2.txt');
const header = new FakeElement('button', { 'aria-describedby': 'path-1' }, [title]);
const changedCard = new FakeElement('div', { 'data-changed-files': '' }, [header, hidden]);
const event1 = fire(title, 120, 200);
assert(event1.defaultPrevented, 'changed card right-click is owned');
let menu = props.open.get().menu;
assert(menu !== null && menu.target.absolutePath === '/ws/out/试稿_v2.txt', 'changed card target path');
assert(menu.x === 120 && menu.y === 200, 'menu anchored at the pointer');
const cardItems = items();
assert(cardItems[0].type === 'label' && cardItems[0].text.startsWith('file.headerFile'), 'card header label');
assert(cardItems.some((item) => item.id === 'file-open' && item.label === 'file.openSidebar'), 'open-in-sidebar row');
assert(cardItems.some((item) => item.id === 'file-reveal' && item.label === 'file.revealMac'), 'mac reveal label');
menuNode().props.onSelect('file-reveal');
await tick();
assert(sessionRequests.length === 1, 'one reveal request');
assert(sessionRequests[0].path === '/ws/out/试稿_v2.txt' && sessionRequests[0].action === 'reveal', 'reveal request payload');
assert(props.open.get().menu === null, 'menu closed after selecting');
const successToast = toastNode();
assert(successToast !== null && successToast.props.text === 'file.revealedMac', 'reveal success notice');
assert(successToast.props.tone === 'success', 'success tone');

// 2. the card's own click opens the review sidebar tab.
fire(title, 10, 10);
menuNode().props.onSelect('file-open');
await tick();
assert(header.clicked === 1, 'sidebar open clicks the card');

// 3. a presented file card uses its preview button title as the path.
const previewButton = new FakeElement('button', { title: '/ws/docs/notes.md' });
const presentedCard = new FakeElement('div', { 'data-presented-file': '' }, [previewButton]);
fire(previewButton, 5, 5);
menu = props.open.get().menu;
assert(menu !== null && menu.target.absolutePath === '/ws/docs/notes.md', 'presented card path');
menuNode().props.onSelect('file-reveal');
await tick();
assert(sessionRequests[1].path === '/ws/docs/notes.md', 'presented reveal path');

// 4. a file row of the right Sidebar's file tree joins the tree root.
const treeButton = new FakeElement('button', {}, [new FakeElement('span', {}, [], 'b.txt')]);
const treeRow = new FakeElement('li', { 'data-files-path': 'a/b.txt', 'data-files-entry': 'file' }, [treeButton]);
const treeRoot = new FakeElement('div', { 'data-files-state': 'tree', 'data-files-root': '/ws' }, [new FakeElement('ul', {}, [treeRow])]);
fire(treeButton, 8, 8);
menu = props.open.get().menu;
assert(menu !== null && menu.target.absolutePath === '/ws/a/b.txt', 'tree file absolute path');
const treeItems = items();
assert(treeItems.some((item) => item.id === 'file-open' && item.label === 'file.openSidebar'), 'tree open row');
menuNode().props.onSelect('file-reveal');
await tick();
assert(sessionRequests[2].path === '/ws/a/b.txt' && sessionRequests[2].action === 'reveal', 'tree reveal');

// 5. a directory row opens the file manager instead of revealing the parent.
const dirButton = new FakeElement('button', {});
const dirRow = new FakeElement('li', { 'data-files-path': '/ws/src', 'data-files-entry': 'directory' }, [dirButton]);
const dirRoot = new FakeElement('div', { 'data-files-state': 'tree', 'data-files-root': '/ws' }, [new FakeElement('ul', {}, [dirRow])]);
fire(dirButton, 8, 8);
menu = props.open.get().menu;
assert(menu !== null && menu.target.kind === 'directory', 'directory kind');
const dirItems = items();
assert(dirItems.some((item) => item.id === 'file-open' && item.label === 'file.expand'), 'directory expand row');
assert(dirItems.some((item) => item.id === 'file-reveal' && item.label === 'file.openFolderMac'), 'directory open label');
menuNode().props.onSelect('file-reveal');
await tick();
assert(sessionRequests[3].path === '/ws/src' && sessionRequests[3].action === undefined, 'directory open request');

// 6. a rendered file-path link resolves its workspace path against the session cwd.
const linkButton = new FakeElement('button', { class: '_fileMention_test _fileLink_test', title: 'src/app.ts' }, [], 'src/app.ts');
const linkHost = new FakeElement('div', { 'data-conversation-session': 'session-1' }, [linkButton]);
const event6 = fire(linkButton, 12, 24);
assert(event6.defaultPrevented, 'file link right-click is owned');
menu = props.open.get().menu;
assert(menu !== null && menu.target.absolutePath === '/ws/src/app.ts', 'file link absolute path: ' + (menu === null ? 'no menu' : String(menu.target.absolutePath)));
assert(menu.target.entry === linkButton && menu.target.kind === 'file', 'file link target shape');
const linkItems = items();
assert(linkItems.some((item) => item.id === 'file-open' && item.label === 'file.openSidebar'), 'file link open row');
assert(linkItems.some((item) => item.id === 'file-reveal' && item.label === 'file.revealMac'), 'file link reveal row');
menuNode().props.onSelect('file-open');
await tick();
assert(linkButton.clicked === 1, 'file link open clicks the link');
fire(linkButton, 12, 24);
menuNode().props.onSelect('file-reveal');
await tick();
assert(sessionRequests[4].path === '/ws/src/app.ts' && sessionRequests[4].action === 'reveal', 'file link reveal');

// 7. a path link whose title is already absolute needs no cwd.
const absoluteButton = new FakeElement('button', { class: '_fileLink_test', title: '/tmp/abs.txt' }, [], '/tmp/abs.txt');
fire(absoluteButton, 12, 24);
menu = props.open.get().menu;
assert(menu !== null && menu.target.absolutePath === '/tmp/abs.txt', 'absolute file link path');
menuNode().props.onClose();

// 8. anything else keeps the native menu.
const plain = new FakeElement('div', {}, [new FakeElement('span', {}, [], 'hello')]);
const event8 = fire(plain.children[0]);
assert(event8.defaultPrevented === false, 'plain right-click untouched');
assert(props.open.get().menu === null, 'no menu for a plain target');

// 9. a DSH menu's own right-click is never hijacked.
const menuRoot = new FakeElement('div', { role: 'menu' }, [new FakeElement('button', {}, [], 'x')]);
const event9 = fire(menuRoot.children[0]);
assert(event9.defaultPrevented === false, 'menu right-click untouched');

for (const dispose of disposals) dispose();
console.log('SMOKE_OK: changed card, presented card, file tree, directory, file-path link, native-menu fallback');
