import React from "react";
import { Link } from "react-router-dom";
import { LuArrowLeft, LuBookOpen, LuCalendarDays, LuCheck, LuGraduationCap, LuLayers, LuSparkles } from "react-icons/lu";
import "./auth.css";

function LearningIllustration() {
  return (
    <div className="auth-illustration" aria-hidden="true">
      <div className="auth-orbit auth-orbit-outer" />
      <div className="auth-orbit auth-orbit-inner" />
      <div className="auth-orbit-dot auth-orbit-dot-one" />
      <div className="auth-orbit-dot auth-orbit-dot-two" />
      <div className="auth-learning-card">
        <div className="auth-card-heading">
          <span className="auth-card-icon"><LuBookOpen /></span>
          <span className="auth-card-menu">•••</span>
        </div>
        <span className="auth-card-kicker">YOUR LEARNING SPACE</span>
        <h3>Good things grow<br />when we learn together.</h3>
        <div className="auth-course-row"><span className="auth-course-dot" /> Courses & resources <LuCheck /></div>
        <div className="auth-course-row"><span className="auth-course-dot" /> People & conversations <LuCheck /></div>
        <div className="auth-course-row"><span className="auth-course-dot" /> Ideas & possibilities <LuCheck /></div>
        <div className="auth-card-bottom"><span className="auth-card-avatar">G</span><span>A space to make it yours.</span><LuArrowLeft /></div>
      </div>
      <div className="auth-floating-card auth-floating-course"><span><LuGraduationCap /></span><div><strong>Made for your community</strong><small>Learning, without the limits.</small></div></div>
      <div className="auth-floating-card auth-floating-calendar"><span><LuCalendarDays /></span><div><strong>A little more organized.</strong><small>A lot more connected.</small></div></div>
      <div className="auth-float-icon"><LuLayers /></div>
    </div>
  );
}

export default function AuthLayout({ children, mode = "login" }) {
  return (
    <main className={`auth-page auth-page-${mode}`}>
      <section className="auth-left" aria-label={mode === "register" ? "Create a Grupedia account" : "Sign in to Grupedia"}>
        <Link className="brand auth-brand" to="/" aria-label="Grupedia home">
          <img src={`${process.env.PUBLIC_URL || ""}/logo.svg`} alt="" width="38" height="32" />
          <span>Grupedia<span className="auth-brand-period">.</span></span>
        </Link>
        <div className="auth-form-wrap">{children}</div>
        <div className="auth-page-footer"><Link to="/"><LuArrowLeft aria-hidden="true" /> Back to home</Link><span>© {new Date().getFullYear()} Grupedia</span></div>
      </section>
      <aside className="auth-story" aria-label="About Grupedia">
        <div className="auth-story-top"><span className="auth-story-status" /> A BETTER WAY TO LEARN, TOGETHER</div>
        <div className="auth-story-content">
          <h2>Your people.<br />Your platform.<br /><span>Your possibilities.</span></h2>
          <p>Bring your community, courses, and favorite tools into one thoughtful learning experience.</p>
          <LearningIllustration />
        </div>
        <div className="auth-story-footer"><span>Built for learning. Designed around you.</span><span className="auth-story-spark" aria-hidden="true"><LuSparkles /></span></div>
      </aside>
    </main>
  );
}
