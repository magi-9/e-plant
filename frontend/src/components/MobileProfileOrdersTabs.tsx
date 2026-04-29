import { Link } from 'react-router-dom';

export default function MobileProfileOrdersTabs({ active }: { active: 'profile' | 'orders' }) {
    return (
        <div className="md:hidden mb-5 flex gap-1 bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
            <Link
                to="/profile"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm ${active === 'profile' ? 'font-semibold text-white' : 'font-medium text-slate-500'}`}
                style={active === 'profile' ? { background: 'linear-gradient(135deg, #06b6d4, #10b981)' } : undefined}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profil
            </Link>

            <Link
                to="/orders"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm ${active === 'orders' ? 'font-semibold text-white' : 'font-medium text-slate-500'}`}
                style={active === 'orders' ? { background: 'linear-gradient(135deg, #06b6d4, #10b981)' } : undefined}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                Objednávky
            </Link>
        </div>
    );
}
