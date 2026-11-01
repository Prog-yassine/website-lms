import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './router/home';
import Login from './router/login';
import Register from './router/register';
import Pricing from './router/pricing';
import Developer from './router/developer';
import ComingSoon from './router/coming-soon';
import NotFound from './router/not-found';

const titles = { '/': 'Your app. Your way.', '/login': 'Sign in', '/register': 'Create your account', '/pricing': 'Pricing', '/devs': 'Built for developers', '/docs': 'Developer resources', '/coming-soon': 'Coming soon' };

function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title = `${titles[pathname] || 'Page not found'} · Grupedia`;
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
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
      <Route path="/dashboard/*" element={<Navigate to="/coming-soon" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>;
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
