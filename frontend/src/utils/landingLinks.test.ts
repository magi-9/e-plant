import { describe, expect, it } from 'vitest';

import { getLandingAboutHref } from './landingLinks';

describe('landing links', () => {
  it('keeps the about link on the landing host instead of the shop root', () => {
    expect(getLandingAboutHref()).toBe('https://ebringer.sk/#d-about');
  });
});
