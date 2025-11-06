import { useState, useRef, useEffect } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

import { ReactComponent as Database_2 } from '../../assets/icons/database-2.svg';

import Main from './database/main';

const MainPage = () => {
  return(
    <div className='w-full h-full flex items-center justify-center'>
      <h1>Select a database</h1>
    </div>
  )
}


const Database = ({ divisionId, bearerToken, public_ip }) => {

    const location = useLocation();


  return (
    <div className="w-full h-screen flex flex-row relative overflow-hidden">
      {/* Left Menu */}
      <div className="w-[300px] h-full bg-white border-r border-gray-300 flex-col">
        <div className="w-full py-4 px-3 border-b border-gray-300">
          <h1 className="text-black text-[20px] font-medium">Database</h1>
        </div>
        <div className="w-full py-6 px-3 border-b border-gray-300">
            <input type="text" placeholder='Search for database...' className='w-full py-2 rounded-lg bg-gray-100 border border-gray-300 px-2 outline-none'/>
            <div className='w-full flex-col space-y-1 py-2'>

                {/* Users */}
                <div>
                    <Link to={`/dashboard/division/${divisionId}/database/users`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium flex items-center space-x-2
                        ${location.pathname.endsWith('/database/users') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <Database_2 className='w-5 h-5'/>
                            <h1>users</h1>
                        </div>
                    </Link>
                </div>

                <div>
                    <Link to={`/dashboard/division/${divisionId}/database/section`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium flex items-center space-x-2
                        ${location.pathname.endsWith('/database/section') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <Database_2 className='w-5 h-5'/>
                            <h1>section</h1>
                        </div>
                    </Link>
                </div>

                <div>
                    <Link to={`/dashboard/division/${divisionId}/database/block`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium flex items-center space-x-2
                        ${location.pathname.endsWith('/database/block') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <Database_2 className='w-5 h-5'/>
                            <h1>block</h1>
                        </div>
                    </Link>
                </div>


                <div>
                    <Link to={`/dashboard/division/${divisionId}/database/quizzes`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium flex items-center space-x-2
                        ${location.pathname.endsWith('/database/quizzes') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <Database_2 className='w-5 h-5'/>
                            <h1>quizzes</h1>
                        </div>
                    </Link>
                </div>


            </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white h-full flex flex-col">
        <Routes>
            <Route path="/" element={<MainPage/>} />
            <Route path="/:table" element={<Main bearerToken={bearerToken} public_ip={public_ip} />} />
        </Routes>
      </div>
    </div>
  );
};

export default Database;
