import { useState, useRef, useEffect } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';


import FileStorage from './storage/file.jsx';
import AvatarStorage from './storage/avatar';
import MainStorage from './storage/main';

const StoragePreview = ({ label, x, y }) => {
  return (
    <div
      className="pointer-events-none fixed z-50 px-3 py-2 text-sm text-white bg-black rounded shadow"
      style={{
        top: y + 10,
        left: x + 10,
      }}
    >
      {label}
    </div>
  );
};



const Storage = ({divisionId}) => {

  const location = useLocation();
  const [hoverInfo, setHoverInfo] = useState({
    visible: false,
    label: '',
    x: 0,
    y: 0,
  });

  const handleMouseEnter = (label) => (e) => {
    setHoverInfo({
      visible: true,
      label,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e) => {
    setHoverInfo((prev) => ({
      ...prev,
      x: e.clientX,
      y: e.clientY,
    }));
  };

  const handleMouseLeave = () => {
    setHoverInfo({ visible: false, label: '', x: 0, y: 0 });
  };

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
                    <Link to={`/dashboard/division/${divisionId}/storage/files`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium 
                        ${location.pathname.endsWith('/storage/files') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <h1>Files</h1>
                        </div>
                    </Link>
                </div>
                <div>
                    <Link to={`/dashboard/division/${divisionId}/storage/avatar`}>
                        <div className={`w-full px-3 py-1 rounded-lg font-medium 
                        ${location.pathname.endsWith('/storage/avatar') ? 'bg-gray-100 text-black' : 'bg-gray-0 text-gray-700'}`}>
                            <h1>Avatar</h1>
                        </div>
                    </Link>
                </div>
            </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white h-full flex flex-col">
        <div className="w-full h-full relative">
          {hoverInfo.visible && (
            <StoragePreview
              label={hoverInfo.label}
              x={hoverInfo.x}
              y={hoverInfo.y}
            />
          )}

          <div className="w-full py-5 border-b border-gray-300 px-5">
            <div className="w-full px-5 py-0 flex flex-col space-y-3">
              <h1 className="text-3xl">Storage Usage</h1>

              <div className="space-x-1 rounded-full w-full h-5 flex relative">
                {/* Images */}
                <div
                  className="bg-blue-500 h-full rounded-l-full"
                  style={{ width: '50%' }}
                  onMouseEnter={handleMouseEnter('Files - 50GB')}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                ></div>

                {/* System */}
                <div
                  className="bg-red-500 h-full"
                  style={{ width: '5%' }}
                  onMouseEnter={handleMouseEnter('System - 5GB')}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                ></div>

                {/* Videos */}
                <div
                  className="bg-orange-500 h-full"
                  style={{ width: '20%' }}
                  onMouseEnter={handleMouseEnter('Data - 20GB')}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                ></div>

                <div
                  className="bg-gray-200 h-full rounded-r-full"
                  style={{ width: '25%' }}
                  onMouseEnter={handleMouseEnter('Free Space - 25GB')}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                ></div>
              </div>

              <div className="flex justify-start space-x-4 text-sm text-gray-500">
                <span>Used: 75GB</span>
                <span>Free: 25GB</span>
                <span>Total: 100GB</span>
              </div>
            </div>
          </div>
          <div className='w-full h-full'>
            <Routes>
              <Route path="/files" element={<FileStorage divisionId={divisionId} />} />
              <Route path="/avatar" element={<AvatarStorage divisionId={divisionId} />} />
              {location.pathname === `/dashboard/division/${divisionId}/storage` && (
                <Route path="*" element={<MainStorage divisionId={divisionId} />} />
              )}
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storage;
