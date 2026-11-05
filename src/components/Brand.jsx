import { Link } from "react-router-dom";
import "./Brand.css";

export default function Brand({ className = "" }) {
  return (
    <Link className={`grupedia-brand ${className}`.trim()} to="/" aria-label="Grupedia home">
      <img src={`${process.env.PUBLIC_URL || ""}/logo.svg`} alt="" width="35" height="29" />
      <span>Grupedia<span className="brand-period" aria-hidden="true">.</span></span>
    </Link>
  );
}
