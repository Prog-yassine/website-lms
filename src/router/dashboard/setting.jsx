import { useState, useRef, useEffect } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';


import MainSetting from './setting/main';

const Setting = ({divisionId}) => {

    const location = useLocation();


  return (
    <div className="w-full h-screen flex flex-row relative overflow-hidden">
      {/* Left Menu */}
      <div className="w-[300px] h-full bg-white border-r border-gray-300 flex-col">
        <div className="w-full py-4 px-3 border-b border-gray-300">
          <h1 className="text-black text-[20px] font-medium">Settings</h1>
        </div>
        <div className="w-full py-6 px-3 border-b border-gray-300">
            <h1 className="font-medium text-black/60">CONFIGURATION</h1>
            <div className='w-full flex-col space-y-2 py-2'>
                <div>
                    <Link to={`/dashboard/division/${divisionId}/setting/`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium 
                        ${location.pathname.endsWith('/setting/') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <h1>General</h1>
                        </div>
                    </Link>
                </div>


                {/* Users */}
                <div>
                    <Link to={`/dashboard/division/${divisionId}/setting/compute-disk`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium 
                        ${location.pathname.endsWith('/setting/compute-disk') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <h1>Compute and Disk</h1>
                        </div>
                    </Link>
                </div>

            </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white h-full flex flex-col">
        <Routes>
            <Route path="/" element={<MainSetting divisionId={divisionId} />} />
            <Route path="/compute-disk" element={<div />} />
        </Routes>
      </div>
    </div>
  );
};

export default Setting;