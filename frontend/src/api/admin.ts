import client from './client';
import type { Order } from './orders';

export const getAdminOrders = async (): Promise<Order[]> => {
    const response = await client.get<Order[]>('/orders/admin/orders/');
    return response.data;
};

export const updateOrderStatus = async (orderId: number, data: { status: string }): Promise<Order> => {
    const response = await client.patch<Order>(`/orders/admin/orders/${orderId}/`, data);
    return response.data;
};
