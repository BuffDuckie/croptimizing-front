import '@testing-library/jest-dom/vitest';
import '../i18n';

// jsdom lacks these; components use them defensively.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};
window.scrollTo = (() => {}) as typeof window.scrollTo;
