export function parseBooleanEnv(value: string | undefined, defaultValue = true): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value.trim().toLowerCase() !== 'false';
}