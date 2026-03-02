import { useState, useEffect, useRef } from 'react';
import {
    ShoppingCartIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentListIcon,
    UserCircleIcon,
    ShieldCheckIcon,
    CubeIcon,
    XMarkIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { isAdmin } from '../api/auth';
import { useCartStore } from '../store/cartStore';

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isLoggedIn = !!localStorage.getItem('access_token');
    const userIsAdmin = isLoggedIn && isAdmin();
    const totalItems = useCartStore((state) => state.getTotalItems());
    const [drawerOpen, setDrawerOpen] = useState(false);
    const isFirstRender = useRef(true);

    // Close drawer on route change (skip initial render to satisfy ESLint)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDrawerOpen(false);
    }, [location.pathname]);

    // Lock body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    const handleLogout = () => {
        setDrawerOpen(false);
        queryClient.clear();
        useCartStore.getState().clearCart();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login', { replace: true });
    };

    const drawerNavLinks = isLoggedIn
        ? userIsAdmin
            ? [
                { name: 'Admin panel', href: '/admin', icon: ShieldCheckIcon },
                { name: 'Správa produktov', href: '/admin/products', icon: CubeIcon },
                { name: 'Správa objednávok', href: '/admin/orders', icon: ClipboardDocumentListIcon },
              ]
            : [
                { name: 'Produkty', href: '/products', icon: CubeIcon },
                { name: 'Moje objednávky', href: '/orders', icon: ClipboardDocumentListIcon },
                { name: 'Môj profil', href: '/profile', icon: UserCircleIcon },
              ]
        : [
            { name: 'Produkty', href: '/products', icon: CubeIcon },
            { name: 'Prihlásiť sa', href: '/login', icon: ArrowRightOnRectangleIcon },
            { name: 'Registrácia', href: '/register', icon: UserPlusIcon },
          ];

    const isActive = (href: string) =>
        href === '/admin'
            ? location.pathname === '/admin'
            : location.pathname === href || location.pathname.startsWith(href + '/');

    return (
        <>
            {/* ── Navbar bar ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shadow-lg border-b border-cyan-500/20">
                <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center">

                        {/* Left: animated hamburger — always visible */}
                        <button
                            onClick={() => setDrawerOpen(!drawerOpen)}
                            aria-label={drawerOpen ? "Zavrieť menu" : "Otvoriť menu"}
                            aria-expanded={drawerOpen}
                            aria-controls="main-navigation-drawer"
                            className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl text-blue-200 hover:bg-blue-800 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0"
                        >
                            <span className={`absolute block h-[2px] w-5 bg-current rounded-full transition-all duration-300 ease-in-out ${drawerOpen ? 'rotate-45 translate-y-0' : '-translate-y-[7px]'}`} />
                            <span className={`absolute block h-[2px] w-5 bg-current rounded-full transition-all duration-300 ease-in-out ${drawerOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`} />
                            <span className={`absolute block h-[2px] w-5 bg-current rounded-full transition-all duration-300 ease-in-out ${drawerOpen ? '-rotate-45 translate-y-0' : 'translate-y-[7px]'}`} />
                        </button>

                        {/* Center: logo — icon only on mobile, icon+name on sm+ */}
                        <div className="flex-1 flex items-center justify-center sm:justify-start sm:ml-4">
                            <Link to="/" className="flex items-center gap-2 group" aria-label="DentalTech Lab – domov">
                                <svg className="h-8 w-8 text-cyan-300 group-hover:text-cyan-200 transition-colors flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                </svg>
                                <span className="hidden sm:block text-xl font-bold text-white tracking-wide">
                                    DentalTech&nbsp;
                                    <span className="text-cyan-300">Lab</span>
                                </span>
                            </Link>
                        </div>

                        {/* Right: icon buttons */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">

                            {/* Cart — always visible, hidden for admin */}
                            {!userIsAdmin && (
                                <Link
                                    to="/cart"
                                    aria-label="Košík"
                                    title="Košík"
                                    className={`relative p-2.5 rounded-xl transition-colors ${isActive('/cart') ? 'bg-cyan-600 text-white' : 'text-cyan-100 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    <ShoppingCartIcon className="h-6 w-6" />
                                    {totalItems > 0 && (
                                        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none pointer-events-none">
                                            {totalItems > 99 ? '99+' : totalItems}
                                        </span>
                                    )}
                                </Link>
                            )}

                            {/* Orders icon — desktop only, non-admin */}
                            {isLoggedIn && !userIsAdmin && (
                                <Link
                                    to="/orders"
                                    aria-label="Moje objednávky"
                                    title="Moje objednávky"
                                    className={`hidden sm:flex p-2.5 rounded-xl transition-colors ${isActive('/orders') ? 'bg-cyan-600 text-white' : 'text-cyan-100 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    <ClipboardDocumentListIcon className="h-6 w-6" />
                                </Link>
                            )}

                            {/* Admin icon — desktop only */}
                            {userIsAdmin && (
                                <Link
                                    to="/admin"
                                    aria-label="Admin panel"
                                    title="Admin panel"
                                    className={`hidden sm:flex p-2.5 rounded-xl transition-colors ${location.pathname.startsWith('/admin') ? 'bg-cyan-600 text-white' : 'text-cyan-100 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    <ShieldCheckIcon className="h-6 w-6" />
                                </Link>
                            )}

                            {/* Logout — desktop only icon, mobile via drawer */}
                            {isLoggedIn ? (
                                <button
                                    onClick={handleLogout}
                                    aria-label="Odhlásiť sa"
                                    title="Odhlásiť sa"
                                    className="hidden sm:flex p-2.5 rounded-xl text-slate-200 hover:bg-red-700/50 hover:text-red-100 transition-colors"
                                >
                                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                                </button>
                            ) : (
                                <Link
                                    to="/login"
                                    aria-label="Prihlásiť sa"
                                    title="Prihlásiť sa"
                                    className="hidden sm:flex p-2.5 rounded-xl text-cyan-100 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Backdrop ── */}
            <div
                aria-hidden="true"
                onClick={() => setDrawerOpen(false)}
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* ── Left Drawer ── */}
            <aside
                id="main-navigation-drawer"
                aria-label="Navigačné menu"
                className={`fixed top-0 left-0 z-[70] h-dvh w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <svg className="h-7 w-7 text-cyan-300" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                        </svg>
                        <span className="text-lg font-bold text-white tracking-wide">DentalTech Lab</span>
                    </div>
                    <button
                        onClick={() => setDrawerOpen(false)}
                        aria-label="Zatvoriť menu"
                        className="p-1.5 rounded-lg text-blue-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-1">
                    {isLoggedIn && (
                        <p className="px-3 mb-3 text-[10px] text-cyan-300/80 uppercase tracking-[0.15em] font-semibold">
                            {userIsAdmin ? 'Administrácia' : 'Menu'}
                        </p>
                    )}
                    {drawerNavLinks.map(({ name, href, icon: Icon }) => (
                        <Link
                            key={href}
                            to={href}
                            className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                                isActive(href)
                                    ? 'bg-cyan-500/15 text-white shadow-sm border border-cyan-400/40'
                                    : 'text-slate-100/80 hover:bg-slate-800/80 hover:text-white'
                            }`}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0 opacity-80" />
                            {name}
                        </Link>
                    ))}
                </nav>

                {/* Drawer footer — logout & branding */}
                <div className="px-3 pb-6 pt-2 border-t border-white/10 flex-shrink-0 space-y-1">
                    {isLoggedIn && (
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-red-300/80 hover:bg-red-500/15 hover:text-red-100 transition-all duration-150"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
                            Odhlásiť sa
                        </button>
                    )}
                    <p className="px-4 pt-2 text-[11px] text-slate-400/80">© 2026 DentalTech Lab</p>
                </div>
            </aside>
        </>
    );
}
