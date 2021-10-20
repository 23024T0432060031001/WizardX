/**
 * @license
 * Copyright (C) 2020 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {EventApi} from '@polymer/polymer/lib/legacy/polymer.dom';
import {check} from './common-util';
import {IronKeyboardEvent} from '../types/events';

/**
 * Event emitted from polymer elements.
 */
export interface PolymerEvent extends EventApi, Event {}

interface ElementWithShadowRoot extends Element {
  shadowRoot: ShadowRoot;
}

/**
 * Type guard for element with a shadowRoot.
 */
function isElementWithShadowRoot(
  el: Element | ShadowRoot
): el is ElementWithShadowRoot {
  return 'shadowRoot' in el;
}

export function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

export function isElementTarget(
  target: EventTarget | null | undefined
): target is Element {
  if (!target) return false;
  return 'nodeType' in target && isElement(target as Node);
}

// TODO: maybe should have a better name for this
function getPathFromNode(el: EventTarget) {
  let tagName = '';
  let id = '';
  let className = '';
  if (el instanceof Element) {
    tagName = el.tagName;
    id = el.id;
    className = el.className;
  }
  if (
    !tagName ||
    'GR-APP' === tagName ||
    el instanceof DocumentFragment ||
    el instanceof HTMLSlotElement
  ) {
    return '';
  }
  let path = '';
  if (tagName) {
    path += tagName.toLowerCase();
  }
  if (id) {
    path += `#${id}`;
  }
  if (className) {
    path += `.${className.replace(/ /g, '.')}`;
  }
  return path;
}

/**
 * Get computed style value.
 */
export function getComputedStyleValue(name: string, el: Element) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Query selector on a dom element.
 *
 * This is shadow DOM compatible, but only works when selector is within
 * one shadow host, won't work if your selector is crossing
 * multiple shadow hosts.
 *
 */
export function querySelector(
  el: Element | ShadowRoot,
  selector: string
): Element | null {
  let nodes = [el];
  let result = null;
  while (nodes.length) {
    const node = nodes.pop();

    // Skip if it's an invalid node.
    if (!node || !node.querySelector) continue;

    // Try find it with native querySelector directly
    result = node.querySelector(selector);

    if (result) {
      break;
    }

    // Add all nodes with shadowRoot and loop through
    const allShadowNodes = [...node.querySelectorAll('*')]
      .filter(isElementWithShadowRoot)
      .map(child => child.shadowRoot);
    nodes = nodes.concat(allShadowNodes);

    // Add shadowRoot of current node if has one
    // as its not included in node.querySelectorAll('*')
    if (isElementWithShadowRoot(node)) {
      nodes.push(node.shadowRoot);
    }
  }
  return result;
}

/**
 * Query selector all dom elements matching with certain selector.
 *
 * This is shadow DOM compatible, but only works when selector is within
 * one shadow host, won't work if your selector is crossing
 * multiple shadow hosts.
 *
 * Note: this can be very expensive, only use when have to.
 */
export function querySelectorAll(
  el: Element | ShadowRoot,
  selector: string
): Element[] {
  let nodes = [el];
  const results = new Set<Element>();
  while (nodes.length) {
    const node = nodes.pop();

    if (!node || !node.querySelectorAll) continue;

    // Try find all from regular children
    [...node.querySelectorAll(selector)].forEach(el => results.add(el));

    // Add all nodes with shadowRoot and loop through
    const allShadowNodes = [...node.querySelectorAll('*')]
      .filter(isElementWithShadowRoot)
      .map(child => child.shadowRoot);
    nodes = nodes.concat(allShadowNodes);

    // Add shadowRoot of current node if has one
    // as its not included in node.querySelectorAll('*')
    if (isElementWithShadowRoot(node)) {
      nodes.push(node.shadowRoot);
    }
  }
  return [...results];
}

export function windowLocationReload() {
  const e = new Error();
  console.info(`Calling window.location.reload(): ${e.stack}`);
  window.location.reload();
}

/**
 * Retrieves the dom path of the current event.
 *
 * If the event object contains a `path` property, then use it,
 * otherwise, construct the dom path based on the event target.
 *
 * domNode.onclick = e => {
 *  getEventPath(e); // eg: div.class1>p#pid.class2
 * }
 */
export function getEventPath<T extends MouseEvent>(e?: T) {
  if (!e) return '';

  let path = e.composedPath();
  if (!path || !path.length) {
    path = [];
    let el = e.target;
    while (el) {
      path.push(el);
      el = (el as Node).parentNode || (el as ShadowRoot).host;
    }
  }

  return path.reduce<string>((domPath: string, curEl: EventTarget) => {
    const pathForEl = getPathFromNode(curEl);
    if (!pathForEl) return domPath;
    return domPath ? `${pathForEl}>${domPath}` : pathForEl;
  }, '');
}

