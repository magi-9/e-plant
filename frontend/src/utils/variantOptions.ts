type VariantOption = {
    reference?: string;
    label?: string;
    name?: string;
    parameter_code?: string;
    option_tokens?: string;
};

const collator = new Intl.Collator('sk', { numeric: true, sensitivity: 'base' });

export const getFirstOptionTokenValue = (option: VariantOption): string => {
    const firstToken = (option.option_tokens || '').split('|').find((token) => token.includes(':'));
    if (!firstToken) return '';
    return firstToken.slice(firstToken.indexOf(':') + 1).trim();
};

export const sortByFirstOptionTokenValue = <T extends VariantOption>(options: T[]): T[] => {
    return [...options].sort((a, b) => {
        const firstValue = getFirstOptionTokenValue(a);
        const secondValue = getFirstOptionTokenValue(b);

        if (firstValue && secondValue) {
            const valueCompare = collator.compare(firstValue, secondValue);
            if (valueCompare !== 0) return valueCompare;
        } else if (firstValue || secondValue) {
            return firstValue ? -1 : 1;
        }

        return collator.compare(
            a.reference || a.label || a.parameter_code || a.name || '',
            b.reference || b.label || b.parameter_code || b.name || ''
        );
    });
};
