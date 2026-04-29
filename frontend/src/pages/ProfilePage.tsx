import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, deleteMe, changePassword, isAdmin } from '../api/auth';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { ProfileSidebar } from '../components/ProfileSidebar';
import MobileProfileOrdersTabs from '../components/MobileProfileOrdersTabs';

// ── section card ─────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

// ── field ────────────────────────────────────────────────────

function Field({
    label, value, onChange, type = 'text', placeholder, readOnly, half, autoComplete,
}: {
    label: string; value: string; onChange?: (v: string) => void;
    type?: string; placeholder?: string; readOnly?: boolean; half?: boolean; autoComplete?: string;
}) {
    return (
        <div className={half ? 'flex-1 min-w-0' : 'w-full'}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                readOnly={readOnly}
                placeholder={placeholder}
                autoComplete={autoComplete}
                onChange={e => onChange?.(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all
                    ${readOnly
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-default'
                        : 'bg-white border-slate-200 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                    }`}
            />
        </div>
    );
}

// ── gradient button ──────────────────────────────────────────

function GBtn({
    children, onClick, outline, disabled, full, type = 'button', icon,
}: {
    children: React.ReactNode; onClick?: () => void; outline?: boolean;
    disabled?: boolean; full?: boolean; type?: 'button' | 'submit'; icon?: React.ReactNode;
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all
                ${full ? 'w-full' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${outline
                    ? 'border border-cyan-500 text-cyan-600 bg-transparent hover:bg-cyan-50'
                    : 'text-white shadow-[0_4px_14px_rgba(6,182,212,0.22)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.35)]'
                }`}
            style={outline ? undefined : { background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}
        >
            {icon}{children}
        </button>
    );
}

// ── main page ────────────────────────────────────────────────

export default function ProfilePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const isUserAdmin = isAdmin();
    useEffect(() => {
        if (isUserAdmin) navigate('/admin', { replace: true });
    }, [navigate, isUserAdmin]);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [savedProfile, setSavedProfile] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);

    const { data: userProfile, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: !isUserAdmin,
    });

    const [formData, setFormData] = useState({
        title: '',
        first_name: '',
        last_name: '',
        phone: '',
        street: '',
        city: '',
        postal_code: '',
        country: '',
        is_company: false,
        company_name: '',
        ico: '',
        dic: '',
        dic_dph: '',
    });

    useEffect(() => {
        if (userProfile) {
            setFormData({
                title: userProfile.title || '',
                first_name: userProfile.first_name || '',
                last_name: userProfile.last_name || '',
                phone: userProfile.phone || '',
                street: userProfile.street || '',
                city: userProfile.city || '',
                postal_code: userProfile.postal_code || '',
                country: userProfile.country || '',
                is_company: userProfile.is_company || false,
                company_name: userProfile.company_name || '',
                ico: userProfile.ico || '',
                dic: userProfile.dic || '',
                dic_dph: userProfile.dic_dph || '',
            });
        }
    }, [userProfile]);

    const set = (field: keyof typeof formData) => (v: string) =>
        setFormData(prev => ({ ...prev, [field]: v }));

    const updateProfile = async (data: typeof formData) => {
        const response = await client.patch('/auth/me/', data);
        return response.data;
    };

    const mutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            setSavedProfile(true);
            setTimeout(() => setSavedProfile(false), 2500);
        },
        onError: () => toast.error('Chyba pri ukladaní profilu.'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMe,
        onSuccess: () => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            queryClient.clear();
            toast.success('Váš účet bol úspešne a natrvalo vymazaný.');
            navigate('/');
            window.location.reload();
        },
        onError: () => {
            toast.error('Chyba pri vymazávaní účtu.');
            setIsDeleteModalOpen(false);
        },
    });

    const handlePasswordChange = async () => {
        if (!pwForm.current || !pwForm.next) {
            toast.error('Zadajte aktuálne aj nové heslo.');
            return;
        }
        if (pwForm.next !== pwForm.confirm) {
            toast.error('Nové heslá sa nezhodujú.');
            return;
        }
        setPwLoading(true);
        try {
            await changePassword(pwForm.current, pwForm.next);
            toast.success('Heslo bolo úspešne zmenené.');
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            const msg = isAxiosError(err) ? err.response?.data?.error : null;
            toast.error(msg || 'Chyba pri zmene hesla.');
        } finally {
            setPwLoading(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-400 text-sm">Načítavam dáta...</div>;

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <nav className="hidden md:flex items-center gap-2 mb-6 text-xs text-slate-400">
                    <Link to="/" className="hover:text-slate-600 transition-colors">Domov</Link>
                    <svg width="5" height="8" viewBox="0 0 6 10"><path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                    <span className="text-slate-700 font-medium">Môj profil</span>
                </nav>

                <MobileProfileOrdersTabs active="profile" />

                <div className="flex gap-6 items-start">
                    <ProfileSidebar active="profile" />

                    <div className="flex-1 min-w-0">
                        <form onSubmit={e => { e.preventDefault(); mutation.mutate(formData); }}>
                            {/* Personal info */}
                            <SectionCard title="Osobné údaje" subtitle="Základné informácie o vašom účte">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-3 sm:gap-4">
                                        <Field label="Titul" value={formData.title} onChange={set('title')} half />
                                        <Field label="Meno" value={formData.first_name} onChange={set('first_name')} half />
                                        <Field label="Priezvisko" value={formData.last_name} onChange={set('last_name')} half />
                                    </div>
                                    <div className="flex flex-wrap gap-3 sm:gap-4">
                                        <Field label="E-mail" value={userProfile?.email || ''} readOnly half />
                                        <Field label="Telefón" value={formData.phone} onChange={set('phone')} type="tel" half />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Address */}
                            <SectionCard title="Fakturačná adresa" subtitle="Adresa pre vystavovanie faktúr">
                                <div className="space-y-4">
                                    <Field label="Ulica a číslo" value={formData.street} onChange={set('street')} />
                                    <div className="flex flex-wrap gap-3 sm:gap-4">
                                        <Field label="Mesto" value={formData.city} onChange={set('city')} half />
                                        <Field label="PSČ" value={formData.postal_code} onChange={set('postal_code')} half />
                                        <Field label="Krajina" value={formData.country} onChange={set('country')} half />
                                    </div>

                                    {/* Company toggle */}
                                    <div className="pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div
                                                onClick={() => setFormData(prev => ({ ...prev, is_company: !prev.is_company }))}
                                                className={`w-11 h-6 rounded-full relative transition-all cursor-pointer ${formData.is_company ? '' : 'bg-slate-200'}`}
                                                style={formData.is_company ? { background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' } : undefined}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${formData.is_company ? 'left-5' : 'left-0.5'}`} />
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">Nakupujem na firmu</span>
                                        </label>
                                    </div>

                                    {formData.is_company && (
                                        <div className="space-y-4 pt-1">
                                            <Field label="Názov firmy" value={formData.company_name} onChange={set('company_name')} />
                                            <div className="flex flex-wrap gap-3 sm:gap-4">
                                                <Field label="IČO" value={formData.ico} onChange={set('ico')} half />
                                                <Field label="DIČ" value={formData.dic} onChange={set('dic')} half />
                                                <Field label="IČ DPH" value={formData.dic_dph} onChange={set('dic_dph')} half />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>

                            {/* Save profile */}
                            <div className="flex justify-between items-center mb-5">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(true)}
                                    className="text-sm text-red-500 font-medium hover:text-red-700 transition-colors px-1"
                                >
                                    Zabudnúť ma (zmazať účet)
                                </button>
                                <div className="flex items-center gap-3">
                                    {savedProfile && (
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            Zmeny boli uložené
                                        </span>
                                    )}
                                    <GBtn type="submit" disabled={mutation.isPending} icon={
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13"/><polyline points="7 3 7 8 15 8"/></svg>
                                    }>
                                        {mutation.isPending ? 'Ukladám...' : 'Uložiť zmeny'}
                                    </GBtn>
                                </div>
                            </div>
                        </form>

                        {/* Password section — separate form */}
                        <SectionCard title="Heslo" subtitle="Zmeňte si prihlasovacie heslo">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-3 sm:gap-4">
                                    <Field label="Aktuálne heslo" type="password" value={pwForm.current} onChange={v => setPwForm(p => ({ ...p, current: v }))} placeholder="••••••••" half autoComplete="current-password" />
                                    <Field label="Nové heslo" type="password" value={pwForm.next} onChange={v => setPwForm(p => ({ ...p, next: v }))} placeholder="••••••••" half autoComplete="new-password" />
                                </div>
                                <div className="flex flex-wrap gap-3 sm:gap-4">
                                    <Field label="Potvrďte nové heslo" type="password" value={pwForm.confirm} onChange={v => setPwForm(p => ({ ...p, confirm: v }))} placeholder="••••••••" half autoComplete="new-password" />
                                    <div className="flex-1 flex items-end">
                                        <GBtn onClick={handlePasswordChange} disabled={pwLoading}>
                                            {pwLoading ? 'Mením...' : 'Zmeniť heslo'}
                                        </GBtn>
                                    </div>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </div>

            {/* Delete account modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60" onClick={() => setIsDeleteModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Naozaj vymazať účet?</h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    Táto akcia natrvalo vymaže váš účet, osobné údaje a históriu objednávok. Akcia je <strong>nevratná</strong>.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Zrušiť
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? 'Mažem...' : 'Áno, natrvalo vymazať'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
