import client from './client';

export interface GlobalSettings {
    warehouse_email: string;
    low_stock_threshold: number;
    currency: string;
    shipping_cost: string;
}

export const getGlobalSettings = async (): Promise<GlobalSettings> => {
    const response = await client.get<GlobalSettings>('/auth/settings/');
    return response.data;
};

export const updateGlobalSettings = async (data: Partial<GlobalSettings>): Promise<GlobalSettings> => {
    const response = await client.patch<GlobalSettings>('/auth/settings/', data);
    return response.data;
};
