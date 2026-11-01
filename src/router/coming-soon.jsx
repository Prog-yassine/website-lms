import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuArrowRight, LuBookOpen, LuLayers, LuSparkles, LuLogOut } from 'react-icons/lu';
import Brand from '../components/Brand';
import './placeholder.css';

export default function ComingSoon() {
  const navigate = useNavigate();
  const [hasSession] = useState(() => Boolean(localStorage.getItem('token')));
  function signOut() {
    localStorage.removeItem('token');
    navigate('/login', { replace:true });
  }
  return <div className="placeholder-page">
    <header className="container placeholder-header">
      <Brand />
      {hasSession ? <button className="placeholder-signout" onClick={signOut}><LuLogOut aria-hidden="true" /> Sign out</button> : <Link className="placeholder-signout" to="/">Back to home <LuArrowRight aria-hidden="true" /></Link>}
    </header>
    <main id="main-content" className="placeholder-main">
      <div className="placeholder-art" aria-hidden="true">
        <div className="placeholder-orbit orbit-one" /><div className="placeholder-orbit orbit-two" />
        <span className="placeholder-floating floating-book"><LuBookOpen /></span>
        <span className="placeholder-floating floating-layers"><LuLayers /></span>
        <div className="placeholder-center"><img src={`${process.env.PUBLIC_URL}/logo.svg`} alt="" width="66" height="66" /></div>
        <span className="placeholder-spark"><LuSparkles /></span>
      </div>
      <span className="placeholder-status"><span /> A little more time. A better learning experience.</span>
      <h1>Coming soon<span>.</span></h1>
      <p>Good things are taking shape.<br />We’re building a thoughtful space for your courses, your community, and everything you’ll teach next.</p>
      <Link className="btn btn-primary" to="/">Explore Grupedia <LuArrowRight aria-hidden="true" /></Link>
      <p className="placeholder-note">The workspace is being prepared. Check back for what’s next.</p>
    </main>
    <footer className="placeholder-footer">© {new Date().getFullYear()} Grupedia <span>Made for the way you teach.</span></footer>
  </div>;
}
