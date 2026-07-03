import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLandingAboutHref, getLandingContactHref } from './landingLinks';

describe('landing links', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('points at the internal anchors in dev, instead of reloading to the production domain', () => {
    vi.stubEnv('DEV', true);
    expect(getLandingAboutHref()).toBe('/');
    expect(getLandingContactHref()).toBe('/#d-contact');
  });

  it('keeps the about link on the landing host hero instead of the shop root', () => {
    vi.stubEnv('DEV', false);
    expect(getLandingAboutHref()).toBe('https://ebringer.sk/');
  });

  it('keeps the contact link on the landing footer', () => {
    vi.stubEnv('DEV', false);
    expect(getLandingContactHref()).toBe('https://ebringer.sk/#d-contact');
  });
});
