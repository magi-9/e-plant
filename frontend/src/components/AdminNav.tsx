import { Link, useLocation } from 'react-router-dom';
import {
    ChevronLeftIcon,
    CubeIcon,
    UsersIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const NAV_ITEMS = [
    { href: '/admin/products', label: 'Produkty', icon: CubeIcon },
    { href: '/admin/orders', label: 'Objednávky', icon: ClipboardDocumentListIcon },
    { href: '/admin/users', label: 'Používatelia', icon: UsersIcon },
    { href: '/admin/settings', label: 'Nastavenia', icon: Cog6ToothIcon },
];

export default function AdminNav() {
    const location = useLocation();

    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-cyan-600 transition-colors"
            >
                <ChevronLeftIcon className="h-4 w-4" />
                Admin
            </Link>

            <div className="flex items-center gap-1 flex-wrap">
                <ShieldCheckIcon className="h-4 w-4 text-slate-400 mr-1 hidden sm:block" />
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        to={href}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            location.pathname === href
                                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
