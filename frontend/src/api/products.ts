import client from './client';

const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:5002/api' : '/api');

const MEDIA_HOST_BASE = API_URL.replace(/\/api\/?$/, '');

const normalizeImageUrl = (image: string | null | undefined): string | null => {
    if (!image) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    if (!image.startsWith('/')) return `${MEDIA_HOST_BASE}/${image}`;
    return `${MEDIA_HOST_BASE}${image}`;
};

const normalizeProductImages = (product: Product): Product => ({
    ...product,
    image: normalizeImageUrl(product.image),
    parameters: product.parameters
        ? {
            ...product.parameters,
            options: product.parameters.options?.map((option) => ({
                ...option,
                image: normalizeImageUrl(option.image),
            })),
        }
        : product.parameters,
});

export interface Product {
    id: number;
    name: string;
    reference?: string;
    description: string;
    category: string;
    all_categories?: string;
    price: string | null;
    stock_quantity: number;
    image: string | null;
    is_visible: boolean;
    group_name?: string | null;
    parameters?: {
        type?: 'single' | 'wildcard_group';
        wildcard_reference?: string;
        masked_reference?: string | null;
        option_fields?: string[];
        option_tokens?: string;
        all_categories?: string;
        parameter_code?: string;
        options?: Array<{
            id?: number;
            reference: string;
            reference_num?: string;
            name: string;
            description?: string;
            category?: string;
            all_categories?: string;
            price?: string | null;
            image?: string | null;
            parameter_code?: string;
            option_tokens?: string;
            label?: string;
            stock_quantity?: number;
        }>;
    };
}

export interface WildcardGroup {
    id: number;
    name: string;
    is_enabled: boolean;
    is_auto_generated: boolean;
    norm_key: string;
    product_count: number;
    created_at: string;
}

export interface GroupingSettings {
    wildcard_grouping_enabled: boolean;
}

export interface ProductListParams {
    search?: string;
    ordering?: string;
    group?: number;
    categories?: string[];
    limit?: number;
    offset?: number;
    is_visible?: boolean;
    stock?: 'in' | 'out';
    admin_view?: '1';
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

interface ProductCountResponse {
    count: number;
}

interface ProductCategoriesResponse {
    categories: string[];
}

export const getProducts = async (params?: ProductListParams): Promise<PaginatedResponse<Product>> => {
    const response = await client.get<PaginatedResponse<Product>>('/products/', { params });
    return {
        ...response.data,
        results: response.data.results.map(normalizeProductImages),
    };
};

export const getProductCount = async (params?: ProductListParams): Promise<number> => {
    const query = new URLSearchParams();

    if (params?.search) query.set('search', params.search);
    if (typeof params?.group === 'number') query.set('group', String(params.group));
    (params?.categories || []).forEach((category) => query.append('categories', category));

    const suffix = query.toString();
    const endpoint = suffix ? `/products/count/?${suffix}` : '/products/count/';
    const response = await client.get<ProductCountResponse>(endpoint);
    return response.data.count;
};

export const getProductCategories = async (): Promise<string[]> => {
    const response = await client.get<ProductCategoriesResponse>('/products/categories/');
    return response.data.categories;
};

export const updateProduct = async (id: number, data: FormData): Promise<Product> => {
    const response = await client.patch<Product>(`/products/admin/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return normalizeProductImages(response.data);
};

export const deleteProduct = async (id: number): Promise<void> => {
    await client.delete(`/products/admin/${id}/delete/`);
};

export const sendProductInquiry = async (productId: number, message: string): Promise<{ success: boolean; message: string }> => {
    const response = await client.post('/products/inquiry/', {
        product_id: productId,
        message,
    });
    return response.data;
};

export const getProduct = async (id: number): Promise<Product> => {
    const response = await client.get<Product>(`/products/${id}/`);
    return normalizeProductImages(response.data);
};

export const createProduct = async (data: FormData): Promise<Product> => {
    const response = await client.post<Product>('/products/admin/create/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return normalizeProductImages(response.data);
};

export const seedDemoData = async (): Promise<{ message: string }> => {
    const response = await client.post('/products/admin/seed/');
    return response.data;
};

export const bulkDeleteProducts = async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await client.post('/products/admin/bulk-delete/', { ids });
    return response.data;
};


export const importProductsCsv = async (file: File): Promise<{ message: string, error?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post('/products/admin/import/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const bulkSetVisibleProducts = async (ids: number[], is_visible: boolean): Promise<{ updated: number }> => {
    const response = await client.post('/products/admin/bulk-set-visible/', { ids, is_visible });
    return response.data;
};

export const getAdminProductIds = async (params?: Omit<ProductListParams, 'limit' | 'offset'>): Promise<number[]> => {
    const response = await client.get<{ ids: number[] }>('/products/admin/all-ids/', { params });
    return response.data.ids;
};

export const getAdminCategories = async (): Promise<string[]> => {
    const response = await client.get<{ categories: string[] }>('/products/admin/categories/');
    return response.data.categories;
};

// Grouping settings
export const getGroupingSettings = async (): Promise<GroupingSettings> => {
    const response = await client.get<GroupingSettings>('/products/admin/grouping-settings/');
    return response.data;
};

export const updateGroupingSettings = async (data: Partial<GroupingSettings>): Promise<GroupingSettings> => {
    const response = await client.patch<GroupingSettings>('/products/admin/grouping-settings/', data);
    return response.data;
};

// Wildcard groups
export const getWildcardGroups = async (): Promise<WildcardGroup[]> => {
    const response = await client.get<WildcardGroup[]>('/products/admin/wildcard-groups/');
    return response.data;
};

export const updateWildcardGroup = async (id: number, data: Partial<Pick<WildcardGroup, 'name' | 'is_enabled'>>): Promise<WildcardGroup> => {
    const response = await client.patch<WildcardGroup>(`/products/admin/wildcard-groups/${id}/`, data);
    return response.data;
};

export const syncWildcardGroups = async (): Promise<{ created: number; updated: number; deleted: number }> => {
    const response = await client.post<{ created: number; updated: number; deleted: number }>('/products/admin/wildcard-groups/sync/');
    return response.data;
};

export const getWildcardGroupProducts = async (groupId: number): Promise<Product[]> => {
    const response = await client.get<Product[]>(`/products/admin/wildcard-groups/${groupId}/products/`);
    return response.data.map(normalizeProductImages);
};

export const addProductsToWildcardGroup = async (groupId: number, productIds: number[]): Promise<{ updated: number }> => {
    const response = await client.post(`/products/admin/wildcard-groups/${groupId}/add-products/`, { product_ids: productIds });
    return response.data;
};

export const removeProductsFromWildcardGroup = async (groupId: number, productIds: number[]): Promise<{ updated: number }> => {
    const response = await client.post(`/products/admin/wildcard-groups/${groupId}/remove-products/`, { product_ids: productIds });
    return response.data;
};
