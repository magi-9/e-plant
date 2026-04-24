export const getWildcardBadgeReference = (maskedReference?: string | null): string | null => {
    const normalized = (maskedReference || '').trim();
    return normalized.length > 0 ? normalized : null;
};
