import { useEffect, useState } from 'react';
import logoUrl from '../assets/dynamicabutment-logo.png';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, isAdmin } from '../api/auth';
import { authService } from '../api/authService';
import { useCartStore, type CartState } from '../store/cartStore';
import type { CartItem } from '../store/cartStore';
import { getLandingAboutHref } from '../utils/landingLinks';
import ConfirmModal from './ConfirmModal';

/* ── icons ─────────────────────────────────────────────────── */
const IUser   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>;
const ICart   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="19" cy="21" r="1.4"/><path d="M2.5 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L23 7H6"/></svg>;
const IMenu   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
const IClose  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IChevD  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>;
const ILogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const iconBtn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 9999, display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#45474c',
    background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
};

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isLoggedIn = authService.isAuthenticated();
    const userIsAdmin = isLoggedIn && isAdmin();
    const canUseCart = isLoggedIn && !userIsAdmin;
    const totalItems = useCartStore((s: CartState) => s.getTotalItems());
    const items = useCartStore((s: CartState) => s.items);
    const totalPrice = useCartStore((s: CartState) => s.getTotalPrice());
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userDropOpen, setUserDropOpen] = useState(false);
    const [cartHover, setCartHover] = useState(false);
    const [cartPulse, setCartPulse] = useState(false);
    const landingAboutHref = getLandingAboutHref();

    const { data: me } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: isLoggedIn && !userIsAdmin,
    });

    const userLabel = `${me?.title || ''} ${me?.first_name || ''} ${me?.last_name || ''}`.trim() || me?.email || 'Môj účet';

    useEffect(() => {
        let t: ReturnType<typeof setTimeout> | null = null;
        const h = () => { setCartPulse(true); if (t) clearTimeout(t); t = setTimeout(() => setCartPulse(false), 700); };
        window.addEventListener('cart:item-added', h as EventListener);
        return () => { window.removeEventListener('cart:item-added', h as EventListener); if (t) clearTimeout(t); };
    }, []);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            const el = document.getElementById('user-drop');
            if (el && !el.contains(e.target as Node)) setUserDropOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const confirmLogout = () => {
        queryClient.clear();
        useCartStore.getState().clearCart();
        setShowLogoutConfirm(false);
        authService.logout().finally(() => navigate('/login', { replace: true }));
    };

    const isActive = (href: string) =>
        href === '/admin'
            ? location.pathname === '/admin'
            : location.pathname === href || location.pathname.startsWith(href + '/');

    const NAV = [
        { to: '/products', label: 'Produkty' },
        { to: '/catalogs', label: 'Katalógy' },
    ];

    return (
        <>
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 65, background: 'rgba(255,255,255,.86)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(15,23,42,.06)' }}>
            <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>

                {/* Left: logo + nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
                    <button type="button" onClick={() => navigate('/products')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Dynamic Abutment Solutions">
                        <img src={logoUrl} alt="Dynamic Abutment Solutions" style={{ height: 38, width: 'auto', display: 'block' }} />
                    </button>

                    <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="das-navlinks">
                        {NAV.map(({ to, label }) => (
                            <Link key={to} to={to} style={{
                                fontSize: 14, fontWeight: isActive(to) ? 700 : 500,
                                color: isActive(to) ? '#1a1c1e' : '#45474c',
                                textDecoration: 'none', paddingBottom: 2,
                                borderBottom: isActive(to) ? '2px solid #1a1c1e' : '2px solid transparent',
                            }}>
                                {label}
                            </Link>
                        ))}
                        <a href={landingAboutHref} style={{ fontSize: 14, fontWeight: 500, color: '#45474c', textDecoration: 'none' }}>O nás</a>
                    </nav>
                </div>

                {/* Right: icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

                    {/* Admin badge */}
                    {userIsAdmin && (
                        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 9999, textDecoration: 'none', fontSize: 13, fontWeight: 700, letterSpacing: '.01em', background: location.pathname.startsWith('/admin') ? '#2196f3' : '#eaf4fe', color: location.pathname.startsWith('/admin') ? '#fff' : '#1565c0' }}>
                            Admin
                        </Link>
                    )}

                    {/* Cart */}
                    {canUseCart && (
                        <div style={{ position: 'relative' }}
                            onMouseEnter={() => setCartHover(true)}
                            onMouseLeave={() => setCartHover(false)}>
                            <Link to="/cart" style={{ ...iconBtn, textDecoration: 'none', transform: cartPulse ? 'scale(1.15)' : 'scale(1)', transition: 'transform .2s' }} aria-label="Košík">
                                <ICart />
                                {totalItems > 0 && (
                                    <span style={{ position: 'absolute', top: 4, right: 2, minWidth: 16, height: 16, padding: '0 3px', borderRadius: 9999, background: '#2196f3', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {totalItems}
                                    </span>
                                )}
                            </Link>

                            {/* Cart hover popup */}
                            {cartHover && (
                                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 300, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 18px 40px rgba(15,23,42,.13)', padding: 16, zIndex: 60 }}>
                                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.6px', color: '#94a3b8', marginBottom: 10 }}>KOŠÍK</p>
                                    {items.length === 0 ? (
                                        <p style={{ fontSize: 14, color: '#94a3b8' }}>Košík je prázdny</p>
                                    ) : (
                                        <>
                                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                                {items.slice(0, 3).map((item: CartItem) => (
                                                    <li key={`${item.productId}:${item.variantReference || ''}`} style={{ fontSize: 13, color: '#45474c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.name}
                                                    </li>
                                                ))}
                                                {items.length > 3 && <li style={{ fontSize: 12, color: '#94a3b8' }}>+{items.length - 3} ďalších</li>}
                                            </ul>
                                            <div style={{ borderTop: '1px solid #eef0f2', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 13, color: '#45474c' }}>Spolu</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#1565c0' }}>{totalPrice.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* User / Login */}
                    {!isLoggedIn ? (
                        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 16px', borderRadius: 9999, textDecoration: 'none', fontSize: 13, fontWeight: 700, background: '#2196f3', color: '#fff', boxShadow: '0 2px 10px rgba(33,150,243,0.25)' }}>
                            Prihlásiť sa
                        </Link>
                    ) : canUseCart ? (
                        <div id="user-drop" style={{ position: 'relative' }}>
                            <button style={{ ...iconBtn, gap: 4, width: 'auto', padding: '0 10px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#45474c' }}
                                onClick={() => setUserDropOpen(o => !o)}>
                                <IUser /> <span className="das-userlabel" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userLabel}</span> <IChevD />
                            </button>
                            {userDropOpen && (
                                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 18px 40px rgba(15,23,42,.13)', padding: '6px 0', zIndex: 60 }}>
                                    {[{ to: '/orders', label: 'Moje objednávky' }, { to: '/profile', label: 'Môj profil' }].map(({ to, label }) => (
                                        <Link key={to} to={to} onClick={() => setUserDropOpen(false)}
                                            style={{ display: 'block', padding: '10px 16px', fontSize: 14, color: '#45474c', textDecoration: 'none', fontWeight: 500 }}
                                            onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            {label}
                                        </Link>
                                    ))}
                                    <div style={{ height: 1, background: '#eef0f2', margin: '4px 0' }} />
                                    <button onClick={() => { setUserDropOpen(false); setShowLogoutConfirm(true); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', fontSize: 14, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                        <ILogout /> Odhlásenie
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* admin — just logout icon */
                        <button onClick={() => setShowLogoutConfirm(true)} style={iconBtn} aria-label="Odhlásiť sa"><ILogout /></button>
                    )}

                    {/* Hamburger (mobile) */}
                    <button style={{ ...iconBtn, marginLeft: 4 }} className="das-menubtn" onClick={() => setMobileOpen(true)} aria-label="Menu"><IMenu /></button>
                </div>
            </div>
        </nav>

        {/* Mobile drawer */}
        {mobileOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 90 }}>
                <div onClick={() => setMobileOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,18,22,.45)', animation: 'overlayIn .2s ease' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(80vw,320px)', background: '#fff', padding: 22, display: 'flex', flexDirection: 'column', animation: 'slideIn .28s cubic-bezier(.22,1,.36,1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                        <img src={logoUrl} alt="" style={{ height: 30 }} />
                        <button onClick={() => setMobileOpen(false)} style={{ width: 36, height: 36, borderRadius: 10, background: '#f4f5f6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', color: '#45474c' }}><IClose /></button>
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column' }}>
                        {NAV.map(({ to, label }) => (
                            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                                style={{ padding: '15px 4px', fontSize: 17, fontWeight: isActive(to) ? 700 : 500, color: isActive(to) ? '#2196f3' : '#1a1c1e', borderBottom: '1px solid #eef0f2', textDecoration: 'none' }}>
                                {label}
                            </Link>
                        ))}
                        <a href={landingAboutHref} style={{ padding: '15px 4px', fontSize: 17, fontWeight: 500, color: '#1a1c1e', borderBottom: '1px solid #eef0f2', textDecoration: 'none' }}>O nás</a>
                        {canUseCart && (
                            <Link to="/cart" onClick={() => setMobileOpen(false)} style={{ padding: '15px 4px', fontSize: 17, fontWeight: 500, color: '#1a1c1e', borderBottom: '1px solid #eef0f2', textDecoration: 'none' }}>
                                Košík {totalItems > 0 && <span style={{ background: '#2196f3', color: '#fff', borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: '1px 7px', marginLeft: 6 }}>{totalItems}</span>}
                            </Link>
                        )}
                        {isLoggedIn ? (
                            <>
                                <Link to="/orders" onClick={() => setMobileOpen(false)} style={{ padding: '15px 4px', fontSize: 17, fontWeight: 500, color: '#1a1c1e', borderBottom: '1px solid #eef0f2', textDecoration: 'none' }}>Objednávky</Link>
                                <Link to="/profile" onClick={() => setMobileOpen(false)} style={{ padding: '15px 4px', fontSize: 17, fontWeight: 500, color: '#1a1c1e', borderBottom: '1px solid #eef0f2', textDecoration: 'none' }}>Profil</Link>
                                <button onClick={() => { setMobileOpen(false); setShowLogoutConfirm(true); }}
                                    style={{ marginTop: 22, height: 50, borderRadius: 12, background: '#f4f5f6', color: '#e53e3e', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Odhlásiť sa
                                </button>
                            </>
                        ) : (
                            <Link to="/login" onClick={() => setMobileOpen(false)}
                                style={{ marginTop: 22, height: 50, borderRadius: 12, background: '#2196f3', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                                Prihlásiť sa
                            </Link>
                        )}
                    </nav>
                </div>
            </div>
        )}

        <style>{`
            @keyframes overlayIn{from{opacity:0}to{opacity:1}}
            @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
            .das-navlinks{display:flex}
            .das-menubtn{display:none!important}
            .das-userlabel{display:inline}
            @media(max-width:900px){
                .das-navlinks{display:none!important}
                .das-menubtn{display:flex!important}
            }
            @media(max-width:600px){
                .das-userlabel{display:none}
            }
        `}</style>

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
