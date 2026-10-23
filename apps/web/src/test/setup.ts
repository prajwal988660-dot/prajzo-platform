import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Pages load their code on demand, which can take more than the default 1 s when many test
// files run in parallel. findBy… queries still return as soon as the element appears.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no scrolling; the router's scroll restoration calls this on every navigation.
window.scrollTo = () => {};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
