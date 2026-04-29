import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { register } from '../api/auth';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import logoUrl from '../assets/dynamicabutment-logo.png';

const GRAD = 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)';
const NAV_BG = '#020617';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRegisterErrorMessage(error: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    const data = err?.response?.data;
    if (!data) return 'Registrácia zlyhala. Skúste to prosím znova.';

    const firstMessage = (value: unknown): string | null => {
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
        if (typeof value === 'string') return value;
        return null;
    };

    const passwordMsg = firstMessage(data.password) || firstMessage(data.non_field_errors);
    if (passwordMsg) return passwordMsg;

    const emailMsg = firstMessage(data.email);
    if (emailMsg) {
        const normalized = emailMsg.toLowerCase();
        if (normalized.includes('already') || normalized.includes('exists') || normalized.includes('už')) {
            return 'Tento email je už zaregistrovaný. Prihláste sa alebo si resetujte heslo.';
        }
        return emailMsg;
    }

    for (const value of Object.values(data as Record<string, unknown>)) {
        const msg = firstMessage(value);
        if (msg) return msg;
    }

    return 'Registrácia zlyhala. Skúste to prosím znova.';
}

function Requirement({ met, label }: { met: boolean; label: string }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            {met ? (
                <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
                <XCircleIcon className="h-4 w-4 text-slate-300 shrink-0" />
            )}
            <span className={met ? 'text-emerald-700' : 'text-slate-400'}>{label}</span>
        </li>
    );
}

