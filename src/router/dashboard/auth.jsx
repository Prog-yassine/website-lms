import { useState, useRef, useEffect } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';




import UsersPage from './auth/users';
import Emails from './auth/email_templates';
import Protection from './auth/protection';
import CustomLogin from './auth/custom_login';

const Auth = ({divisionId}) => {

    const location = useLocation();


  return (
    <div className="w-full h-full flex flex-row relative overflow-hidden">
      {/* Left Menu */}
      <div className="w-[300px] h-full bg-white border-r border-gray-300 flex-col">
        <div className="w-full py-4 px-3 border-b border-gray-300">
          <h1 className="text-black text-[20px] font-medium">Authentication</h1>
        </div>
        <div className="w-full py-6 px-3 border-b border-gray-300">
            <h1 className="font-medium text-black/60">CONFIGURATION</h1>
            <div className='w-full flex-col space-y-2 py-2'>

                {/* Users */}
                <div>
                <Link to={`/dashboard/division/${divisionId}/auth/user`}>
                    <div className={`w-full px-3 py-1 rounded-lg font-medium 
                    ${location.pathname.endsWith('/auth/user') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                        <h1>Users</h1>
                    </div>
                </Link>
                </div>

                {/* Templates */}
                <div>
                <Link to={`/dashboard/division/${divisionId}/auth/emails/templates`}>
                    <div className={`w-full px-3 py-1 rounded-lg font-medium
                    ${location.pathname.endsWith('/auth/emails/templates') || location.pathname.endsWith('/auth/emails/smtp') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                        <h1>Templates</h1>
                    </div>
                </Link>
                </div>

                <div>
                <Link to={`/dashboard/division/${divisionId}/auth/protection`}>
                    <div className={`w-full px-3 py-1 rounded-lg font-medium
                    ${location.pathname.endsWith('/auth/protection') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                        <h1>Attack Protection</h1>
                    </div>
                </Link>
                </div>

                <div>
                <Link to={`/dashboard/division/${divisionId}/auth/login`}>
                    <div className={`w-full px-3 py-1 rounded-lg font-medium
                    ${location.pathname.endsWith('/auth/login') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                        <h1>Login Page</h1>
                    </div>
                </Link>
                </div>
            </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white h-full flex flex-col">
        <Routes>
            <Route path="/emails/*" element={<Emails divisionId={divisionId}/>} />
            <Route index path="/user" element={<UsersPage />} />
            <Route index path="/protection" element={<Protection />} />
            <Route index path="/login" element={<CustomLogin />} />
        </Routes>
      </div>
    </div>
  );
};

export default Auth;
