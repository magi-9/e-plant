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

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
          <Toaster position="top-right" />
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
            </Routes>
          </main>
          <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border-t border-blue-700 mt-auto">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-blue-100 text-sm">
                <div>
                  &copy; 2026 DentalShop - Dentálne Implantáty. Všetky práva vyhradené.
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/terms" className="hover:text-white transition-colors">Obchodné podmienky</Link>
                  <Link to="/privacy" className="hover:text-white transition-colors">Ochrana osobných údajov</Link>
                  <Link to="/complaints" className="hover:text-white transition-colors">Reklamačný poriadok</Link>
                  <Link to="/withdrawal" className="hover:text-white transition-colors">Odstúpenie od zmluvy</Link>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
