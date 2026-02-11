import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    UsersIcon, 
    CubeIcon, 
    ChartBarIcon,
    Cog6ToothIcon 
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
    const [stats] = useState({
        totalProducts: 30,
        totalUsers: 5,
        pendingOrders: 0,
        lowStockItems: 3
    });

    const menuItems = [
        {
            name: 'Správa produktov',
            description: 'Pridávať, upravovať a odstraňovať produkty',
            icon: CubeIcon,
            href: '/admin/products',
            color: 'bg-blue-500'
        },
        {
            name: 'Správa používateľov',
            description: 'Spravovať používateľské účty',
            icon: UsersIcon,
            href: '/admin/users',
            color: 'bg-green-500'
        },
        {
            name: 'Objednávky',
            description: 'Zobraziť a spravovať objednávky',
            icon: ChartBarIcon,
            href: '/admin/orders',
            color: 'bg-purple-500'
        },
        {
            name: 'Nastavenia',
            description: 'Konfigurácia obchodu',
            icon: Cog6ToothIcon,
            href: '/admin/settings',
            color: 'bg-gray-500'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Vitajte v administrátorskom paneli. Tu môžete spravovať celý obchod.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <CubeIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Celkom produktov
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            {stats.totalProducts}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <UsersIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Celkom používateľov
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            {stats.totalUsers}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Čakajúce objednávky
                                        </dt>
                                        <dd className="text-lg font-semibold text-gray-900">
                                            {stats.pendingOrders}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Nízky stav skladu
                                        </dt>
                                        <dd className="text-lg font-semibold text-red-600">
                                            {stats.lowStockItems}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            className="relative group bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-start space-x-4">
                                <div className={`${item.color} rounded-lg p-3`}>
                                    <item.icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {item.description}
                                    </p>
                                </div>
                                <svg 
                                    className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
