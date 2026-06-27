import type { Product } from '../api/products';

export const getProductPreviewImage = (product: Product): string | null => {
    if (product.image) return product.image;

    if (product.parameters?.type === 'wildcard_group') {
        const firstVariantWithImage = (product.parameters.options || []).find((option) => !!option.image);
        return firstVariantWithImage?.image || null;
    }

    return null;
};
