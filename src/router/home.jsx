import { Link } from 'react-router-dom';
import {
  LuArrowRight, LuArrowUpRight, LuBookOpen, LuBraces, LuCheck,
  LuChevronRight, LuCirclePlay, LuFolderOpen, LuGraduationCap,
  LuLayers, LuLeaf, LuRadio, LuShieldCheck, LuSparkles,
} from 'react-icons/lu';
import NavBar from '../components/nav/nav';
import Footer from '../components/footer/footer';
import './home.css';

const features = [
  {
    number: '01', icon: LuBookOpen, title: 'A home for every course.',
    description: 'Bring lessons, assessments, and learning resources together in one thoughtful, organized space.',
    detail: 'Courses & assessments',
  },
  {
    number: '02', icon: LuShieldCheck, title: 'The right people. The right access.',
    description: 'A foundation for authentication, student accounts, and educator permissions, shaped around your community.',
    detail: 'Authentication & roles',
  },
  {
    number: '03', icon: LuFolderOpen, title: 'More room for your ideas.',
    description: 'Keep videos, documents, and course materials connected to the learning experiences they belong to.',
    detail: 'Files & storage',
  },
  {
    number: '04', icon: LuRadio, title: 'Learning is better together.',
    description: 'Make space for shared work, timely feedback, and the conversations that turn a lesson into understanding.',
    detail: 'Realtime collaboration',
  },
  {
    number: '05', icon: LuSparkles, title: 'A little help. A new perspective.',
    description: 'Explore a place for AI in education, from creating teaching materials to supporting a learner’s next step.',
    detail: 'AI-powered possibilities',
  },
  {
    number: '06', icon: LuBraces, title: 'Your data. Your possibilities.',
    description: 'A Postgres and API foundation designed to connect your learning platform with the tools around it.',
    detail: 'Database & developer tools',
  },
];

function PlatformPreview() {
  return (
    <figure className="home-preview">
      <figcaption className="home-preview-caption">
        <span><span className="home-status-dot" /> Platform preview</span>
        <span>Made for possibility</span>
      </figcaption>
      <div className="home-preview-frame" aria-hidden="true">
        <div className="home-preview-bar">
          <div className="home-browser-dots"><i /><i /><i /></div>
          <span>your learning space</span><LuLayers />
        </div>
        <div className="home-preview-content">
          <div className="home-preview-rail">
            <div className="home-preview-mark"><LuLeaf /></div>
            <div className="home-preview-rail-item home-preview-rail-active"><LuBookOpen /></div>
            <div className="home-preview-rail-item"><LuGraduationCap /></div>
            <div className="home-preview-rail-item"><LuFolderOpen /></div>
            <div className="home-preview-rail-item"><LuSparkles /></div>
            <div className="home-preview-rail-avatar">JD</div>
          </div>
          <div className="home-preview-course">
            <div className="home-preview-breadcrumb">Your courses <LuChevronRight /> Design foundations</div>
            <div className="home-preview-course-heading">
              <div><span className="home-preview-overline">KEEP YOUR CURIOSITY GROWING</span><h2>A new way to see.</h2></div>
              <div className="home-preview-course-icon"><LuBookOpen /></div>
            </div>
            <div className="home-preview-cover">
              <div className="home-preview-cover-copy">
                <span>LEARNING PATH / 01</span><strong>Good ideas<br />start here.</strong>
                <span className="home-preview-cover-tag">Design foundations</span>
              </div>
              <div className="home-preview-art"><i /><i /><i /><i /></div>
              <span className="home-preview-play"><LuCirclePlay /></span>
            </div>
            <div className="home-preview-lessons-heading"><strong>Your learning path</strong><span>Sample course</span></div>
            <div className="home-preview-lesson"><span className="home-preview-check"><LuCheck /></span><span>Start with a fresh perspective</span><span>01</span></div>
            <div className="home-preview-lesson"><span className="home-preview-check home-preview-check-outline"><LuCirclePlay /></span><span>Find the ideas all around you</span><span>02</span></div>
            <div className="home-preview-progress"><span /></div>
            <div className="home-preview-bottom"><span>One small step. A world of possibility.</span><LuArrowUpRight /></div>
          </div>
        </div>
      </div>
      <div className="home-preview-note"><span><LuSparkles /></span><div><strong>A space to learn. Room to grow.</strong><p>An illustration of the experience we’re building.</p></div></div>
    </figure>
  );
}

