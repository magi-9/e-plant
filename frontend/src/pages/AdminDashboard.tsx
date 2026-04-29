import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    UsersIcon,
    CubeIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    ArchiveBoxIcon,
    RectangleGroupIcon,
} from '@heroicons/react/24/outline';
import { getProducts } from '../api/products';
import { getAdminOrders, type Order } from '../api/orders';
import { getAdminUsers, type User } from '../api/users';
import { getOrderStats } from '../api/settings';
import { useAdminPageGuard } from '../hooks/useAdminPageGuard';

const menuItems = [
    {
        name: 'Správa produktov',
        description: 'Pridávať, upravovať a odstraňovať produkty',
        icon: CubeIcon,
        href: '/admin/products',
        color: 'bg-cyan-500',
    },
    {
        name: 'Správa používateľov',
        description: 'Spravovať používateľské účty a oprávnenia',
        icon: UsersIcon,
        href: '/admin/users',
        color: 'bg-violet-500',
    },
    {
        name: 'Objednávky',
        description: 'Zobraziť a spravovať objednávky zákazníkov',
        icon: ClipboardDocumentListIcon,
        href: '/admin/orders',
        color: 'bg-emerald-500',
    },
    {
        name: 'Nastavenia',
        description: 'Konfigurácia obchodu, faktúry, bankové údaje',
        icon: Cog6ToothIcon,
        href: '/admin/settings',
        color: 'bg-slate-500',
    },
    {
        name: 'Sklad',
        description: 'Príjem tovaru a prehľad skladových zásob',
        icon: ArchiveBoxIcon,
        href: '/admin/inventory',
        color: 'bg-orange-500',
    },
    {
        name: 'Grupovanie',
        description: 'Wildcard skupiny produktov pre storefront',
        icon: RectangleGroupIcon,
        href: '/admin/grouping',
        color: 'bg-indigo-500',
    },
];

