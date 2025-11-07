import React, { useMemo } from 'react';
import NavBar from "../nav/nav";
import Footer from "../footer/footer";
import InfiniteDivs from '../infinity-loop/InfiniteDivs';

const Feature = ({ title, desc, icon }) => (
  <div className="bg-white rounded-lg p-6 shadow-sm">
    <div className="flex items-start gap-4">
      <div className="flex-none w-12 h-12 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">{icon}</div>
      <div>
        <h4 className="font-semibold text-gray-800">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{desc}</p>
      </div>
    </div>
  </div>
);

const DevToolsLanding = () => {
  return (
    <div className="w-full font-sans min-h-screen bg-gray-50">
      <NavBar />
 
       <header className="pt-28 pb-8">
         <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">Developer tools & Integrations</h1>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">Build plugins, access admin-scoped datasets, and extend your university's LMS with secure, performant APIs. Admins control which datasets are available and who can access them.</p>

          {/* center logo with particle background */}
          <div className="relative my-8 flex items-center justify-center">
            {/* larger centered logo/div (on top) */}
            <div className="relative z-10 flex items-center justify-center w-48 h-48 rounded-full bg-emerald-50 border border-emerald-100 shadow-[0px_0px_100px_20px_rgba(34,_197,_94,_0.5)]">
              {/* replace with your actual logo SVG/component if you have one */}
              <div className="text-emerald-600 font-bold">APP LOGO</div>
            </div>

            {/* infinite row of 50x50 divs sliding right→left behind the logo */}
            <InfiniteDivs count={20} size={100} speed={0.6} color="rgba(16,185,129,1)" />
          </div>

          <div className="mt-10 flex items-center justify-center gap-4">
            <a className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-md font-medium" href="#">Request Access</a>
            <a className="inline-block text-emerald-600 border border-emerald-200 px-6 py-3 rounded-md font-medium" href="#">View docs</a>
          </div>
        </div>
      </header>

      {/* no extra keyframes required; infinite strip uses transform animation via requestAnimationFrame */}

      <main className="max-w-6xl mx-auto px-6 pb-20">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Feature
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v6" /></svg>}
            title="Secure API keys"
            desc="Admin-scoped API keys let you request access to read-only datasets; keys are approved and scoped by admins."
          />

          <Feature
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>}
            title="Plugin framework"
            desc="Ship small integrations that run near the data and surface new capabilities for instructors and students."
          />

          <Feature
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a4 4 0 004 4h10"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7v10a2 2 0 01-2 2H7"/></svg>}
            title="Data privacy first"
            desc="All requests are logged and governed. Admins can grant, revoke, and scope access per-project."
          />
        </section>

        <section className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800">How it works</h3>
          <ol className="mt-4 space-y-3 text-gray-600">
            <li><strong className="text-gray-800">1.</strong> Developers request access to datasets or create plugins via the developer portal.</li>
            <li><strong className="text-gray-800">2.</strong> Admins review requests and grant API keys scoped to only the necessary data.</li>
            <li><strong className="text-gray-800">3.</strong> Use the provided API key in requests to read approved data; keys can be rotated by admins at any time.</li>
          </ol>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">APIs & SDKs</h3>
            <p className="mt-2 text-gray-600">We expose REST endpoints and provide SDKs for quick integration. Sample usage (read-only):</p>
            <pre className="mt-4 bg-gray-100 p-3 rounded text-sm text-gray-700">{"fetch('/api/v1/students', { headers: { Authorization: 'Bearer <API_KEY>' } })"}</pre>
            <p className="mt-3 text-xs text-gray-500">Note: In this demo the APIs are placeholders. Connect to your university database and an auth server to enable real keys.</p>
          </div>

          <aside className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-md font-semibold">Get started</h4>
            <p className="text-sm text-gray-600 mt-2">Request an API key or contact your university admin to enable dataset access.</p>
            <div className="mt-4">
              <a className="block text-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md" href="#">Request API Key</a>
            </div>
          </aside>
        </section>

        <section className="mt-10 text-center text-sm text-gray-500">
          <p>Admins: dataset access and API policy lives in the admin dashboard. Developers: keys are scoped and can be revoked anytime.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DevToolsLanding;
