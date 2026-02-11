import client from './client';

export interface Product {
    id: number;
    name: string;
    description: string;
    category: string;
    price: string | null;
    stock_quantity: number;
    image: string | null;
}

export const getProducts = async (): Promise<Product[]> => {
    const response = await client.get<Product[]>('/products/');
    return response.data;
};

export const updateProduct = async (id: number, data: Partial<Product>): Promise<Product> => {
    const response = await client.patch<Product>(`/products/admin/${id}/`, data);
    return response.data;
};

export const deleteProduct = async (id: number): Promise<void> => {
    await client.delete(`/products/admin/${id}/delete/`);
};

export const getProduct = async (id: number): Promise<Product> => {
    const response = await client.get<Product>(`/products/${id}/`);
    return response.data;
};
