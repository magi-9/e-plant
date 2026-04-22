import type { GlobalSettings } from '../api/settings';

const FALLBACK_EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN || 'example.com';
const FALLBACK_COMPANY_EMAIL = `martin@${FALLBACK_EMAIL_DOMAIN}`;
const FALLBACK_WAREHOUSE_EMAIL = `warehouse@${FALLBACK_EMAIL_DOMAIN}`;

export type CompanyProfile = {
    companyName: string;
    companyStreet: string;
    companyCity: string;
    companyPostalCode: string;
    companyState: string;
    companyIco: string;
    companyDic: string;
    companyVatId: string;
    companyPhone: string;
    companyEmail: string;
    warehouseEmail: string;
    fullAddress: string;
};

export function getCompanyProfile(settings?: Partial<GlobalSettings>): CompanyProfile {
    const companyName = (settings?.company_name || '').trim() || 'E-Plant';
    const companyStreet = (settings?.company_street || '').trim();
    const companyCity = (settings?.company_city || '').trim();
    const companyPostalCode = (settings?.company_postal_code || '').trim();
    const companyState = (settings?.company_state || '').trim() || 'Slovensko';
    const companyIco = (settings?.company_ico || '').trim();
    const companyDic = (settings?.company_dic || '').trim();
    const companyVatId = (settings?.company_vat_id || '').trim();
    const companyPhone = (settings?.company_phone || '').trim();
    const companyEmail = (settings?.company_email || '').trim() || FALLBACK_COMPANY_EMAIL;
    const warehouseEmail =
        (settings?.warehouse_email || '').trim() || FALLBACK_WAREHOUSE_EMAIL;

    const addressParts = [companyStreet, `${companyPostalCode} ${companyCity}`.trim(), companyState]
        .map((part) => part.trim())
        .filter(Boolean);

    return {
        companyName,
        companyStreet,
        companyCity,
        companyPostalCode,
        companyState,
        companyIco,
        companyDic,
        companyVatId,
        companyPhone,
        companyEmail,
        warehouseEmail,
        fullAddress: addressParts.join(', '),
    };
}
