import { describe, expect, it } from 'vitest';
import { buildProductDetailSeo } from '../utils/productSeo';

describe('buildProductDetailSeo', () => {
    it('builds product-specific metadata for detail pages', () => {
        const seo = buildProductDetailSeo({
            id: 9793,
            name: 'Dynamic TiBase DAS Multi-Unit NR G0.5',
            reference: '31.312.209.01-2',
            category: 'MULTI-UNIT',
            description: '',
            image: '/media/products/31312209012.jpg',
            price: '46.67',
            inStock: true,
            siteUrl: 'https://dynamicabutment.ebringer.sk',
        });

        expect(seo.title).toBe('Dynamic TiBase DAS Multi-Unit NR G0.5 | 31.312.209.01-2 | Ebringer');
        expect(seo.canonicalUrl).toBe('https://dynamicabutment.ebringer.sk/products/9793');
        expect(seo.metaDescription).toContain('Dynamic TiBase DAS Multi-Unit NR G0.5');
        expect(seo.metaDescription).toContain('reference 31.312.209.01-2');
        expect(seo.absoluteImage).toBe('https://dynamicabutment.ebringer.sk/media/products/31312209012.jpg');
        expect(seo.jsonLd).toMatchObject({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Dynamic TiBase DAS Multi-Unit NR G0.5',
            sku: '31.312.209.01-2',
            mpn: '31.312.209.01-2',
            category: 'MULTI-UNIT',
            brand: {
                '@type': 'Brand',
                name: 'Dynamic Abutment Solutions',
            },
            offers: {
                '@type': 'Offer',
                priceCurrency: 'EUR',
                price: '46.67',
                availability: 'https://schema.org/InStock',
                url: 'https://dynamicabutment.ebringer.sk/products/9793',
            },
        });
    });

    it('keeps long descriptions within search-snippet length', () => {
        const seo = buildProductDetailSeo({
            id: 1,
            name: 'Very Long Product',
            description: 'A'.repeat(240),
            siteUrl: 'https://dynamicabutment.ebringer.sk',
        });

        expect(seo.metaDescription.length).toBeLessThanOrEqual(158);
        expect(seo.metaDescription.endsWith('…')).toBe(true);
    });
});
