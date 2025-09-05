import { useState } from 'react';

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

const MainStorage = () => {
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
    </div>
  );
};

export default MainStorage;
