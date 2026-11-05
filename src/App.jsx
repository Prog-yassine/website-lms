import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './router/home';
import Login from './router/login';
import Register from './router/register';
import Pricing from './router/pricing';
import Developer from './router/developer';
import ComingSoon from './router/coming-soon';
import NotFound from './router/not-found';
import Dashboard from './router/dashboard';
import Authentication from './router/authentication';
import Storage from './router/storage';
import DashboardLayout from './components/dashboard/DashboardLayout';
import { AuthProvider, useAuth } from './auth/AuthContext';

const titles = { '/': 'Your app. Your way.', '/login': 'Sign in', '/register': 'Create your account', '/pricing': 'Pricing', '/devs': 'Built for developers', '/docs': 'Developer resources', '/coming-soon': 'Coming soon', '/dashboard': 'Table editor', '/dashboard/database': 'Table editor', '/dashboard/auth': 'Authentication', '/dashboard/storage': 'Storage' };

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const title = titles[pathname] || (pathname.startsWith('/dashboard/') ? 'Workspace' : 'Page not found');
    document.title = `${title} · Grupedia`;
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function ProtectedRoute({ children }) {
  const { status } = useAuth();
  if (status === 'loading') {
    return <main id="main-content" className="placeholder-main">
      <p className="eyebrow">Opening your workspace</p>
      <h1>One moment<span>.</span></h1>
      <p role="status" aria-live="polite">Checking your session…</p>
    </main>;
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}

export function AppRoutes() {
  return <>
    <RouteEffects />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/devs" element={<Developer />} />
      <Route path="/docs" element={<Developer />} />
      <Route path="/coming-soon" element={<ComingSoon />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="database" element={<Dashboard />} />
        <Route path="auth" element={<Authentication />} />
        <Route path="storage" element={<Storage />} />
      </Route>
      <Route path="/dashboard/*" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}
