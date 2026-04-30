import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { login, register } from '../api/auth';
import { authService } from '../api/authService';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowPathIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import logoUrl from '../assets/dynamicabutment-logo.png';

const GRAD = 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)';
const NAV_BG = '#020617';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── shared atoms ────────────────────────────────────────────────

function GradButton({ children, disabled, loading }: { children: React.ReactNode; disabled?: boolean; loading?: boolean }) {
    return (
        <button
            type="submit"
            disabled={disabled || loading}
            className="w-full h-12 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
            style={{
                background: disabled || loading ? '#e2e8f0' : GRAD,
                color: disabled || loading ? '#94a3b8' : '#fff',
                boxShadow: disabled || loading ? 'none' : '0 4px 16px rgba(6,182,212,0.28)',
            }}
        >
            {loading && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            {met
                ? <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                : <XCircleIcon className="h-4 w-4 text-slate-300 shrink-0" />}
            <span className={met ? 'text-emerald-700' : 'text-slate-400'}>{label}</span>
        </li>
    );
}

const inputBase = 'h-11 px-3.5 rounded-[10px] border bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition w-full';
const iNormal = `${inputBase} border-slate-200 focus:border-cyan-500 focus:ring-cyan-500/10`;
const iError  = `${inputBase} border-red-400   focus:border-red-500   focus:ring-red-400/10`;
const iOk     = `${inputBase} border-emerald-400 focus:border-emerald-500 focus:ring-emerald-400/10`;

// ── brand panels ────────────────────────────────────────────────

function BrandPanel({ isLogin }: { isLogin: boolean }) {
    const accent = isLogin ? 'rgba(6,182,212,0.18)' : 'rgba(16,185,129,0.15)';
    const checkColor = isLogin ? '#06b6d4' : '#10b981';
    const content = isLogin
        ? {
            title: 'Váš partner pre dentálne implantáty',
            subtitle: 'Profesionálny B2B portál pre zubných lekárov a kliniky. Rýchle objednávky, overené produkty.',
            items: ['500+ prémiových produktov', 'Kompatibilita Straumann, Nobel, Zimmer...', 'Dodanie do SR a ČR'],
            quote: '""',
            author: '',
        }
        : {
            title: 'Začnite objednávať online',
            subtitle: 'Vytvorte si účet a získajte prístup k celému katalógu dentálnych implantátov.',
            items: ['Registrácia zadarmo za 30 sekúnd', 'Prehľad nad objednávkami a faktúrami', 'Dodanie do SR a ČR'],
            quote: '""',
            author: '',
        };

    return (
        <div
            className="hidden lg:flex flex-col justify-between relative overflow-hidden"
            style={{ flex: 1, background: NAV_BG, padding: '72px 56px 56px' }}
        >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="auth-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#06b6d4" strokeWidth="0.8"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#auth-grid)" />
            </svg>
            <div style={{ position: 'absolute', top: -120, left: -80, width: 420, height: 420, background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, pointerEvents: 'none' }} />

            <div className="relative">
                <div className="flex items-center gap-3 mb-14">
                    <img src={logoUrl} alt="Dynamic Abutment" className="h-9 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-white font-extrabold" style={{ fontSize: 42, letterSpacing: '-0.04em', maxWidth: 340, lineHeight: 1.15 }}>
                    {content.title}
                </h1>
                <p className="mt-5" style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 320 }}>
                    {content.subtitle}
                </p>
                <div className="mt-10 flex flex-col gap-3.5">
                    {content.items.map(text => (
                        <div key={text} className="flex items-center gap-2.5">
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: checkColor, fontWeight: 700 }}>✓</span>
                            </div>
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* <div className="relative" style={{ borderLeft: `2px solid ${isLogin ? 'rgba(6,182,212,0.4)' : 'rgba(16,185,129,0.4)'}`, paddingLeft: 20 }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>{content.quote}</p>
                <p className="mt-2.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{content.author}</p>
            </div> */}
        </div>
    );
}

