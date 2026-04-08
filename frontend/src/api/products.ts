import client from './client';

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
    is_active: boolean;
    is_visible: boolean;
    group_name?: string | null;
    parameters?: {
        type?: 'single' | 'wildcard_group';
        wildcard_reference?: string;
        option_fields?: string[];
        option_tokens?: string;
        all_categories?: string;
        parameter_code?: string;
        options?: Array<{
            reference: string;
            reference_num?: string;
            name: string;
            parameter_code?: string;
            option_tokens?: string;
            label?: string;
        }>;
    };
}

export interface ProductListParams {
    search?: string;
    ordering?: string;
    group?: number;
    limit?: number;
    offset?: number;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export const getProducts = async (params?: ProductListParams): Promise<PaginatedResponse<Product>> => {
    const response = await client.get<PaginatedResponse<Product>>('/products/', { params });
    return response.data;
};

export const updateProduct = async (id: number, data: FormData): Promise<Product> => {
    const response = await client.patch<Product>(`/products/admin/${id}/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
    await client.delete(`/products/admin/${id}/delete/`);
};

export const getProduct = async (id: number): Promise<Product> => {
    const response = await client.get<Product>(`/products/${id}/`);
    return response.data;
};

export const createProduct = async (data: FormData): Promise<Product> => {
    const response = await client.post<Product>('/products/admin/create/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const seedDemoData = async (): Promise<{ message: string }> => {
    const response = await client.post('/products/admin/seed/');
    return response.data;
};

export const bulkDeleteProducts = async (ids: number[]): Promise<{ deleted: number }> => {
    const response = await client.post('/products/admin/bulk-delete/', { ids });
    return response.data;
};

export const bulkSetActiveProducts = async (ids: number[], is_active: boolean): Promise<{ updated: number }> => {
    const response = await client.post('/products/admin/bulk-set-active/', { ids, is_active });
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