/**
 * Are any ancestors of the element (or the element itself) members of the
 * given class.
 *
 */
export function descendedFromClass(
  element: Element,
  className: string,
  stopElement?: Element
) {
  let isDescendant = element.classList.contains(className);
  while (
    !isDescendant &&
    element.parentElement &&
    (!stopElement || element.parentElement !== stopElement)
  ) {
    isDescendant = element.classList.contains(className);
    element = element.parentElement;
  }
  return isDescendant;
}

/**
 * Convert any string into a valid class name.
 *
 * For class names, naming rules:
 * Must begin with a letter A-Z or a-z
 * Can be followed by: letters (A-Za-z), digits (0-9), hyphens ("-"), and underscores ("_")
 */
export function strToClassName(str = '', prefix = 'generated_') {
  return `${prefix}${str.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
}

// document.activeElement is not enough, because it's not getting activeElement
// without looking inside of shadow roots. This will find best activeElement.
export function findActiveElement(
  root: Document | ShadowRoot | null,
  ignoreDialogs?: boolean
): HTMLElement | null {
  if (root === null) {
    return null;
  }
  if (
    ignoreDialogs &&
    root.activeElement &&
    root.activeElement.nodeName.toUpperCase().includes('DIALOG')
  ) {
    return null;
  }
  if (root.activeElement?.shadowRoot?.activeElement) {
    return findActiveElement(root.activeElement.shadowRoot);
  }
  if (!root.activeElement) {
    return null;
  }
  // We block some elements
  if ('BODY' === root.activeElement.nodeName.toUpperCase()) {
    return null;
  }
  return root.activeElement as HTMLElement;
}

// Whether the browser is Safari. Used for polyfilling unique browser behavior.
export function isSafari() {
  return (
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
}

export function whenVisible(
  element: Element,
  callback: () => void,
  marginPx = 0
) {
  const observer = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      check(entries.length === 1, 'Expected one intersection observer entry.');
      const entry = entries[0];
      if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        callback();
      }
    },
    {rootMargin: `${marginPx}px`}
  );
  observer.observe(element);
}

/**
 * Toggles a CSS class on or off for an element.
 */
export function toggleClass(el: Element, className: string, bool?: boolean) {
  if (bool === undefined) {
    bool = !el.classList.contains(className);
  }
  if (bool) {
    el.classList.add(className);
  } else {
    el.classList.remove(className);
  }
}

/**
 * For matching the `key` property of KeyboardEvents. These are known to work
 * with Firefox, Safari and Chrome.
 */
export enum Key {
  ENTER = 'Enter',
  ESC = 'Escape',
  TAB = 'Tab',
  SPACE = ' ',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
}

export enum Modifier {
  ALT_KEY,
  CTRL_KEY,
  META_KEY,
  SHIFT_KEY,
}

export interface Shortcut {
  key: string;
  modifiers?: Modifier[];
}

export function addShortcut(
  shortcut: Shortcut,
  listener: (e: KeyboardEvent) => void
) {
  const wrappedListener = (e: KeyboardEvent) => {
    if (e.key !== shortcut.key) return;
    const modifiers = shortcut.modifiers ?? [];
    if (e.ctrlKey !== modifiers.includes(Modifier.CTRL_KEY)) return;
    if (e.metaKey !== modifiers.includes(Modifier.META_KEY)) return;
    // TODO(brohlfs): Refine the matching of modifiers. For "normal" keys we
    // don't want to check ALT and SHIFT, because we don't know what the
    // keyboard layout looks like. The user may have to use ALT and/or SHIFT for
    // certain keys. Comparing the `key` string is sufficient in that case.
    // if (e.altKey !== modifiers.includes(Modifier.ALT_KEY)) return;
    // if (e.shiftKey !== modifiers.includes(Modifier.SHIFT_KEY)) return;
    listener(e);
  };
  document.addEventListener('keydown', wrappedListener);
  return () => document.removeEventListener('keydown', wrappedListener);
}

export function modifierPressed(e: KeyboardEvent) {
  return e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
}

export function shiftPressed(e: KeyboardEvent) {
  return e.shiftKey;
}

export function isModifierPressed(e: IronKeyboardEvent) {
  return modifierPressed(e.detail.keyboardEvent);
}

export function isShiftPressed(e: IronKeyboardEvent) {
  return shiftPressed(e.detail.keyboardEvent);
}