function MobileHero({ isLogin }: { isLogin: boolean }) {
    const glowColor = isLogin ? 'rgba(6,182,212,0.2)' : 'rgba(16,185,129,0.18)';
    return (
        <div className="lg:hidden relative overflow-hidden flex-shrink-0" style={{ background: NAV_BG, padding: '40px 24px 32px' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="auth-m-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#06b6d4" strokeWidth="0.7"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#auth-m-grid)" />
            </svg>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                    <img src={logoUrl} alt="Dynamic Abutment" className="h-7 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-white font-extrabold" style={{ fontSize: 26, letterSpacing: '-0.04em', lineHeight: 1.2 }}>
                    {isLogin ? 'Vitajte späť' : 'Nový účet'}
                </h1>
                <p className="mt-1.5" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    {isLogin ? 'Prihláste sa do svojho účtu' : 'Zaregistrujte sa zadarmo'}
                </p>
            </div>
        </div>
    );
}

// ── login form ───────────────────────────────────────────────────

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState('');

    const mutation = useMutation({
        mutationFn: () => login(email, password),
        onSuccess: (data) => {
            authService.setUserMeta({ is_staff: data.is_staff, email: data.email });
            navigate('/products');
        },
        onError: () => setErrorMsg('Nesprávny email alebo heslo'),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        mutation.mutate();
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                    <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>E-mail</label>
                <input id="login-email" name="email" type="email" required autoFocus
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="vas@email.com" className={iNormal} />
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Heslo</label>
                <input id="login-password" name="password" type="password" required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className={iNormal} />
                <div className="text-right mt-0.5">
                    <Link to="/forgot-password" className="text-xs text-cyan-600 font-medium hover:text-cyan-700">Zabudnuté heslo?</Link>
                </div>
            </div>
            <div className="mt-2">
                <GradButton loading={mutation.isPending}>
                    {mutation.isPending ? 'Prihlasovanie...' : 'Prihlásiť sa'}
                </GradButton>
            </div>
            <p className="text-center text-sm text-slate-400">
                Nemáte účet?{' '}
                <Link to="/register" className="text-cyan-600 font-semibold hover:text-cyan-700">Zaregistrujte sa</Link>
            </p>
        </form>
    );
}

// ── register form ────────────────────────────────────────────────

function getRegisterErrorMessage(error: unknown): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (error as any)?.response?.data;
    if (!data) return 'Registrácia zlyhala. Skúste to prosím znova.';
    const first = (v: unknown): string | null =>
        Array.isArray(v) && typeof v[0] === 'string' ? v[0] : typeof v === 'string' ? v : null;
    const msg = first(data.password) || first(data.non_field_errors);
    if (msg) return msg;
    const emailMsg = first(data.email);
    if (emailMsg) {
        const n = emailMsg.toLowerCase();
        return (n.includes('already') || n.includes('exists') || n.includes('už'))
            ? 'Tento email je už zaregistrovaný. Prihláste sa alebo si resetujte heslo.'
            : emailMsg;
    }
    for (const v of Object.values(data as Record<string, unknown>)) {
        const m = first(v);
        if (m) return m;
    }
    return 'Registrácia zlyhala. Skúste to prosím znova.';
}

function RegisterForm() {
    const [formData, setFormData] = useState({ title: '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    const [firstNameTouched, setFirstNameTouched] = useState(false);
    const [lastNameTouched, setLastNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [success, setSuccess] = useState(false);

    const firstNameValid = formData.firstName.trim().length > 0;
    const lastNameValid = formData.lastName.trim().length > 0;
    const emailValid = EMAIL_REGEX.test(formData.email);
    const hasMinLength = formData.password.length >= 8;
    const notNumeric = formData.password.length > 0 && !/^\d+$/.test(formData.password);
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';
    const canSubmit = firstNameValid && lastNameValid && emailValid && hasMinLength && notNumeric && passwordsMatch;

    const strength = formData.password.length >= 12 ? 4 : formData.password.length >= 10 ? 3 : formData.password.length >= 8 ? 2 : formData.password.length > 0 ? 1 : 0;
    const strengthColor = strength >= 3 ? '#10b981' : strength === 2 ? '#f59e0b' : '#ef4444';
    const strengthLabel = strength < 2 ? 'Slabé' : strength === 2 ? 'Dobré' : strength === 3 ? 'Silné' : 'Veľmi silné';

    const mutation = useMutation({
        mutationFn: () => register({
            email: formData.email, password: formData.password, title: formData.title,
            first_name: formData.firstName.trim(), last_name: formData.lastName.trim(),
        }),
        onSuccess: () => setSuccess(true),
        onError: (error: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error('Registration failed', error as any);
            setErrorMsg(getRegisterErrorMessage(error));
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        setFirstNameTouched(true); setLastNameTouched(true); setEmailTouched(true);
        if (!canSubmit) return;
        mutation.mutate();
    };

    if (success) {
        return (
            <div className="text-center bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl mb-4" style={{ background: GRAD, boxShadow: '0 8px 32px rgba(6,182,212,0.3)' }}>
                    <CheckCircleIcon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ letterSpacing: '-0.03em' }}>Skontrolujte si e-mail</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Na vami zadanú adresu sme odoslali overovací odkaz. Pre aktiváciu účtu kliknite na odkaz v e-maile.
                </p>
                <Link to="/login"
                    className="inline-flex justify-center items-center h-11 px-6 rounded-full text-sm font-semibold text-white"
                    style={{ background: GRAD, boxShadow: '0 4px 16px rgba(6,182,212,0.28)' }}>
                    Prejsť na prihlásenie
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {errorMsg && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                    <XCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{errorMsg}</p>
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-title" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Titul</label>
                <input id="reg-title" name="title" type="text"
                    value={formData.title} onChange={handleChange}
                    placeholder="napr. MUDr., Ing., Bc." className={iNormal} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-firstName" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Meno <span className="text-red-500">*</span></label>
                    <input id="reg-firstName" name="firstName" type="text" required
                        value={formData.firstName} onChange={handleChange}
                        onBlur={() => setFirstNameTouched(true)}
                        placeholder="Ján"
                        className={firstNameTouched && !firstNameValid ? iError : iNormal} />
                    {firstNameTouched && !firstNameValid && <p className="text-xs text-red-600" role="alert">Zadajte meno.</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-lastName" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Priezvisko <span className="text-red-500">*</span></label>
                    <input id="reg-lastName" name="lastName" type="text" required
                        value={formData.lastName} onChange={handleChange}
                        onBlur={() => setLastNameTouched(true)}
                        placeholder="Novák"
                        className={lastNameTouched && !lastNameValid ? iError : iNormal} />
                    {lastNameTouched && !lastNameValid && <p className="text-xs text-red-600" role="alert">Zadajte priezvisko.</p>}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Emailová adresa <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input id="reg-email" name="email" type="email" required autoComplete="email"
                        value={formData.email} onChange={handleChange}
                        onBlur={() => setEmailTouched(true)}
                        placeholder="jan@priklad.sk"
                        className={emailTouched && formData.email ? (emailValid ? iOk : iError) : (emailTouched && !formData.email ? iError : iNormal)} />
                    {emailTouched && formData.email && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {emailValid ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" /> : <XCircleIcon className="h-5 w-5 text-red-400" />}
                        </span>
                    )}
                </div>
                {emailTouched && !formData.email && <p className="text-xs text-red-600" role="alert">Zadajte emailovú adresu.</p>}
                {emailTouched && formData.email && !emailValid && <p className="text-xs text-red-600">Zadajte platnú emailovú adresu.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-password" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Heslo <span className="text-red-500">*</span></label>
                <input id="reg-password" name="password" type="password" required autoComplete="new-password"
                    value={formData.password} onChange={handleChange}
                    onFocus={() => setPasswordTouched(true)}
                    placeholder="Minimálne 8 znakov" className={iNormal} />
                {formData.password.length > 0 && (
                    <div className="flex flex-col gap-1 mt-0.5">
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : '#e2e8f0', transition: 'background 0.2s' }} />
                            ))}
                        </div>
                        <span className="text-xs text-slate-400">{strengthLabel} heslo</span>
                    </div>
                )}
                {(passwordTouched || formData.password) && (
                    <ul className="mt-0.5 space-y-1 pl-0.5">
                        <Requirement met={hasMinLength} label="Aspoň 8 znakov" />
                        <Requirement met={notNumeric} label="Nesmie obsahovať iba číslice" />
                    </ul>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-confirmPassword" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Potvrďte heslo <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input id="reg-confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password"
                        value={formData.confirmPassword} onChange={handleChange}
                        placeholder="Zopakujte heslo"
                        className={formData.confirmPassword ? (passwordsMatch ? iOk : iError) : iNormal} />
                    {formData.confirmPassword && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {passwordsMatch ? <CheckCircleIcon className="h-5 w-5 text-emerald-500" /> : <XCircleIcon className="h-5 w-5 text-red-400" />}
                        </span>
                    )}
                </div>
                {formData.confirmPassword && !passwordsMatch && <p className="text-xs text-red-600">Heslá sa nezhodujú.</p>}
            </div>

            <div className="mt-2">
                <GradButton disabled={!canSubmit} loading={mutation.isPending}>
                    {mutation.isPending ? 'Vytváranie účtu…' : 'Vytvoriť účet'}
                </GradButton>
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
    );
}

// ── page ─────────────────────────────────────────────────────────

export default function AuthPage() {
    const location = useLocation();
    const isLogin = location.pathname !== '/register';

    return (
        <div className="flex-grow flex" style={{ minHeight: 'calc(100vh - 64px)' }}>
            <BrandPanel isLogin={isLogin} />

            <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
                <MobileHero isLogin={isLogin} />

                <div className="flex-1 flex flex-col lg:items-center lg:justify-center">
                    <div className="w-full lg:max-w-[480px] px-8 py-8 lg:px-12 lg:py-10">
                        {/* desktop heading */}
                        <div className="hidden lg:block mb-8">
                            <h2 className="text-2xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.04em' }}>
                                {isLogin ? 'Prihláste sa' : 'Vytvorte si účet'}
                            </h2>
                            <p className="mt-1.5 text-sm text-slate-500">
                                {isLogin ? 'Zadajte svoje prihlasovacie údaje' : 'Zaregistrujte sa zadarmo za 30 sekúnd'}
                            </p>
                        </div>

                        {/* tab switcher */}
                        <div className="flex bg-slate-100 rounded-[10px] p-1 mb-8 gap-1">
                            <Link
                                to="/login"
                                className={`flex-1 py-2 text-center rounded-lg text-sm transition-all ${isLogin ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Prihlásenie
                            </Link>
                            <Link
                                to="/register"
                                className={`flex-1 py-2 text-center rounded-lg text-sm transition-all ${!isLogin ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Registrácia
                            </Link>
                        </div>

                        {/* animated form content */}
                        <div key={location.pathname} className="auth-fade-up">
                            {isLogin ? <LoginForm /> : <RegisterForm />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
