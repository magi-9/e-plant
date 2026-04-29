import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { login } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import logoUrl from '../assets/dynamicabutment-logo.png';

const GRAD = 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)';
const NAV_BG = '#020617';

function BrandPanel() {
    return (
        <div
            className="hidden lg:flex flex-col justify-between relative overflow-hidden"
            style={{ flex: 1, background: NAV_BG, padding: '72px 56px 56px' }}
        >
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.045, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="brand-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#06b6d4" strokeWidth="0.8"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#brand-grid)" />
            </svg>
            <div style={{ position: 'absolute', top: -120, left: -80, width: 420, height: 420, background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="relative">
                <div className="flex items-center gap-3 mb-14">
                    <img src={logoUrl} alt="Dynamic Abutment" className="h-9 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-white font-extrabold" style={{ fontSize: 42, letterSpacing: '-0.04em', maxWidth: 340, lineHeight: 1.15 }}>
                    Váš partner pre dentálne implantáty
                </h1>
                <p className="mt-5" style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 320 }}>
                    Profesionálny B2B portál pre zubných lekárov a kliniky. Rýchle objednávky, overené produkty.
                </p>
                <div className="mt-10 flex flex-col gap-3.5">
                    {[
                        '16+ prémiových produktov',
                        'Kompatibilita Straumann, Nobel, Zimmer',
                        'Dodanie do 48 hodín',
                    ].map(text => (
                        <div key={text} className="flex items-center gap-2.5">
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(6,182,212,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700 }}>✓</span>
                            </div>
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative" style={{ borderLeft: '2px solid rgba(6,182,212,0.4)', paddingLeft: 20 }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "Dynamic Abutment zjednodušil naše objednávky implantátov. Kvalita produktov je výborná a dodávky spoľahlivé."
                </p>
                <p className="mt-2.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>— MDDr. Karol Novák, Bratislava</p>
            </div>
        </div>
    );
}

function MobileHero() {
    return (
        <div className="lg:hidden relative overflow-hidden flex-shrink-0" style={{ background: NAV_BG, padding: '40px 24px 32px' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="m-grid-l" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#06b6d4" strokeWidth="0.7"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#m-grid-l)" />
            </svg>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                    <img src={logoUrl} alt="Dynamic Abutment" className="h-7 w-auto brightness-0 invert" />
                </div>
                <h1 className="text-white font-extrabold" style={{ fontSize: 26, letterSpacing: '-0.04em', lineHeight: 1.2 }}>Vitajte späť</h1>
                <p className="mt-1.5" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Prihláste sa do svojho účtu</p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState('');

    const mutation = useMutation({
        mutationFn: () => login(email, password),
        onSuccess: (data) => {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            navigate('/products');
        },
        onError: (error: Error) => {
            console.error('Login failed', error);
            setErrorMsg('Nesprávny email alebo heslo');
        }
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMsg('');
        mutation.mutate();
    };

    return (
        <div className="flex-grow flex min-h-full">
            <BrandPanel />
            <div className="flex-1 flex flex-col lg:items-center lg:justify-center bg-slate-50">
                <MobileHero />
                <div className="w-full lg:max-w-[480px] p-8 lg:px-12 lg:py-10">
                    <div className="hidden lg:block mb-8">
                        <h2 className="text-2xl font-extrabold text-slate-900" style={{ letterSpacing: '-0.04em' }}>Prihláste sa</h2>
                        <p className="mt-1.5 text-sm text-slate-500">Zadajte svoje prihlasovacie údaje</p>
                    </div>

                    <div className="flex bg-slate-100 rounded-[10px] p-1 mb-8 gap-1">
                        <div className="flex-1 py-2 text-center rounded-lg bg-white text-slate-900 font-semibold text-sm shadow-sm">
                            Prihlásenie
                        </div>
                        <Link to="/register" className="flex-1 py-2 text-center rounded-lg text-slate-400 text-sm hover:text-slate-600 transition-colors">
                            Registrácia
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {errorMsg && (
                            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                                <p className="text-sm text-red-700">{errorMsg}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="email" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>E-mail</label>
                            <input
                                id="email" name="email" type="email" required autoFocus
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="vas@email.com"
                                className="h-11 px-3.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="password" className="text-sm font-medium text-slate-600" style={{ letterSpacing: '-0.01em' }}>Heslo</label>
                            <input
                                id="password" name="password" type="password" required
                                value={password} onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="h-11 px-3.5 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 transition"
                            />
                            <div className="text-right mt-0.5">
                                <Link to="/forgot-password" className="text-xs text-cyan-600 font-medium hover:text-cyan-700">Zabudnuté heslo?</Link>
                            </div>
                        </div>

                        <div className="mt-2">
                            <button
                                type="submit"
                                disabled={mutation.isPending}
                                className="w-full h-12 rounded-full text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
                                style={{
                                    background: mutation.isPending ? '#e2e8f0' : GRAD,
                                    color: mutation.isPending ? '#94a3b8' : '#fff',
                                    boxShadow: mutation.isPending ? 'none' : '0 4px 16px rgba(6,182,212,0.28)',
                                }}
                            >
                                {mutation.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                                {mutation.isPending ? 'Prihlasovanie...' : 'Prihlásiť sa'}
                            </button>
                        </div>

                        <p className="text-center text-sm text-slate-400">
                            Nemáte účet?{' '}
                            <Link to="/register" className="text-cyan-600 font-semibold hover:text-cyan-700">Zaregistrujte sa</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
