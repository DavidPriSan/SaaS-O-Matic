import * as matchers from '@testing-library/jest-dom/matchers';
// Type-only: brings the `expect(...).toBeInTheDocument()` typings; erased at runtime.
import type {} from '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';

// Explicit registration on THIS expect instance. The side-effect entry ('@testing-library/jest-dom/vitest')
// left some workers without the matchers when running in parallel with coverage ("Invalid Chai property").
expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
