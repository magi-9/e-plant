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

export const getProduct = async (id: number): Promise<Product> => {
    const response = await client.get<Product>(`/products/${id}/`);
    return response.data;
};
