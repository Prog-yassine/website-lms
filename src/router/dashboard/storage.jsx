import { useState, useRef, useEffect } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';


import MainStorage from './storage/main';

const Storage = ({divisionId}) => {

    const location = useLocation();


  return (
    <div className="w-full h-screen flex flex-row relative overflow-hidden">
      {/* Left Menu */}
      <div className="w-[300px] h-full bg-white border-r border-gray-300 flex-col">
        <div className="w-full py-4 px-3 border-b border-gray-300">
          <h1 className="text-black text-[20px] font-medium">Storage</h1>
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

            </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white h-full flex flex-col">
        <Routes>
            <Route path="/" element={<MainStorage />} />
        </Routes>
      </div>
    </div>
  );
};

export default Storage;
