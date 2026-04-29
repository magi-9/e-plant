import { useEffect, useState } from 'react';
import logoUrl from '../assets/dynamicabutment-logo.png';
import {
    ShieldCheckIcon,
    UserCircleIcon,
    ChevronDownIcon,
    ArrowRightOnRectangleIcon,
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

    const navLinks = [
        { to: '/products', label: 'Produkty' },
        { to: '/about', label: 'O nás' },
    ];

    return (
        <>
        <nav
            className="fixed top-0 left-0 right-0 z-50 h-16"
            style={{ background: '#020617', borderBottom: '1px solid rgba(6,182,212,0.18)' }}
        >
            <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">

                {/* Left: logo + nav links */}
                <div className="flex items-center gap-8">
                    <button
                        type="button"
                        onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/products'); }}
                        className="flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity"
                        aria-label="Dynamic Abutment Solutions – e-shop"
                    >
                        <img
                            src={logoUrl}
                            alt="Dynamic Abutment Solutions"
                            className="h-7 w-auto object-contain brightness-0 invert"
                        />
                    </button>

                    <div className="hidden sm:flex items-center gap-8">
                        {navLinks.map(({ to, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="text-sm font-medium transition-colors duration-150"
                                style={{
                                    color: isActive(to.split('#')[0]) ? '#fff' : 'rgba(255,255,255,0.45)',
                                    fontWeight: isActive(to.split('#')[0]) ? 600 : 400,
                                    textDecoration: 'none',
                                }}
                            >
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right: cart + user/login */}
                <div className="flex items-center gap-3">

                    {/* Cart – only for non-admins */}
                    {!userIsAdmin && (
                        <div className="relative group/cart">
                            <Link
                                to="/cart"
                                aria-label="Košík"
                                className={`relative flex items-center gap-2 rounded-[10px] px-3.5 py-2 transition-all duration-200 ${cartPulse ? 'scale-105' : ''}`}
                                style={{
                                    background: isActive('/cart') ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.1)',
                                    border: '1px solid rgba(6,182,212,0.25)',
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 01-8 0" />
                                </svg>
                                <span className="text-[13px] font-semibold text-white leading-none">
                                    {totalItems}
                                </span>
                            </Link>

                            {/* Cart hover popup */}
                            <div className="hidden sm:block pointer-events-none absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 scale-95 transition-all duration-150 group-hover/cart:opacity-100 group-hover/cart:scale-100 group-hover/cart:pointer-events-auto z-50">
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

                    {/* Admin badge */}
                    {userIsAdmin && (
                        <Link
                            to="/admin"
                            aria-label="Admin panel"
                            className="flex items-center justify-center p-2 rounded-lg transition-colors"
                            style={{ color: location.pathname.startsWith('/admin') ? '#06b6d4' : 'rgba(255,255,255,0.6)' }}
                        >
                            <ShieldCheckIcon className="h-5 w-5" />
                        </Link>
                    )}

                    {/* Logged-in user menu */}
                    {isLoggedIn && !userIsAdmin && (
                        <Menu as="div" className="relative">
                            <Menu.Button
                                className="flex items-center gap-2 rounded-lg px-3 py-[7px] text-sm transition-colors duration-150"
                                style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'none' }}
                            >
                                <UserCircleIcon className="h-5 w-5 flex-shrink-0" />
                                <span className="hidden md:inline max-w-[160px] truncate">{userLabel}</span>
                                <ChevronDownIcon className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                            </Menu.Button>
                            <Transition
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden">
                                    <div className="py-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <Link to="/orders" className={`block px-4 py-2.5 text-sm ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}>
                                                    Moje objednávky
                                                </Link>
                                            )}
                                        </Menu.Item>
                                        <Menu.Item>
                                            {({ active }) => (
                                                <Link to="/profile" className={`block px-4 py-2.5 text-sm ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'}`}>
                                                    Môj profil
                                                </Link>
                                            )}
                                        </Menu.Item>
                                        <div className="border-t border-slate-100 mt-1 pt-1">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLogoutConfirm(true)}
                                                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm ${active ? 'bg-red-50 text-red-700' : 'text-red-600'}`}
                                                    >
                                                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                                        Odhlásenie
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    )}

                    {/* Admin logout */}
                    {isLoggedIn && userIsAdmin && (
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            aria-label="Odhlásiť sa"
                            className="flex items-center justify-center p-2 rounded-lg transition-colors"
                            style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                    )}

                    {/* Not logged in */}
                    {!isLoggedIn && (
                        <Link
                            to="/login"
                            className="flex items-center rounded-lg px-3.5 py-[7px] text-[13px] transition-colors duration-150"
                            style={{ border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', background: 'none' }}
                        >
                            Prihlásiť sa
                        </Link>
                    )}
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
