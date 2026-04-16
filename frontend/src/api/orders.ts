import client from './client';

export interface OrderItem {
    product_id: number;
    quantity: number;
}

export interface AdminInterventionOrderItem {
    product_id: number;
    quantity: number;
}

export interface BatchAllocation {
    batch_number: string;
    quantity: number;
}

export interface CreateOrderData {
    customer_name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postal_code: string;
    country: string;
    shipping_address?: string;
    is_company: boolean;
    company_name?: string;
    ico?: string;
    dic?: string;
    dic_dph?: string;
    is_vat_payer: boolean;
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
    country: string;
    shipping_address: string;
    is_company: boolean;
    company_name: string;
    ico: string;
    dic: string;
    dic_dph: string;
    is_vat_payer: boolean;
    payment_method: string;
    status: string;
    total_price: string;
    shipping_cost: string;
    shipping_carrier: string;
    notes: string;
    items: Array<{
        id: number;
        product: number;
        product_name: string;
        quantity: number;
        price_snapshot: string;
        subtotal: string;
        batch_allocations: BatchAllocation[];
    }>;
    created_at: string;
    updated_at: string;
}

interface PaginatedOrdersResponse {
    results: Order[];
}

export const createOrder = async (data: CreateOrderData): Promise<Order> => {
    const response = await client.post<Order>('/orders/', data);
    return response.data;
};

export const getMyOrders = async (): Promise<Order[]> => {
    const response = await client.get<Order[] | PaginatedOrdersResponse>('/orders/my/');
    const payload = response.data;

    if (Array.isArray(payload)) {
        return payload;
    }

    return payload.results || [];
};

export const getOrderDetail = async (id: string): Promise<Order> => {
    const response = await client.get<Order>(`/orders/${id}/`);
    return response.data;
};

export const getAdminOrders = async (): Promise<Order[]> => {
    const response = await client.get<Order[]>('/orders/admin/orders/');
    return response.data;
};

export interface StockReceiptData {
    product_id: number;
    batch_number: string;
    quantity: number;
    notes?: string;
    variant_reference?: string;
}

export interface StockReceiptResult {
    message: string;
    product_id: number;
    new_stock_quantity: number;
}

export const receiveStock = async (data: StockReceiptData): Promise<StockReceiptResult> => {
    const response = await client.post<StockReceiptResult>('/orders/admin/stock-receipts/', data);
    return response.data;
};

export const updateOrderStatus = async (id: number, orderStatus: string): Promise<Order> => {
    const response = await client.patch<Order>(`/orders/admin/orders/${id}/`, { status: orderStatus });
    return response.data;
};

export interface AdminOrderInterventionUpdateData {
    reason: string;
    status: string;
    notes: string;
    customer_name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postal_code: string;
    country: string;
    is_company: boolean;
    company_name: string;
    ico: string;
    dic: string;
    dic_dph: string;
    is_vat_payer: boolean;
    payment_method: 'bank_transfer' | 'card';
    items: AdminInterventionOrderItem[];
}

export const adminInterventionUpdateOrder = async (
    id: number,
    data: AdminOrderInterventionUpdateData
): Promise<Order> => {
    const response = await client.patch<Order>(`/orders/admin/orders/${id}/intervention/`, data);
    return response.data;
};

export const adminInterventionDeleteOrder = async (
    id: number,
    reason: string
): Promise<void> => {
    await client.delete(`/orders/admin/orders/${id}/intervention-delete/`, {
        data: { reason }
    });
};


