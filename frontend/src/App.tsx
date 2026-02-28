import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
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
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ComplaintsPage from './pages/ComplaintsPage';
import WithdrawalPage from './pages/WithdrawalPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OrdersPage from './pages/OrdersPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
          <Toaster position="top-right" />
          <ScrollToTop />
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Navigate to="/products" replace />} />
              <Route path="/products" element={<ProductsPage />} />
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
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/withdrawal" element={<WithdrawalPage />} />
              <Route path="*" element={<Navigate to="/products" replace />} />
            </Routes>
          </main>
          <footer className="bg-gradient-to-b from-blue-950 to-[#07101f] border-t border-white/10 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              {/* Top row: brand + tagline */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8 pb-8 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <svg className="h-9 w-9 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                  <div>
                    <p className="text-lg font-bold text-white tracking-wide">DentalShop</p>
                    <p className="text-xs text-blue-400/70 mt-0.5">Dentálne implantáty najvyššej kvality</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-12 gap-y-2.5 text-sm">
                  <p className="col-span-2 text-[10px] text-blue-400/60 uppercase tracking-[0.15em] font-semibold mb-1">Právne informácie</p>
                  <Link to="/terms" className="text-blue-300/80 hover:text-white transition-colors">Obchodné podmienky</Link>
                  <Link to="/privacy" className="text-blue-300/80 hover:text-white transition-colors">Ochrana osobných údajov</Link>
                  <Link to="/complaints" className="text-blue-300/80 hover:text-white transition-colors">Reklamačný poriadok</Link>
                  <Link to="/withdrawal" className="text-blue-300/80 hover:text-white transition-colors">Odstúpenie od zmluvy</Link>
                </div>
              </div>
              {/* Bottom row: copyright */}
              <div className="pt-6 text-center text-xs text-blue-500/60">
                © {new Date().getFullYear()} DentalShop &mdash; Dentálne Implantáty. Všetky práva vyhradené.
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
