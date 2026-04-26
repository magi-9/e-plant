import { useEffect, useState } from 'react';
import logoUrl from '../assets/digitalabutment-logo.png';
import {
    ShoppingCartIcon,
    ArrowLeftOnRectangleIcon,
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon,
    UserCircleIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, isAdmin } from '../api/auth';
import { useCartStore, type CartState } from '../store/cartStore';
import type { CartItem } from '../store/cartStore';
import ConfirmModal from './ConfirmModal';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isLoggedIn = !!localStorage.getItem('access_token');
    const userIsAdmin = isLoggedIn && isAdmin();
    const totalItems = useCartStore((state: CartState) => state.getTotalItems());
    const items = useCartStore((state: CartState) => state.items);
    const totalPrice = useCartStore((state: CartState) => state.getTotalPrice());
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [cartPulse, setCartPulse] = useState(false);

    const { data: me } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: isLoggedIn && !userIsAdmin,
    });

    const userLabel = `${me?.title || ''} ${me?.first_name || ''} ${me?.last_name || ''}`.trim() || me?.email || 'Môj účet';

    useEffect(() => {
        let pulseTimeout: ReturnType<typeof setTimeout> | null = null;

        const handleCartAdded = () => {
            setCartPulse(true);

            if (pulseTimeout) clearTimeout(pulseTimeout);

            pulseTimeout = setTimeout(() => setCartPulse(false), 700);
        };

        window.addEventListener('cart:item-added', handleCartAdded as EventListener);

        return () => {
            window.removeEventListener('cart:item-added', handleCartAdded as EventListener);
            if (pulseTimeout) clearTimeout(pulseTimeout);
        };
    }, []);

    const confirmLogout = () => {
        queryClient.clear();
        useCartStore.getState().clearCart();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setShowLogoutConfirm(false);
        navigate('/login', { replace: true });
    };

    const isActive = (href: string) =>
        href === '/admin'
            ? location.pathname === '/admin'
            : location.pathname === href || location.pathname.startsWith(href + '/');

    return (
        <>
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shadow-lg border-b border-cyan-500/20">
            <div className="px-3 sm:px-4 lg:px-6">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                navigate('/products');
                            }}
                            className="flex items-center gap-2 group"
                            aria-label="Dynamic Abutment Solutions – e-shop"
                            title="Späť na začiatok"
                        >
                            <img
                                src={logoUrl}
                                alt="Dynamic Abutment Solutions"
                                className="h-8 w-auto object-contain brightness-0 invert group-hover:opacity-80 transition-opacity cursor-pointer"
                            />
                        </button>
                        <Link
                            to="/about"
                            className={`ml-3 inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all ${isActive('/about') ? 'bg-cyan-600 text-white' : 'text-cyan-100 hover:bg-slate-700/50 hover:text-white'}`}
                        >
                            O nás
                        </Link>
                    </div>

                    <div className="mr-1 sm:mr-2 lg:mr-3 flex items-center gap-1.5 flex-shrink-0">
                        {!userIsAdmin && (
                            <div className="relative group/cart">
                                <Link
                                    to="/cart"
                                    aria-label="Košík"
                                    title="Košík"
                                    className={`relative flex items-center justify-center p-3 rounded-lg transition-all duration-200 ${cartPulse ? 'scale-110' : ''} ${isActive('/cart') ? 'bg-cyan-600 text-white' : 'text-cyan-100 bg-transparent group-hover/cart:bg-slate-700/50 group-hover/cart:text-white'}`}
                                >
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    {totalItems > 0 && (
                                        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none pointer-events-none">
                                            {totalItems > 99 ? '99+' : totalItems}
                                        </span>
                                    )}
                                </Link>

                                <div className="hidden sm:block pointer-events-none absolute right-0 top-full mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover/cart:opacity-100 group-hover/cart:scale-100 group-hover/cart:pointer-events-auto z-50">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-2">Košík</p>
                                    {items.length === 0 ? (
                                        <p className="text-sm text-slate-500">Košík je prázdny</p>
                                    ) : (
                                        <>
                                            <p className="text-sm font-semibold text-slate-900 mb-2">{totalItems} produktov</p>
                                            <ul className="space-y-1.5 mb-3">
                                                {items.slice(0, 3).map((item: CartItem) => (
                                                    <li key={`${item.productId}:${item.variantReference || 'default'}`} className="text-sm text-slate-700 truncate">
                                                        {item.name}
                                                    </li>
                                                ))}
                                                {items.length > 3 && (
                                                    <li className="text-xs text-slate-500">+{items.length - 3} ďalších</li>
                                                )}
                                            </ul>
                                            <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                                                <span className="text-sm text-slate-600">Spolu</span>
                                                <span className="text-sm font-bold text-cyan-700">
                                                    {totalPrice.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>


                            </div>
                        )}

                        {userIsAdmin && (
                            <Link
                                to="/admin"
                                aria-label="Admin panel"
                                title="Admin panel"
                                className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 ${location.pathname.startsWith('/admin') ? 'bg-cyan-600 text-white' : 'text-cyan-100 bg-transparent hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <ShieldCheckIcon className="h-6 w-6" />
                            </Link>
                        )}

                        {isLoggedIn && !userIsAdmin && (
                            <Menu as="div" className="relative">
                                <Menu.Button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-cyan-100 hover:bg-slate-700/50 hover:text-white transition-all duration-200">
                                    <UserCircleIcon className="h-7 w-7" />
                                    <span className="max-w-[220px] truncate text-sm font-medium">{userLabel}</span>
                                    <ChevronDownIcon className="h-4 w-4 text-cyan-300" />
                                </Menu.Button>
                                <Transition
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                                        <div className="py-1">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        to="/orders"
                                                        className={`block px-4 py-2 text-sm ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                                    >
                                                        Moje objednávky
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <Link
                                                        to="/profile"
                                                        className={`block px-4 py-2 text-sm ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-700'}`}
                                                    >
                                                        Môj profil
                                                    </Link>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLogoutConfirm(true)}
                                                        className={`block w-full text-left px-4 py-2 text-sm ${active ? 'bg-red-50 text-red-700' : 'text-red-600'}`}
                                                    >
                                                        Odhlásenie
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>
                        )}

                        {isLoggedIn && userIsAdmin && (
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                aria-label="Odhlásiť sa"
                                title="Odhlásiť sa"
                                className="flex items-center justify-center p-3 rounded-lg text-cyan-100 bg-transparent hover:bg-red-700/40 hover:text-red-100 transition-all duration-200"
                            >
                                <ArrowRightOnRectangleIcon className="h-6 w-6" />
                            </button>
                        )}

                        {!isLoggedIn && (
                            <Link
                                to="/login"
                                aria-label="Prihlásiť sa"
                                title="Prihlásiť sa"
                                className="flex items-center justify-center p-3 rounded-lg text-cyan-100 bg-transparent hover:bg-slate-700/50 hover:text-white transition-all duration-200"
                            >
                                <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
        <ConfirmModal
            open={showLogoutConfirm}
            title="Odhlásenie"
            message="Naozaj sa chcete odhlásiť?"
            confirmLabel="Odhlásiť sa"
            onConfirm={confirmLogout}
            onCancel={() => setShowLogoutConfirm(false)}
        />
        </>
    );
}
