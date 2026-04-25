import { describe, expect, it } from 'vitest';
import { parseBooleanEnv } from '../../utils/env';

describe('parseBooleanEnv', () => {
  it('defaults to true when the env value is missing', () => {
    expect(parseBooleanEnv(undefined)).toBe(true);
  });

  it('treats false as disabled', () => {
    expect(parseBooleanEnv('false')).toBe(false);
    expect(parseBooleanEnv(' FALSE ')).toBe(false);
  });

  it('treats any other value as enabled', () => {
    expect(parseBooleanEnv('true')).toBe(true);
    expect(parseBooleanEnv('1')).toBe(true);
    expect(parseBooleanEnv('yes')).toBe(true);
  });
});