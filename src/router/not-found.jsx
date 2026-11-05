import { Link } from 'react-router-dom';
import Brand from '../components/Brand';
import './placeholder.css';
export default function NotFound() {
  return <div className="placeholder-page">
    <header className="container placeholder-header"><Brand /></header>
    <main id="main-content" className="placeholder-main not-found-main">
      <span className="eyebrow">404 · A small detour</span>
      <h1>Let’s get you<br />back to building.</h1>
      <p>This page doesn’t exist. Find your way back to Grupedia.</p>
      <Link className="btn btn-primary" to="/">Back to home</Link>
    </main>
  </div>;
}
