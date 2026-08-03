import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop.jsx';
import Landing from './pages/Landing';
import Waitlist from './pages/Waitlist';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import PaymentCallback from './pages/PaymentCallback';

import StudentDashboard from './pages/student/Dashboard';
import LecturerDashboard from './pages/lecturer/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

import AffiliateWelcome from './pages/affiliate/Welcome';
import AffiliateRegister from './pages/affiliate/Register';
import AffiliateLogin from './pages/affiliate/Login';
import AffiliateDashboard from './pages/affiliate/Dashboard';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
       <ScrollToTop />
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/waitlist" element={<Waitlist />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy-policy" element={<Privacy />} />
              <Route path="/terms-of-service" element={<Terms />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />

              {/* Student */}
              <Route path="/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />

              {/* Lecturer — reachable via /lecturer even though it's not in the nav */}
              <Route path="/lecturer" element={<Login />} />
              <Route path="/lecturer/dashboard" element={<ProtectedRoute role="lecturer"><LecturerDashboard /></ProtectedRoute>} />

              {/* Admin — reachable via /admin even though it's not in the nav */}
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

              {/* Affiliate */}
              <Route path="/affiliate" element={<AffiliateWelcome />} />
              <Route path="/affiliate/register" element={<AffiliateRegister />} />
              <Route path="/affiliate/login" element={<AffiliateLogin />} />
              <Route path="/affiliate/dashboard" element={<ProtectedRoute role="affiliate"><AffiliateDashboard /></ProtectedRoute>} />

              {/* Path-based referral links: techgrind.com/adelove -> register form prefilled.
                  Must stay LAST so it never shadows a named route above. */}
              <Route path="/:referralCode" element={<Register />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
