import client from './client';

export interface GlobalSettings {
    warehouse_email: string;
    low_stock_threshold: number;
    currency: string;
    shipping_cost: string;
    vat_rate: string;
    pickup_address: string;
    opening_hours: string;
    // Company / seller info (printed on invoices)
    company_name: string;
    company_ico: string;
    company_dic: string;
    company_street: string;
    company_city: string;
    company_postal_code: string;
    company_state: string;
    company_phone: string;
    company_email: string;
    iban: string;
    bank_name: string;
    bank_swift: string;
}

export const getGlobalSettings = async (): Promise<GlobalSettings> => {
    const response = await client.get<GlobalSettings>('/auth/settings/');
    return response.data;
};

export const updateGlobalSettings = async (data: Partial<GlobalSettings>): Promise<GlobalSettings> => {
    const response = await client.patch<GlobalSettings>('/auth/settings/', data);
    return response.data;
};

export interface PaymentSettings {
    iban: string;
    bank_name: string;
    bank_swift: string;
}

export const getPaymentSettings = async (): Promise<PaymentSettings> => {
    const response = await client.get<GlobalSettings>('/auth/settings/');
    const { iban, bank_name, bank_swift } = response.data;
    return { iban, bank_name, bank_swift };
};

export interface TopProduct {
    product_id: number;
    name: string;
    total_qty: number;
    total_revenue: number;
}

export interface OrderStats {
    period_days: number;
    total_orders: number;
    paid_orders: number;
    unpaid_orders: number;
    avg_basket: number;
    top_products: TopProduct[];
}

export const getOrderStats = async (days: 7 | 30 | 90 = 30): Promise<OrderStats> => {
    const response = await client.get<OrderStats>(`/orders/admin/stats/?days=${days}`);
    return response.data;
};