function Home() {
  return (
    <div className="home-page">
      <NavBar />
      <main id="main-content">
        <section className="home-hero container" aria-labelledby="home-heading">
          <div className="home-hero-copy">
            <Link className="home-announcement" to="/coming-soon"><span className="home-status-dot" /><span>A new chapter for learning</span><LuArrowUpRight /></Link>
            <h1 id="home-heading">Build your LMS.<br />Put <span>learning</span><br />first.</h1>
            <p className="home-hero-description">Big ideas deserve a better place to grow. We’re building a learning platform that brings your courses, your people, and your tools together.</p>
            <div className="home-hero-actions"><Link className="btn btn-primary" to="/register">Start your journey <LuArrowRight /></Link><a className="home-text-link" href="#platform">Explore the platform <LuArrowUpRight /></a></div>
            <div className="home-hero-footnote"><span className="home-tiny-leaf"><LuLeaf /></span><span>Built around educators. Inspired by learners.</span></div>
          </div>
          <PlatformPreview />
        </section>

        <section className="home-principles" aria-label="Our approach">
          <div className="container home-principles-inner">
            <p>Less complexity.<br /><strong>More possibility.</strong></p>
            <div><LuBookOpen /><span>Learning at the center</span></div>
            <div><LuLayers /><span>Connected by design</span></div>
            <div><LuLeaf /><span>Space to grow</span></div>
          </div>
        </section>

        <section className="home-platform container" id="platform" aria-labelledby="platform-heading">
          <div className="home-section-top">
            <div><span className="eyebrow">ONE PLATFORM. A BIGGER PICTURE.</span><h2 className="section-heading" id="platform-heading">Everything connects.<br /><span>So learning can happen.</span></h2></div>
            <p>From that first lesson to the next big idea, our vision brings the essentials of a modern LMS into one place.</p>
          </div>
          <div className="home-feature-grid">
            {features.map(({ number, icon: Icon, title, description, detail }) => (
              <article className="home-feature-card" key={number}>
                <div className="home-feature-card-top"><span className="home-feature-icon"><Icon /></span><span className="home-feature-number">{number}</span></div>
                <h3>{title}</h3><p>{description}</p><span className="home-feature-detail">{detail}</span>
              </article>
            ))}
          </div>
          <p className="home-development-note"><span className="home-status-dot" /> A platform in the making. These features describe our product direction and are not yet available.</p>
        </section>

        <section className="home-connections container" aria-labelledby="connections-heading">
          <div className="home-connections-copy">
            <span className="eyebrow">YOUR TOOLS, IN THE PICTURE</span>
            <h2 className="section-heading" id="connections-heading">Your world.<br /><span>A little more connected.</span></h2>
            <p>Great learning doesn’t happen in a silo. We’re exploring connections with the tools educators and developers already love.</p>
            <Link className="home-text-link" to="/coming-soon">Follow what’s next <LuArrowUpRight /></Link>
          </div>
          <div className="home-integrations" aria-label="Tools we are exploring">
            <div className="home-integration-orbit">
              <span className="home-integration-chip home-chip-postgres"><LuLayers /> PostgreSQL</span>
              <span className="home-integration-chip home-chip-openai"><LuSparkles /> OpenAI</span>
              <span className="home-integration-brand"><LuLeaf /><span>grupedia</span></span>
              <span className="home-integration-chip home-chip-video"><LuCirclePlay /> Video & media</span>
              <span className="home-integration-chip home-chip-api"><LuBraces /> Your API</span>
            </div>
            <p>Integration concepts · availability to be announced</p>
          </div>
        </section>

        <section className="home-cta container" aria-labelledby="cta-heading">
          <div className="home-cta-decoration" aria-hidden="true"><i /><i /><i /></div>
          <div className="home-cta-content">
            <span className="eyebrow">LET’S MAKE ROOM FOR BETTER LEARNING</span>
            <h2 id="cta-heading">Your next chapter<br />starts with an idea.</h2>
            <p>We’re building Grupedia for people who believe learning can be better. Be part of what comes next.</p>
            <Link className="btn btn-primary" to="/register">Start your journey <LuArrowRight /></Link>
          </div>
          <span className="home-cta-corner" aria-hidden="true"><LuLeaf /></span>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Home;
