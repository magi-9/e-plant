export interface DescriptionPart {
    key: string;
    value: string;
}

export interface VariantOverride {
    name: string;
    reference_num?: string;
}

/**
 * Parses a product description string ("Key: Value | Key: Value | ...") into
 * key-value pairs, applying variant-specific overrides when a variant is selected.
 *
 * When hasVariants is true:
 *   - 'Parametre' entries are hidden (shown separately from option_tokens)
 *   - 'Product name' is replaced by the selected variant's name
 *   - 'Compatibility codes' is replaced by the selected variant's reference_num (when available)
 */
export function buildDescriptionParts(
    description: string,
    hasVariants: boolean,
    selectedVariant?: VariantOverride | null
): DescriptionPart[] {
    return description
        .split(' | ')
        .map((p) => {
            const idx = p.indexOf(': ');
            if (idx === -1) return { key: '', value: p.trim() };

            const key = p.slice(0, idx).trim();
            let value = p.slice(idx + 2).trim();

            if (hasVariants && selectedVariant) {
                if (key === 'Product name') {
                    value = selectedVariant.name;
                } else if (key === 'Compatibility codes' && selectedVariant.reference_num) {
                    value = selectedVariant.reference_num;
                }
            }

            return { key, value };
        })
        .filter((p) => p.value && (hasVariants ? p.key !== 'Parametre' : true));
}