export default function AdminDashboard() {
    const canAccess = useAdminPageGuard();

    const [activeTab, setActiveTab] = useState<'overview' | 'stats'>('overview');
    const [statsPeriod, setStatsPeriod] = useState<7 | 30 | 90>(30);

    const { data: allProductsData } = useQuery({
        queryKey: ['admin-products-count', { admin_view: '1', limit: 1, offset: 0 }],
        queryFn: () => getProducts({ admin_view: '1', limit: 1, offset: 0 }),
    });

    const { data: visibleProductsData } = useQuery({
        queryKey: ['admin-products-count', { admin_view: '1', is_visible: true, limit: 1, offset: 0 }],
        queryFn: () => getProducts({ admin_view: '1', is_visible: true, limit: 1, offset: 0 }),
    });

    const { data: orders } = useQuery({
        queryKey: ['adminOrders'],
        queryFn: getAdminOrders,
    });

    const { data: users } = useQuery({
        queryKey: ['admin-users'],
        queryFn: getAdminUsers,
    });

    const { data: orderStats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats', statsPeriod],
        queryFn: () => getOrderStats(statsPeriod),
        enabled: activeTab === 'stats',
    });

    if (!canAccess) return null;

    const isPaginated = <T,>(value: unknown): value is { results: T[] } => {
        return typeof value === 'object' && value !== null && Array.isArray((value as { results?: unknown }).results);
    };

    const ordersData: unknown = orders;
    const usersData: unknown = users;

    const ordersList: Order[] = Array.isArray(orders)
        ? orders
        : isPaginated<Order>(ordersData)
            ? ordersData.results
            : [];

    const usersList: User[] = Array.isArray(users)
        ? users
        : isPaginated<User>(usersData)
            ? usersData.results
            : [];

    const totalProducts = allProductsData?.count ?? '—';
    const visibleProducts = visibleProductsData?.count ?? '—';
    const totalUsers = users === undefined ? '—' : usersList.length;
    const pendingOrders = orders === undefined
        ? '—'
        : ordersList.filter((o) => o.status === 'new' || o.status === 'awaiting_payment').length;
    const totalOrders = orders === undefined ? '—' : ordersList.length;

    const stats = [
        {
            label: 'Produkty (všetky)',
            value: totalProducts,
            icon: CubeIcon,
            iconColor: 'text-cyan-500',
            bg: 'bg-cyan-50',
            href: '/admin/products',
        },
        {
            label: 'Produkty (viditeľné)',
            value: visibleProducts,
            icon: CubeIcon,
            iconColor: 'text-sky-500',
            bg: 'bg-sky-50',
            href: '/admin/products',
        },
        {
            label: 'Celkom používateľov',
            value: totalUsers,
            icon: UsersIcon,
            iconColor: 'text-violet-500',
            bg: 'bg-violet-50',
            href: '/admin/users',
        },
        {
            label: 'Čakajúce objednávky',
            value: pendingOrders,
            icon: ExclamationTriangleIcon,
            iconColor: 'text-amber-500',
            bg: 'bg-amber-50',
            href: '/admin/orders',
        },
        {
            label: 'Celkom objednávok',
            value: totalOrders,
            icon: ClipboardDocumentListIcon,
            iconColor: 'text-emerald-500',
            bg: 'bg-emerald-50',
            href: '/admin/orders',
        },
    ];

    const orderStatsCards = orderStats
        ? [
              {
                  label: 'Objednávky',
                  value: orderStats.total_orders,
                  bg: 'bg-slate-50',
                  textColor: 'text-slate-900',
                  labelColor: 'text-slate-500',
              },
              {
                  label: 'Zaplatené',
                  value: orderStats.paid_orders,
                  bg: 'bg-green-50',
                  textColor: 'text-green-700',
                  labelColor: 'text-green-600',
              },
              {
                  label: 'Nezaplatené',
                  value: orderStats.unpaid_orders,
                  bg: 'bg-amber-50',
                  textColor: 'text-amber-700',
                  labelColor: 'text-amber-600',
              },
              {
                  label: 'Priemerný košík',
                  value: `${orderStats.avg_basket.toFixed(2)} €`,
                  bg: 'bg-blue-50',
                  textColor: 'text-blue-700',
                  labelColor: 'text-blue-600',
              },
          ]
        : [];

    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-100 rounded-xl">
                        <ShieldCheckIcon className="h-7 w-7 text-cyan-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="mt-0.5 text-sm text-slate-500">Prehľad a správa celého obchodu.</p>
                    </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            activeTab === 'overview'
                                ? 'bg-cyan-600 text-white border-cyan-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        Prehľad
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('stats')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            activeTab === 'stats'
                                ? 'bg-cyan-600 text-white border-cyan-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        Štatistiky
                    </button>
                </div>

                {activeTab === 'overview' ? (
                    <>
                        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-8">
                            {stats.map((stat) => (
                                <Link
                                    key={stat.label}
                                    to={stat.href}
                                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-1">{stat.label}</p>
                                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                        </div>
                                        <div className={`${stat.bg} p-2.5 rounded-lg`}>
                                            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className="group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-start gap-4"
                                >
                                    <div className={`${item.color} rounded-xl p-3 flex-shrink-0`}>
                                        <item.icon className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                                            {item.name}
                                        </h3>
                                        <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                                    </div>
                                    <svg
                                        className="h-5 w-5 text-slate-300 group-hover:text-cyan-500 transition-colors flex-shrink-0 mt-0.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Štatistiky objednávok</h2>
                                <p className="mt-1 text-sm text-slate-500">Prehľad objednávok podľa zvoleného obdobia.</p>
                            </div>
                            <div className="flex gap-2">
                                {([7, 30, 90] as const).map((days) => (
                                    <button
                                        key={days}
                                        type="button"
                                        onClick={() => setStatsPeriod(days)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                                            statsPeriod === days
                                                ? 'bg-cyan-600 text-white border-cyan-600'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        {days} dní
                                    </button>
                                ))}
                            </div>
                        </div>

                        {statsLoading ? (
                            <p className="text-gray-500 text-sm">Načítavam...</p>
                        ) : orderStats ? (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                    {orderStatsCards.map((card) => (
                                        <div key={card.label} className={`${card.bg} rounded-lg p-4 border border-slate-200`}>
                                            <p className={`text-xs mb-1 ${card.labelColor}`}>{card.label}</p>
                                            <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                                        </div>
                                    ))}
                                </div>
                                {orderStats.top_products.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-3">Top produkty</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                                                        <th className="pb-2">Produkt</th>
                                                        <th className="pb-2 text-right">Predané ks</th>
                                                        <th className="pb-2 text-right">Tržba</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {orderStats.top_products.map((product) => (
                                                        <tr key={product.product_id}>
                                                            <td className="py-2 text-gray-800">{product.name}</td>
                                                            <td className="py-2 text-right text-gray-600">{product.total_qty}</td>
                                                            <td className="py-2 text-right font-medium text-gray-900">{product.total_revenue.toFixed(2)} €</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
