export interface DescriptionPart {
    key: string;
    value: string;
}

export interface VariantOverride {
    name: string;
    reference?: string;
    reference_num?: string;
}

// Map English field names to Slovak
const fieldNameMap: Record<string, string> = {
    'Product name': 'Názov produktu',
    'EAN13': 'Kód produktu',
    'Categories': 'Kategórie',
    'Compatibility codes': 'Kompatibilné kódy',
    'Parametre': 'Parametre',
    'Retail name': 'Retail name', // Hidden
    'Raw systems': 'Raw systems', // Hidden
    'Sections': 'Sections', // Hidden
};

// Fields to hide from description display (original English names)
const hiddenFields = new Set(['Retail name', 'Raw systems', 'Sections', 'Categories']);

/**
 * Parses a product description string ("Key: Value | Key: Value | ...") into
 * key-value pairs with Slovak translations, applying variant-specific overrides when a variant is selected.
 *
 * When hasVariants is true:
 *   - 'Parametre' entries are hidden (shown separately from option_tokens)
 *   - 'Product name' is replaced by the selected variant's name
 *   - 'Compatibility codes' is replaced by the selected variant's reference_num (when available)
 *   - 'EAN13' is replaced by 'Kód produktu' using variant/reference code when available
 */
export function buildDescriptionParts(
    description: string,
    hasVariants: boolean,
    selectedVariant?: VariantOverride | null,
    productCode?: string
): DescriptionPart[] {
    return description
        .split(' | ')
        .map((p) => {
            const idx = p.indexOf(': ');
            if (idx === -1) return { key: '', value: p.trim() };

            const key = p.slice(0, idx).trim();
            let value = p.slice(idx + 2).trim();

            // Check if this field should be hidden before processing
            if (hiddenFields.has(key)) {
                return { key: '__HIDDEN__', value: '' };
            }

            let finalKey = key;

            if (key === 'EAN13') {
                finalKey = 'Kód produktu';
                value = selectedVariant?.reference || productCode || value;
            }

            if (hasVariants && selectedVariant) {
                if (key === 'Product name') {
                    value = selectedVariant.name;
                } else if (key === 'Compatibility codes' && selectedVariant.reference_num) {
                    value = selectedVariant.reference_num;
                }
            }

            // Translate key to Slovak
            const translatedKey = fieldNameMap[key] || finalKey;

            return { key: translatedKey, value };
        })
        .filter(
            (p) =>
                p.value &&
                p.key !== '__HIDDEN__' &&
                (hasVariants ? p.key !== 'Parametre' : true)
        )
        .sort((a, b) => {
            // 'Názov produktu' always first; other fields keep their original order
            if (a.key === 'Názov produktu') return -1;
            if (b.key === 'Názov produktu') return 1;
            return 0;
        });
}
