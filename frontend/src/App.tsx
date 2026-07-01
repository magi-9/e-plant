import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ShopLayout from './components/ShopLayout';
import CookieConsent from './components/CookieConsent';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CatalogsPage from './pages/CatalogsPage';
import AuthPage from './pages/AuthPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';
import AdminOrders from './pages/AdminOrders';
import AdminSettings from './pages/AdminSettings';
import AdminGrouping from './pages/AdminGrouping';
import AdminCategories from './pages/AdminCategories';
import AdminInventory from './pages/AdminInventory';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ComplaintsPage from './pages/ComplaintsPage';
import WithdrawalPage from './pages/WithdrawalPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OrdersPage from './pages/OrdersPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import { getLandingHomeHref } from './utils/landingLinks';
import { isAdmin } from './api/auth';
import { authService } from './api/authService';

import { Toaster } from 'react-hot-toast';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const COOKIE_CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie-consent-changed';
const LANDING_HOST = (import.meta.env.VITE_LANDING_HOST as string | undefined) || 'ebringer.sk';
const SHOP_HOST = (import.meta.env.VITE_SHOP_HOST as string | undefined) || 'dynamicabutment.ebringer.sk';
let sentryInitialized = false;

function isMatchingHost(currentHost: string, expectedHost: string): boolean {
  return currentHost === expectedHost;
}

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    const currentUrl = window.location.href;
    const targetUrl = new URL(to, window.location.origin).href;
    if (currentUrl !== targetUrl) {
      window.location.replace(targetUrl);
    }
  }, [to]);
  return null;
}

function CustomerOnlyRoute({ children }: { children: ReactElement }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function initSentryIfConsented() {
  if (sentryInitialized || !SENTRY_DSN) {
    return;
  }
  if (localStorage.getItem(COOKIE_CONSENT_KEY) !== 'accepted') {
    return;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    ignoreErrors: [
      // iubenda-radar compliance crawler injects a script referencing its own SDK
      // which isn't installed on this site — pure bot noise, not a real user error
      'TrackerStorageType is not defined',
    ],
  });
  sentryInitialized = true;
}

function disableSentryIfInitialized() {
  if (!sentryInitialized) {
    return;
  }
  void Sentry.close(2000);
  sentryInitialized = false;
}

const queryClient = new QueryClient();

function App() {
  const currentHost = window.location.hostname.toLowerCase();
  const normalizedLandingHost = LANDING_HOST.toLowerCase();
  const normalizedShopHost = SHOP_HOST.toLowerCase();
  const hostSplitEnabled = !import.meta.env.DEV && normalizedLandingHost !== normalizedShopHost;
  const isLandingHost = hostSplitEnabled && isMatchingHost(currentHost, normalizedLandingHost);
  const shopProductsUrl = `${window.location.protocol}//${SHOP_HOST}/products`;
  const landingHomeHref = getLandingHomeHref();

  useEffect(() => {
    initSentryIfConsented();
    const onConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail === 'accepted') {
        initSentryIfConsented();
      } else if (customEvent.detail === 'declined') {
        disableSentryIfInitialized();
      }
    };
    window.addEventListener(CONSENT_EVENT, onConsentChange);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsentChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <CookieConsent />
          <Routes>
          {/* E-shop — with Navbar + footer */}
          <Route element={<ShopLayout />}>
            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/home" element={<Navigate to="/products" replace />} />
            <Route
              path="/products"
              element={isLandingHost ? <ExternalRedirect to={shopProductsUrl} /> : <ProductsPage />}
            />
            <Route
              path="/products/:id"
              element={isLandingHost ? <ExternalRedirect to={shopProductsUrl} /> : <ProductDetailPage />}
            />
            <Route path="/catalogs" element={<CatalogsPage />} />
            <Route path="/about" element={<ExternalRedirect to={landingHomeHref} />} />
            <Route path="/cart" element={<CustomerOnlyRoute><CartPage /></CustomerOnlyRoute>} />
            <Route path="/checkout" element={<CustomerOnlyRoute><CheckoutPage /></CustomerOnlyRoute>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/verify-email/:uid/:token" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/grouping" element={<AdminGrouping />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/withdrawal" element={<WithdrawalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
