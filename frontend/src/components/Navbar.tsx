import logoUrl from '../assets/digitalabutment-logo.png';
import {
    ShoppingCartIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentListIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { isAdmin } from '../api/auth';
import { useCartStore, type CartState } from '../store/cartStore';
import type { CartItem } from '../store/cartStore';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isLoggedIn = !!localStorage.getItem('access_token');
    const userIsAdmin = isLoggedIn && isAdmin();
    const totalItems = useCartStore((state: CartState) => state.getTotalItems());
    const items = useCartStore((state: CartState) => state.items);
    const totalPrice = useCartStore((state: CartState) => state.getTotalPrice());

    const handleLogout = () => {
        queryClient.clear();
        useCartStore.getState().clearCart();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
    };

    const isActive = (href: string) =>
        href === '/admin'
            ? location.pathname === '/admin'
            : location.pathname === href || location.pathname.startsWith(href + '/');

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shadow-lg border-b border-cyan-500/20">
            <div className="px-3 sm:px-4 lg:px-6">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link to="/products" className="flex items-center gap-2 group" aria-label="Digital Abutment Solutions – e-shop">
                            <img
                                src={logoUrl}
                                alt="Digital Abutment Solutions"
                                className="h-8 w-auto object-contain brightness-0 invert group-hover:opacity-80 transition-opacity"
                            />
                        </Link>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!userIsAdmin && (
                            <div className="relative group/cart">
                                <Link
                                    to="/cart"
                                    aria-label="Košík"
                                    title="Košík"
                                    className={`relative flex items-center justify-center p-3 rounded-lg transition-all duration-200 ${isActive('/cart') ? 'bg-cyan-600 text-white' : 'text-cyan-100 bg-transparent group-hover/cart:bg-slate-700/50 group-hover/cart:text-white'}`}
                                >
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    {totalItems > 0 && (
                                        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none pointer-events-none">
                                            {totalItems > 99 ? '99+' : totalItems}
                                        </span>
                                    )}
                                </Link>

                                <div className="hidden sm:block pointer-events-none absolute right-0 top-full mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg opacity-0 scale-95 transition-all duration-150 group-hover/cart:opacity-100 group-hover/cart:scale-100 group-hover/cart:pointer-events-auto group-focus-within/cart:opacity-100 group-focus-within/cart:scale-100 group-focus-within/cart:pointer-events-auto z-50">
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

                        {isLoggedIn && !userIsAdmin && (
                            <Link
                                to="/orders"
                                aria-label="Moje objednávky"
                                title="Moje objednávky"
                                className={`flex items-center justify-center p-3 rounded-lg transition-all duration-200 ${isActive('/orders') ? 'bg-cyan-600 text-white' : 'text-cyan-100 bg-transparent hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                <ClipboardDocumentListIcon className="h-6 w-6" />
                            </Link>
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

                        {isLoggedIn ? (
                            <button
                                onClick={handleLogout}
                                aria-label="Odhlásiť sa"
                                title="Odhlásiť sa"
                                className="flex items-center justify-center p-3 rounded-lg text-cyan-100 bg-transparent hover:bg-red-700/40 hover:text-red-100 transition-all duration-200"
                            >
                                <ArrowRightOnRectangleIcon className="h-6 w-6" />
                            </button>
                        ) : (
                            <Link
                                to="/login"
                                aria-label="Prihlásiť sa"
                                title="Prihlásiť sa"
                                className="flex items-center justify-center p-3 rounded-lg text-cyan-100 bg-transparent hover:bg-slate-700/50 hover:text-white transition-all duration-200"
                            >
                                <ArrowRightOnRectangleIcon className="h-6 w-6" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
