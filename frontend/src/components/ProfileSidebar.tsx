import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getMe } from '../api/auth';

export function ProfileSidebar({ active }: { active: 'profile' | 'orders' }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });

    const handleLogout = () => {
        queryClient.clear();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
    };

    return (
        <div className="hidden md:block w-60 flex-shrink-0">
            {/* User card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-3 shadow-sm">
                <p className="text-sm font-bold text-slate-900">
                    {[me?.title, me?.first_name, me?.last_name].filter(Boolean).join(' ') || me?.email || '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{me?.email}</p>
                <span className="mt-2.5 inline-block px-3 py-1 rounded-lg bg-cyan-50 text-xs font-semibold text-cyan-700">
                    Overený zákazník
                </span>
            </div>

            {/* Nav */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {([
                    {
                        id: 'profile' as const,
                        label: 'Profil',
                        href: '/profile',
                        icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                        ),
                    },
                    {
                        id: 'orders' as const,
                        label: 'Objednávky',
                        href: '/orders',
                        icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                            </svg>
                        ),
                    },
                ] as const).map((link, i, arr) => {
                    const isActive = active === link.id;
                    return (
                        <Link
                            key={link.id}
                            to={link.href}
                            className={`flex items-center gap-3 px-4 py-3.5 transition-all
                                ${i < arr.length - 1 ? 'border-b border-slate-100' : ''}
                                ${isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className={isActive ? 'text-cyan-600' : 'opacity-60'}>{link.icon}</span>
                            <span className={`text-sm flex-1 ${isActive ? 'font-semibold' : 'font-normal'}`}>{link.label}</span>
                            {isActive && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500">
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Logout */}
            <button
                type="button"
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Odhlásiť sa
            </button>
        </div>
    );
}
