import { Link } from 'react-router-dom';
import {
  LuArrowRight, LuArrowUpRight, LuBookOpen, LuBraces, LuCheck,
  LuChevronRight, LuCirclePlay, LuFolderOpen,
  LuLayers, LuLeaf, LuDatabase, LuShieldCheck, LuSparkles,
} from 'react-icons/lu';
import NavBar from '../components/nav/nav';
import Footer from '../components/footer/footer';
import './home.css';

const features = [
  {
    number: '01', icon: LuDatabase, title: 'Your data. A solid foundation.',
    description: 'Store products, profiles, and the data behind your app in Postgres. Connect your tables to the pages that use them.',
    detail: 'Postgres database',
  },
  {
    number: '02', icon: LuShieldCheck, title: 'Your app. Their own account.',
    description: 'Add sign-up, sign-in, and user permissions to your own branded app, with authentication connected to your data.',
    detail: 'Authentication & roles',
  },
  {
    number: '03', icon: LuFolderOpen, title: 'A place for every upload.',
    description: 'Store product photos, profile images, and documents. Connect uploads to your app and display files where they belong.',
    detail: 'Files & storage',
  },
  {
    number: '04', icon: LuLayers, title: 'A template. A head start.',
    description: 'Start with a frontend template made by a developer, then customize the pages, content, and branding to make it yours.',
    detail: 'Developer-made templates',
  },
  {
    number: '05', icon: LuBraces, title: 'Give every button a purpose.',
    description: 'Bind a product list to database rows, connect a details button to a page, and link a form to the data it should save.',
    detail: 'Interface & data connections',
  },
  {
    number: '06', icon: LuSparkles, title: 'Add what your app needs.',
    description: 'Extend your project with developer plugins, such as Stripe for payments. Choose the services that fit your app.',
    detail: 'Plugins & integrations',
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
          <span>your application workspace</span><LuLayers />
        </div>
        <div className="home-preview-content">
          <div className="home-preview-rail">
            <div className="home-preview-mark"><LuLeaf /></div>
            <div className="home-preview-rail-item home-preview-rail-active"><LuBookOpen /></div>
            <div className="home-preview-rail-item"><LuBraces /></div>
            <div className="home-preview-rail-item"><LuFolderOpen /></div>
            <div className="home-preview-rail-item"><LuSparkles /></div>
            <div className="home-preview-rail-avatar">JD</div>
          </div>
          <div className="home-preview-course">
            <div className="home-preview-breadcrumb">Your app <LuChevronRight /> Product catalog</div>
            <div className="home-preview-course-heading">
              <div><span className="home-preview-overline">START WITH A DEVELOPER TEMPLATE</span><h2>A storefront of your own.</h2></div>
              <div className="home-preview-course-icon"><LuDatabase /></div>
            </div>
            <div className="home-preview-cover">
              <div className="home-preview-cover-copy">
                <span>STOREFRONT TEMPLATE / 01</span><strong>Your products.<br />Your storefront.</strong>
                <span className="home-preview-cover-tag">Product listing app</span>
              </div>
              <div className="home-preview-art"><i /><i /><i /><i /></div>
              <span className="home-preview-play"><LuCirclePlay /></span>
            </div>
            <div className="home-preview-lessons-heading"><strong>Connect your app</strong><span>Illustrative setup</span></div>
            <div className="home-preview-lesson"><span className="home-preview-check"><LuCheck /></span><span>products table → product cards</span><span>01</span></div>
            <div className="home-preview-lesson"><span className="home-preview-check home-preview-check-outline"><LuCirclePlay /></span><span>View product → details page</span><span>02</span></div>
            <div className="home-preview-progress"><span /></div>
            <div className="home-preview-bottom"><span>Add accounts, file storage, and a Stripe plugin.</span><LuArrowUpRight /></div>
          </div>
        </div>
      </div>
      <div className="home-preview-note"><span><LuSparkles /></span><div><strong>One template. Your own application.</strong><p>An illustration of the workflow we’re building.</p></div></div>
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
            <Link className="home-announcement" to="/coming-soon"><span className="home-status-dot" /><span>Your next app starts here</span><LuArrowUpRight /></Link>
            <h1 id="home-heading">Build your app.<br />Make it <span>your</span><br />own.</h1>
            <p className="home-hero-description">Start with a developer template. Connect your database, authentication, and storage. Add plugins like Stripe, then customize every part of your app.</p>
            <div className="home-hero-actions"><Link className="btn btn-primary" to="/register">Start your project <LuArrowRight /></Link><a className="home-text-link" href="#platform">Explore the platform <LuArrowUpRight /></a></div>
            <div className="home-hero-footnote"><span className="home-tiny-leaf"><LuLeaf /></span><span>Your frontend. Your backend. Connected.</span></div>
          </div>
          <PlatformPreview />
        </section>

        <section className="home-principles" aria-label="Our approach">
          <div className="container home-principles-inner">
            <p>One idea.<br /><strong>All the building blocks.</strong></p>
            <div><LuBookOpen /><span>Your data, connected</span></div>
            <div><LuLayers /><span>Your template, customized</span></div>
            <div><LuLeaf /><span>Your plugins, your choice</span></div>
          </div>
        </section>

        <section className="home-platform container" id="platform" aria-labelledby="platform-heading">
          <div className="home-section-top">
            <div><span className="eyebrow">THE BACKEND BLOCKS. THE FRONTEND FREEDOM.</span><h2 className="section-heading" id="platform-heading">The building blocks.<br /><span>Your application.</span></h2></div>
            <p>Build a product catalog, a member portal, or your next SaaS. Bring the frontend and the services behind it together.</p>
          </div>
          <div className="home-feature-grid">
            {features.map(({ number, icon: Icon, title, description, detail }) => (
              <article className="home-feature-card" key={number}>
                <div className="home-feature-card-top"><span className="home-feature-icon"><Icon /></span><span className="home-feature-number">{number}</span></div>
                <h3>{title}</h3><p>{description}</p><span className="home-feature-detail">{detail}</span>
              </article>
            ))}
          </div>
          <p className="home-development-note"><span className="home-status-dot" /> A platform in the making. Templates, connections, and plugins are part of our upcoming product.</p>
        </section>

        <section className="home-connections container" aria-labelledby="connections-heading">
          <div className="home-connections-copy">
            <span className="eyebrow">FROM TEMPLATE TO YOUR OWN APP</span>
            <h2 className="section-heading" id="connections-heading">A product listing app.<br /><span>Connected, your way.</span></h2>
            <p>Choose a storefront template. Connect product cards to your database and “View product” buttons to a details page. Add customer accounts, upload product photos, and extend checkout with a Stripe plugin.</p>
            <Link className="home-text-link" to="/devs">Explore the developer ecosystem <LuArrowUpRight /></Link>
          </div>
          <div className="home-integrations" aria-label="Illustrative product app connections">
            <div className="home-integration-orbit">
              <span className="home-integration-chip home-chip-postgres"><LuLayers /> PostgreSQL</span>
              <span className="home-integration-chip home-chip-openai"><LuSparkles /> Stripe plugin</span>
              <span className="home-integration-brand"><LuLeaf /><span>grupedia</span></span>
              <span className="home-integration-chip home-chip-video"><LuFolderOpen /> Product photos</span>
              <span className="home-integration-chip home-chip-api"><LuBraces /> Your template</span>
            </div>
            <p>Example workflow · templates and plugins coming soon</p>
          </div>
        </section>

        <section className="home-cta container" aria-labelledby="cta-heading">
          <div className="home-cta-decoration" aria-hidden="true"><i /><i /><i /></div>
          <div className="home-cta-content">
            <span className="eyebrow">YOUR IDEA. YOUR FRONTEND. YOUR FOUNDATION.</span>
            <h2 id="cta-heading">Your next idea.<br />An app of your own.</h2>
            <p>From a product catalog to your next SaaS, start with the building blocks and shape the application you have in mind.</p>
            <Link className="btn btn-primary" to="/register">Start your project <LuArrowRight /></Link>
          </div>
          <span className="home-cta-corner" aria-hidden="true"><LuLeaf /></span>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Home;
