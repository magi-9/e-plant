import { Link, useLocation } from 'react-router-dom';
import { authService } from '../api/authService';

const NAV_ITEMS = [
    { href: '/admin/products', label: 'Produkty' },
    { href: '/admin/inventory', label: 'Sklad' },
    { href: '/admin/orders', label: 'Objednávky' },
    { href: '/admin/users', label: 'Zákazníci' },
    { href: '/admin/grouping', label: 'Grupovanie' },
    { href: '/admin/settings', label: 'Nastavenia' },
];

const GRAD = 'linear-gradient(135deg, #06b6d4, #3b82f6)';

export default function AdminNav() {
    const location = useLocation();
    const userMeta = authService.getUserMeta();
    const initials = userMeta?.email
        ? userMeta.email.slice(0, 2).toUpperCase()
        : 'AD';

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 50, height: 60,
            background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
            <div style={{
                maxWidth: 1440, margin: '0 auto', padding: '0 32px',
                height: '100%', display: 'flex', alignItems: 'center', gap: 24,
            }}>
                <Link to="/admin" style={{
                    fontWeight: 800, fontSize: 17, letterSpacing: '-0.04em',
                    background: GRAD, WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent', textDecoration: 'none',
                    flexShrink: 0,
                }}>
                    E-Plant · Admin
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {NAV_ITEMS.map(({ href, label }) => {
                        const active = location.pathname === href;
                        return (
                            <Link
                                key={href}
                                to={href}
                                style={{
                                    padding: '6px 13px', borderRadius: 8,
                                    fontSize: 13.5, fontWeight: active ? 700 : 500,
                                    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                                    background: active ? 'rgba(6,182,212,0.15)' : 'transparent',
                                    textDecoration: 'none', transition: 'all 0.12s',
                                    border: active
                                        ? '1px solid rgba(6,182,212,0.30)'
                                        : '1px solid transparent',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {userMeta?.email && (
                        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
                            {userMeta.email}
                        </span>
                    )}
                    <div style={{
                        width: 30, height: 30, borderRadius: '50%', background: GRAD,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                        {initials}
                    </div>
                </div>
            </div>
        </nav>
    );
}
