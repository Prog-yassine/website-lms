import { LuArrowUpRight } from "react-icons/lu";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import Brand from "../Brand";
import "./nav.css";

const navigation = [
  { to: "/devs", label: "Developers" },
  { to: "/pricing", label: "Pricing" },
  { to: "/docs", label: "Docs" },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButton = useRef(null);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, hash]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButton.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <header className="site-header">
      <nav className="site-nav container" aria-label="Main navigation">
        <Brand />
        <div className="desktop-navigation">
          <a className="nav-link" href="/#platform">Platform</a>
          {navigation.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="desktop-nav-actions">
          <Link className="nav-sign-in" to="/login">Sign in</Link>
          <Link className="btn btn-primary nav-get-started" to="/register">
            Get started <span aria-hidden="true"><LuArrowUpRight /></span>
          </Link>
        </div>
        <button
          ref={menuButton}
          className="mobile-menu-toggle"
          type="button"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </nav>
      {isOpen && (
        <div className="mobile-navigation" id="mobile-navigation">
          <div className="container mobile-navigation-inner">
            <a className="mobile-nav-link" href="/#platform" onClick={closeMenu}>Platform</a>
            {navigation.map(({ to, label }) => (
              <NavLink key={to} to={to} className="mobile-nav-link" onClick={closeMenu}>{label}</NavLink>
            ))}
            <div className="mobile-navigation-actions">
              <Link className="btn btn-secondary" to="/login" onClick={closeMenu}>Sign in</Link>
              <Link className="btn btn-primary" to="/register" onClick={closeMenu}>Get started <span aria-hidden="true"><LuArrowUpRight /></span></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