function BrandPanel() {
    return (
        <div
            className="hidden lg:flex flex-col justify-between relative overflow-hidden"
            style={{ flex: 1, background: NAV_BG, padding: '72px 56px 56px' }}
        >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="brand-grid-r" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#06b6d4" strokeWidth="0.8"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#brand-grid-r)" />
            </svg>
            <div style={{ position: 'absolute', top: -120, left: -80, width: 420, height: 420, background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="relative">
                <div className="flex items-center gap-3 mb-14">
                    <img src={logoUrl} alt="Dynamic Abutment" className="h-9 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-white font-extrabold" style={{ fontSize: 42, letterSpacing: '-0.04em', maxWidth: 340, lineHeight: 1.15 }}>
                    Začnite objednávať profesionálne
                </h1>
                <p className="mt-5" style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 320 }}>
                    Vytvorte si účet a získajte prístup k celému katalógu prémiových dentálnych implantátov.
                </p>
                <div className="mt-10 flex flex-col gap-3.5">
                    {[
                        'Registrácia zadarmo za 30 sekúnd',
                        'Členské ceny pre lekárov a kliniky',
                        'Dodanie do 48 hodín po SR',
                    ].map(text => (
                        <div key={text} className="flex items-center gap-2.5">
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓</span>
                            </div>
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative" style={{ borderLeft: '2px solid rgba(16,185,129,0.4)', paddingLeft: 20 }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "Registrácia trvala minútu a hneď som mal prístup k celému katalógu. Odporúčam každej klinike."
                </p>
                <p className="mt-2.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>— MDDr. Jana Horáková, Košice</p>
            </div>
        </div>
    );
}

function MobileHero() {
    return (
        <div className="lg:hidden relative overflow-hidden flex-shrink-0" style={{ background: NAV_BG, padding: '40px 24px 32px' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="m-grid-r" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#06b6d4" strokeWidth="0.7"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#m-grid-r)" />
            </svg>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                    <img src={logoUrl} alt="Dynamic Abutment" className="h-7 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-white font-extrabold" style={{ fontSize: 26, letterSpacing: '-0.04em', lineHeight: 1.2 }}>Nový účet</h1>
                <p className="mt-1.5" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Zaregistrujte sa zadarmo</p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        title: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [firstNameTouched, setFirstNameTouched] = useState(false);
    const [lastNameTouched, setLastNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const firstNameValid = formData.firstName.trim().length > 0;
    const lastNameValid = formData.lastName.trim().length > 0;
    const emailValid = EMAIL_REGEX.test(formData.email);
    const hasMinLength = formData.password.length >= 8;
    const notEntirelyNumeric = formData.password.length > 0 && !/^\d+$/.test(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';
    const canSubmit = firstNameValid && lastNameValid && emailValid && hasMinLength && notEntirelyNumeric && passwordsMatch;

    const passwordStrength = formData.password.length >= 12 ? 4 : formData.password.length >= 10 ? 3 : formData.password.length >= 8 ? 2 : formData.password.length > 0 ? 1 : 0;
    const strengthColor = passwordStrength >= 3 ? '#10b981' : passwordStrength === 2 ? '#f59e0b' : '#ef4444';
    const strengthLabel = passwordStrength < 2 ? 'Slabé' : passwordStrength === 2 ? 'Dobré' : passwordStrength === 3 ? 'Silné' : 'Veľmi silné';

    const mutation = useMutation({
        mutationFn: () => register({
            email: formData.email,
            password: formData.password,
            title: formData.title,
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
        }),
        onSuccess: () => {
            setRegistrationSuccess(true);
        },
        onError: (error: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            console.error('Registration failed', err);
            setErrorMsg(getRegisterErrorMessage(error));
        }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        setFirstNameTouched(true);
        setLastNameTouched(true);
        setEmailTouched(true);
        if (!canSubmit) return;
        mutation.mutate();
    };

    const inputBase = 'h-11 px-3.5 rounded-[10px] border bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition w-full';
    const inputNormal = `${inputBase} border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/10`;
    const inputError = `${inputBase} border-red-400 focus:border-red-500 focus:ring-red-400/10`;
    const inputOk = `${inputBase} border-emerald-400 focus:border-emerald-500 focus:ring-emerald-400/10`;

    return (
        <div className="flex-grow flex min-h-full">
            <BrandPanel />
            <div className="flex-1 flex flex-col lg:items-center lg:justify-center bg-slate-50 overflow-y-auto">
                <MobileHero />
                <div className="w-full lg:max-w-[480px] p-8 lg:px-12 lg:py-10">
                    <div className="hidden lg:block mb-8">
                        <h2 className="text-2xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.04em' }}>Vytvorte si účet</h2>
                        <p className="mt-1.5 text-sm text-slate-500">Zaregistrujte sa zadarmo za 30 sekúnd</p>
                    </div>

                    <div className="flex bg-slate-100 rounded-[10px] p-1 mb-8 gap-1">
                        <Link to="/login" className="flex-1 py-2 text-center rounded-lg text-slate-400 text-sm hover:text-slate-600 transition-colors">
                            Prihlásenie
                        </Link>
                        <div className="flex-1 py-2 text-center rounded-lg bg-white text-slate-900 font-semibold text-sm shadow-sm">
                            Registrácia
                        </div>
                    </div>

                    {registrationSuccess ? (
                        <div className="text-center bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl mb-4" style={{ background: GRAD, boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}>
                                <CheckCircleIcon className="h-7 w-7 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.03em' }}>Skontrolujte si e-mail</h3>
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                Na vami zadanú adresu sme odoslali overovací odkaz. Pre aktiváciu účtu kliknite na odkaz v e-maile.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex justify-center items-center h-11 px-6 rounded-full text-sm font-semibold text-white transition-all"
                                style={{ background: GRAD, boxShadow: '0 4px 16px rgba(6,182,212,0.28)' }}
                            >
                                Prejsť na prihlásenie
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                            {errorMsg && (
                                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                                    <XCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{errorMsg}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="title" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Titul</label>
                                <input
                                    id="title" name="title" type="text"
                                    value={formData.title} onChange={handleChange}
                                    placeholder="napr. MUDr., Ing., Bc."
                                    className={inputNormal}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="firstName" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>
                                        Meno <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="firstName" name="firstName" type="text" required
                                        value={formData.firstName} onChange={handleChange}
                                        onBlur={() => setFirstNameTouched(true)}
                                        placeholder="Ján"
                                        className={firstNameTouched && !firstNameValid ? inputError : inputNormal}
                                    />
                                    {firstNameTouched && !firstNameValid && (
                                        <p className="text-xs text-red-600" role="alert">Zadajte meno.</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="lastName" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>
                                        Priezvisko <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="lastName" name="lastName" type="text" required
                                        value={formData.lastName} onChange={handleChange}
                                        onBlur={() => setLastNameTouched(true)}
                                        placeholder="Novák"
                                        className={lastNameTouched && !lastNameValid ? inputError : inputNormal}
                                    />
                                    {lastNameTouched && !lastNameValid && (
                                        <p className="text-xs text-red-600" role="alert">Zadajte priezvisko.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>
                                    Emailová adresa <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="email" name="email" type="email" required autoComplete="email"
                                        value={formData.email} onChange={handleChange}
                                        onBlur={() => setEmailTouched(true)}
                                        placeholder="jan@priklad.sk"
                                        className={
                                            emailTouched && formData.email
                                                ? emailValid ? inputOk : inputError
                                                : emailTouched && !formData.email ? inputError : inputNormal
                                        }
                                    />
                                    {emailTouched && formData.email && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {emailValid
                                                ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                                                : <XCircleIcon className="h-5 w-5 text-red-400" />
                                            }
                                        </span>
                                    )}
                                </div>
                                {emailTouched && !formData.email && (
                                    <p className="text-xs text-red-600" role="alert">Zadajte emailovú adresu.</p>
                                )}
                                {emailTouched && formData.email && !emailValid && (
                                    <p className="text-xs text-red-600">Zadajte platnú emailovú adresu.</p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="password" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>
                                    Heslo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="password" name="password" type="password" required autoComplete="new-password"
                                    value={formData.password} onChange={handleChange}
                                    onFocus={() => setPasswordTouched(true)}
                                    placeholder="Minimálne 8 znakov"
                                    className={inputNormal}
                                />
                                {formData.password.length > 0 && (
                                    <div className="flex flex-col gap-1.5 mt-0.5">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= passwordStrength ? strengthColor : '#e2e8f0', transition: 'background 0.2s' }} />
                                            ))}
                                        </div>
                                        <span className="text-xs text-slate-400">{strengthLabel} heslo</span>
                                    </div>
                                )}
                                {(passwordTouched || formData.password) && (
                                    <ul className="mt-1 space-y-1 pl-0.5">
                                        <Requirement met={hasMinLength} label="Aspoň 8 znakov" />
                                        <Requirement met={notEntirelyNumeric} label="Nesmie obsahovať iba číslice" />
                                    </ul>
                                )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>
                                    Potvrďte heslo <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password"
                                        value={formData.confirmPassword} onChange={handleChange}
                                        placeholder="Zopakujte heslo"
                                        className={
                                            formData.confirmPassword
                                                ? passwordsMatch ? inputOk : inputError
                                                : inputNormal
                                        }
                                    />
                                    {formData.confirmPassword && (
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {passwordsMatch
                                                ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                                                : <XCircleIcon className="h-5 w-5 text-red-400" />
                                            }
                                        </span>
                                    )}
                                </div>
                                {formData.confirmPassword && !passwordsMatch && (
                                    <p className="text-xs text-red-600">Heslá sa nezhodujú.</p>
                                )}
                            </div>

                            <div className="mt-2">
                                <button
                                    type="submit"
                                    disabled={mutation.isPending || !canSubmit}
                                    className="w-full h-12 rounded-full text-sm font-semibold flex items-center justify-center transition-all disabled:cursor-not-allowed"
                                    style={{
                                        background: !canSubmit || mutation.isPending ? '#e2e8f0' : GRAD,
                                        color: !canSubmit || mutation.isPending ? '#94a3b8' : '#fff',
                                        boxShadow: !canSubmit || mutation.isPending ? 'none' : '0 4px 16px rgba(6,182,212,0.28)',
                                    }}
                                >
                                    {mutation.isPending ? 'Vytváranie účtu…' : 'Vytvoriť účet'}
                                </button>
                            </div>

                            <p className="text-center text-xs text-slate-400 leading-relaxed">
                                Registráciou súhlasíte s{' '}
                                <a href="#" className="text-cyan-600 hover:text-cyan-700">podmienkami používania</a>
                                {' '}a{' '}
                                <a href="#" className="text-cyan-600 hover:text-cyan-700">ochranou osobných údajov</a>.
                            </p>

                            <p className="text-center text-sm text-slate-400">
                                Už máte účet?{' '}
                                <Link to="/login" className="text-cyan-600 font-semibold hover:text-cyan-700">Prihláste sa</Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
