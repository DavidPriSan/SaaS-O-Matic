import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('applies safe defaults for local development', () => {
    expect(loadConfig({})).toMatchObject({
      PORT: 3000,
      HOST: 'localhost',
      CORS_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'info',
      DB_PATH: expect.stringMatching(/saas-o-matic\.db$/),
    });
  });

  it('coerces values coming from the environment as strings', () => {
    expect(loadConfig({ PORT: '8080' }).PORT).toBe(8080);
  });

  it.each([
    ['PORT', 'abc'],
    ['PORT', '70000'],
    ['CORS_ORIGIN', 'not-a-url'],
    ['LOG_LEVEL', 'verbose'],
  ])('fails fast on an invalid %s=%s instead of booting misconfigured', (key, value) => {
    expect(() => loadConfig({ [key]: value })).toThrow();
  });
});
