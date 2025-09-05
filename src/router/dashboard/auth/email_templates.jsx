import { Link, Routes, Route, useLocation } from 'react-router-dom';

import TemplatesTab from './tabs/templateTab';
import SmtpTab from './tabs/smtpTab';

const Emails = ({ divisionId }) => {
  const location = useLocation();

  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="w-full max-w-5xl h-full rounded-lg overflow-y-scroll py-8 px-4">
        {/* Title */}
        <h1 className='text-[25px] font-medium text-black/80'>Emails</h1>
        <h1 className='text-black/60 text-[16px] font-medium'>
          Configure what emails your users receive and how they are sent
        </h1>

        {/* Tab Selector */}
        <div className="flex space-x-4 mt-6 border-b border-gray-200">
          <Link to={`/dashboard/division/${divisionId}/auth/emails/templates`}>
            <div className={`px-4 py-2 font-medium cursor-pointer ${
              location.pathname.endsWith('templates') ? 'border-b-3 border-black text-black' : 'text-gray-500'
            }`}>
              Templates
            </div>
          </Link>
          <Link to={`/dashboard/division/${divisionId}/auth/emails/smtp`}>
            <div className={`px-4 py-2 font-medium cursor-pointer ${
              location.pathname.endsWith('smtp') ? 'border-b-3 border-black text-black' : 'text-gray-500'
            }`}>
              SMTP Custom
            </div>
          </Link>
        </div>

        {/* Routes for Tabs */}
        <Routes>
          <Route path="/templates" element={<TemplatesTab />} />
          <Route path="/smtp" element={<SmtpTab />} />
        </Routes>
      </div>
    </div>
  );
};

export default Emails;
