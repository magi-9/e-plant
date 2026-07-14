const SEO_SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

export const PRODUCT_SEO_BRAND = 'Dynamic Abutment Solutions';
export const PRODUCT_SEO_SELLER_NAME = 'Ebringer';

const stripMarkup = (value: string): string =>
    value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const truncate = (value: string, maxLength: number): string => {
    if (value.length <= maxLength) return value;
    const clipped = value.slice(0, maxLength - 1).trimEnd();
    const lastSpace = clipped.lastIndexOf(' ');
    return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
};

const toAbsoluteUrl = (url: string | null | undefined, siteUrl = SEO_SITE_URL): string | null => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const base = siteUrl.replace(/\/+$/, '');
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
};

export function buildProductDetailSeo({
    id,
    name,
    reference,
    description,
    category,
    allCategories,
    image,
    price,
    inStock,
    siteUrl = SEO_SITE_URL,
}: {
    id: number;
    name: string;
    reference?: string;
    description?: string;
    category?: string;
    allCategories?: string;
    image?: string | null;
    price?: string | null;
    inStock?: boolean;
    siteUrl?: string;
}) {
    const cleanName = stripMarkup(name);
    const cleanReference = stripMarkup(reference || '');
    const cleanCategory = stripMarkup(category || allCategories || '');
    const canonicalUrl = `${siteUrl.replace(/\/+$/, '')}/products/${id}`;
    const title = truncate(
        [cleanName, cleanReference].filter(Boolean).join(' | ') || `${PRODUCT_SEO_BRAND} product`,
        68
    );
    const titleWithBrand = `${title} | ${PRODUCT_SEO_SELLER_NAME}`;
    const fallbackDescription = [
        cleanName,
        cleanReference ? `reference ${cleanReference}` : '',
        cleanCategory ? `in ${cleanCategory}` : '',
        `${PRODUCT_SEO_BRAND} implant component from ${PRODUCT_SEO_SELLER_NAME}.`,
    ].filter(Boolean).join(' ');
    const metaDescription = truncate(
        stripMarkup(description || fallbackDescription),
        158
    );
    const absoluteImage = toAbsoluteUrl(image, siteUrl);
    const offers = price
        ? {
            '@type': 'Offer',
            priceCurrency: 'EUR',
            price,
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: canonicalUrl,
            seller: {
                '@type': 'Organization',
                name: PRODUCT_SEO_SELLER_NAME,
            },
        }
        : undefined;

    return {
        title: titleWithBrand,
        metaDescription,
        canonicalUrl,
        absoluteImage,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: cleanName,
            sku: cleanReference || undefined,
            mpn: cleanReference || undefined,
            image: absoluteImage ? [absoluteImage] : undefined,
            description: metaDescription,
            category: cleanCategory || undefined,
            brand: {
                '@type': 'Brand',
                name: PRODUCT_SEO_BRAND,
            },
            offers,
        },
    };
}
