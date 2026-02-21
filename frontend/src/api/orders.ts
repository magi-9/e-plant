import client from './client';

export interface OrderItem {
    product_id: number;
    quantity: number;
}

export interface CreateOrderData {
    customer_name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postal_code: string;
    shipping_address?: string;
    is_company: boolean;
    company_name?: string;
    ico?: string;
    dic?: string;
    payment_method: 'bank_transfer' | 'card';
    notes?: string;
    items: OrderItem[];
}

export interface Order {
    id: number;
    order_number: string;
    customer_name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postal_code: string;
    shipping_address: string;
    is_company: boolean;
    company_name: string;
    ico: string;
    dic: string;
    payment_method: string;
    status: string;
    total_price: string;
    notes: string;
    items: Array<{
        id: number;
        product: number;
        product_name: string;
        quantity: number;
        price_snapshot: string;
        subtotal: string;
    }>;
    created_at: string;
    updated_at: string;
}

export const createOrder = async (data: CreateOrderData): Promise<Order> => {
    const response = await client.post<Order>('/orders/', data);
    return response.data;
};

export const getMyOrders = async (): Promise<Order[]> => {
    const response = await client.get<Order[]>('/orders/my/');
    return response.data;
};

export const getOrderDetail = async (id: string): Promise<Order> => {
    const response = await client.get<Order>(`/orders/${id}/`);
    return response.data;
};

export const getAdminOrders = async (): Promise<Order[]> => {
    const response = await client.get<Order[]>('/orders/admin/orders/');
    return response.data;
};

export const updateAdminOrderStatus = async (id: number, status: string): Promise<Order> => {
    const response = await client.patch<Order>(`/orders/admin/orders/${id}/`, { status });
    return response.data;
};
