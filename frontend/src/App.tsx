import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import ShopLayout from './components/ShopLayout';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';
import AdminOrders from './pages/AdminOrders';
import AdminSettings from './pages/AdminSettings';
import AdminGrouping from './pages/AdminGrouping';
import AdminInventory from './pages/AdminInventory';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ComplaintsPage from './pages/ComplaintsPage';
import WithdrawalPage from './pages/WithdrawalPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OrdersPage from './pages/OrdersPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import { Toaster } from 'react-hot-toast';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const COOKIE_CONSENT_KEY = 'cookie_consent';
const CONSENT_EVENT = 'cookie-consent-changed';
let sentryInitialized = false;

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
  });
  sentryInitialized = true;
}

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    initSentryIfConsented();
    const onConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail === 'accepted') {
        initSentryIfConsented();
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
          <Routes>
          {/* Representative page — no navbar, no footer */}
          <Route path="/" element={<HomePage />} />

          {/* E-shop — with Navbar + footer */}
          <Route element={<ShopLayout />}>
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/verify-email/:uid/:token" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/grouping" element={<AdminGrouping />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/withdrawal" element={<WithdrawalPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
