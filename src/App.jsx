import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import Home from './router/home';


import Organization from './router/organization';
import NewOrganization from './router/new_organization';
import NewDivision from './router/new_division';
import DashboardDivision from './router/dashboard_division';
import Login from './router/login';
import Pricing from './router/pricing';

function App() {
  return (
    <Router>
      <div className="selection:bg-emerald-400">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard/org" element={<Organization />} />
          <Route path="/dashboard/org/new" element={<NewOrganization />} />
          <Route path="/dashboard/division/new/:id" element={<NewDivision />} />
          <Route path="/dashboard/division/:id/*" element={<DashboardDivision />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
