import client from './client';
import type { Order } from './orders';

export const getAdminOrders = async (): Promise<Order[]> => {
    const response = await client.get<Order[]>('/orders/admin/orders/');
    return response.data;
};


