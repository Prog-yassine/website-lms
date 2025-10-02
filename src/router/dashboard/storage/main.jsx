<<<<<<< Updated upstream
=======
import { useState } from 'react';

const StoragePreview = ({ label, x, y }) => {
  return (
    <div
      className="pointer-events-none fixed z-50 px-3 py-2 text-sm text-black border border-gray-300 bg-white rounded"
      style={{
        top: y + 10,
        left: x + 10,
      }}
    >
      {label}
    </div>
  );
};

>>>>>>> Stashed changes
const MainStorage = () => {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <h1 className="text-gray-400 text-lg font-medium">Select a storage type from the left menu.</h1>
        </div>
    )
}


export default MainStorage;