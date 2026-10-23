import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installContentProtection, protectionEnabled } from './content-protection';

describe('protectionEnabled', () => {
  it('is on in production builds and off in development', () => {
    expect(protectionEnabled({ PROD: true })).toBe(true);
    expect(protectionEnabled({ PROD: false })).toBe(false);
  });

  it('can be forced either way', () => {
    expect(protectionEnabled({ PROD: false, VITE_PROTECT_CONTENT: 'true' })).toBe(true);
    expect(protectionEnabled({ PROD: true, VITE_PROTECT_CONTENT: 'false' })).toBe(false);
  });

  it('ignores any other value', () => {
    expect(protectionEnabled({ PROD: true, VITE_PROTECT_CONTENT: 'yes' })).toBe(true);
    expect(protectionEnabled({ PROD: false, VITE_PROTECT_CONTENT: '' })).toBe(false);
  });
});

describe('installContentProtection', () => {
  let remove: () => void;

  const find = (selector: string): Element => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Test page has no ${selector}`);
    return element;
  };

  /** Right-clicks an element; returns true when the page stopped the browser's menu. */
  function rightClick(selector: string): boolean {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    find(selector).dispatchEvent(event);
    return event.defaultPrevented;
  }

  function startDragging(selector: string): boolean {
    const event = new Event('dragstart', { bubbles: true, cancelable: true });
    find(selector).dispatchEvent(event);
    return event.defaultPrevented;
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <h1>Title</h1>
        <p>Some <b>bold</b> text</p>
        <a href="/somewhere">A link</a>
        <img alt="A photo" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
        <svg><circle r="1"></circle></svg>
        <input id="name" />
        <input id="email" type="email" />
        <textarea id="message"></textarea>
        <select id="kind"><option>One</option></select>
        <div id="editable" contenteditable="true"><b>edit me</b></div>
        <div id="plain" contenteditable="plaintext-only">edit me too</div>
        <div id="locked" contenteditable="false"><b>locked</b></div>
      </main>`;
    remove = installContentProtection(document);
  });

  afterEach(() => {
    remove();
    document.body.innerHTML = '';
  });

  it('stops the browser menu on page content, links, images and drawings', () => {
    for (const selector of ['h1', 'p b', 'a', 'img', 'svg', 'circle', 'main', 'body']) {
      expect(rightClick(selector), selector).toBe(true);
    }
  });

  it('leaves the browser menu alone in form fields and editable text', () => {
    for (const selector of [
      '#name',
      '#email',
      '#message',
      '#kind',
      '#editable',
      '#editable b',
      '#plain',
    ]) {
      expect(rightClick(selector), selector).toBe(false);
    }
  });

  it('still blocks text that is marked as not editable', () => {
    expect(rightClick('#locked b')).toBe(true);
  });

  it('stops images being dragged out of the page, but not other dragging', () => {
    expect(startDragging('img')).toBe(true);
    expect(startDragging('a')).toBe(false);
    expect(startDragging('p b')).toBe(false);
    expect(startDragging('#message')).toBe(false);
  });

  it('stops blocking once it is removed', () => {
    remove();
    expect(rightClick('h1')).toBe(false);
    expect(startDragging('img')).toBe(false);
  });
});
