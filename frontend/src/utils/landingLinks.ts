const LANDING_HOST = (import.meta.env.VITE_LANDING_HOST as string | undefined) || 'ebringer.sk';

export function getLandingHomeHref(): string {
  if (import.meta.env.DEV) {
    return '/';
  }
  return `https://${LANDING_HOST}/`;
}

export function getLandingAboutHref(): string {
  return getLandingHomeHref();
}

export function getLandingContactHref(): string {
  if (import.meta.env.DEV) {
    return '/#d-contact';
  }
  return `https://${LANDING_HOST}/#d-contact`;
}
