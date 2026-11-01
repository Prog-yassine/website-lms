import { LuArrowUpRight } from "react-icons/lu";
import { Link } from "react-router-dom";
import Brand from "../Brand";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-intro">
          <Brand />
          <p>A platform for building apps.<br />A foundation for what comes next.</p>
          <span className="footer-status"><span aria-hidden="true" /> Your next build starts here</span>
        </div>
        <nav className="footer-link-group" aria-label="Product links">
          <h2>Platform</h2>
          <a href="/#platform">Overview</a>
          <Link to="/pricing">Pricing</Link>
          <Link to="/register">Get started</Link>
        </nav>
        <nav className="footer-link-group" aria-label="Resource links">
          <h2>Resources</h2>
          <Link to="/devs">Developers</Link>
          <Link to="/docs">Documentation</Link>
          <Link to="/coming-soon">What’s next</Link>
        </nav>
        <nav className="footer-link-group" aria-label="Account links">
          <h2>Your account</h2>
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create an account</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Grupedia. All rights reserved.</p>
        <p>Built for the apps you imagine.<span aria-hidden="true"> <LuArrowUpRight /></span></p>
      </div>
    </footer>
  );
}
