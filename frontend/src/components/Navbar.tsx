import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { isAdmin } from '../api/auth';
import { useCartStore } from '../store/cartStore';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
    const location = useLocation();
    const isLoggedIn = !!localStorage.getItem('access_token');
    const userIsAdmin = isLoggedIn && isAdmin();
    const totalItems = useCartStore((state) => state.getTotalItems());

    const navigation = [
        { name: 'Produkty', href: '/products', current: location.pathname === '/products' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
    };

    return (
        <Disclosure as="nav" className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-lg">
            {({ open }) => (
                <>
                    <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                        <div className="relative flex h-16 items-center justify-between">
                            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
                                {/* Mobile menu button*/}
                                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-blue-200 hover:bg-blue-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                    <span className="absolute -inset-0.5" />
                                    <span className="sr-only">Otvoriť menu</span>
                                    {open ? (
                                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                                    ) : (
                                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                                    )}
                                </Disclosure.Button>
                            </div>
                            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
                                <div className="flex flex-shrink-0 items-center">
                                    <svg className="h-10 w-10 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                    <span className="ml-3 text-2xl font-bold text-white tracking-wide">DentalShop</span>
                                </div>
                                <div className="hidden sm:ml-6 sm:block">
                                    <div className="flex space-x-4">
                                        {navigation.map((item) => (
                                            <Link
                                                key={item.name}
                                                to={item.href}
                                                className={classNames(
                                                    item.current ? 'bg-blue-950 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white',
                                                    'rounded-md px-3 py-2 text-sm font-medium transition-colors'
                                                )}
                                                aria-current={item.current ? 'page' : undefined}
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                                {/* Cart Icon */}
                                <Link
                                    to="/cart"
                                    className="relative text-blue-100 hover:text-white p-2 rounded-md transition-colors"
                                >
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    {totalItems > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                            {totalItems}
                                        </span>
                                    )}
                                </Link>

                                {isLoggedIn ? (
                                    <>
                                        {userIsAdmin && (
                                            <Link
                                                to="/admin"
                                                className="text-blue-100 hover:text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                            >
                                                Admin
                                            </Link>
                                        )}
                                        <button
                                            onClick={handleLogout}
                                            className="text-blue-100 hover:text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                        >
                                            Odhlásiť sa
                                        </button>
                                    </>
                                ) : (
                                    <Link
                                        to="/login"
                                        className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
                                    >
                                        Prihlásiť sa
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <Disclosure.Panel className="sm:hidden">
                        <div className="space-y-1 px-2 pb-3 pt-2">
                            {navigation.map((item) => (
                                <Disclosure.Button
                                    key={item.name}
                                    as={Link}
                                    to={item.href}
                                    className={classNames(
                                        item.current ? 'bg-blue-950 text-white' : 'text-blue-200 hover:bg-blue-700 hover:text-white',
                                        'block rounded-md px-3 py-2 text-base font-medium'
                                    )}
                                    aria-current={item.current ? 'page' : undefined}
                                >
                                    {item.name}
                                </Disclosure.Button>
                            ))}
                            {isLoggedIn && userIsAdmin && (
                                <Disclosure.Button
                                    as={Link}
                                    to="/admin"
                                    className="text-blue-200 hover:bg-blue-700 hover:text-white block rounded-md px-3 py-2 text-base font-medium w-full text-left"
                                >
                                    Admin
                                </Disclosure.Button>
                            )}
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    );
}
