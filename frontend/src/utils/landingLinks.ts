const LANDING_HOST = (import.meta.env.VITE_LANDING_HOST as string | undefined) || 'ebringer.sk';

export function getLandingHomeHref(): string {
  if (import.meta.env.DEV) {
    return '/';
  }
  return `https://${LANDING_HOST}/`;
}

export function getLandingAboutHref(): string {
  return `https://${LANDING_HOST}/#d-about`;
}

export function getLandingContactHref(): string {
  return `https://${LANDING_HOST}/#kontakt`;
}
