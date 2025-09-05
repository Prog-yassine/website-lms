import { useState } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';



const Protection = ({ divisionId }) => {
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaSecretKey, setCaptchaSecretKey] = useState('');

  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="w-full max-w-5xl h-full rounded-lg overflow-y-scroll py-8 px-4 space-y-6">

        {/* Title */}
        <div>
          <h1 className="text-[25px] font-medium text-black/80">Attack Protection</h1>
          <h2 className="text-black/60 text-[16px] font-medium">
            Configure security settings to protect your project from attacks
          </h2>
        </div>

        {/* Bot and Abuse Protection Section */}
        <div className="border border-gray-300 rounded-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">Enable Captcha protection</h3>
              <p className="text-sm text-gray-500">
                Protect authentication endpoints from bots and abuse.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={captchaEnabled}
                onChange={(e) => setCaptchaEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-500 transition-all"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 peer-checked:translate-x-full"></div>
            </label>
          </div>

          {captchaEnabled && (
            <div className=" mt-4">
              <div className='flex items-center justify-between w-full'>
                <div>
                    <label className="text-sm font-medium text-gray-700">Captcha Secret Key</label>
                </div>
                <input
                  type="password"
                  value={captchaSecretKey}
                  onChange={(e) => setCaptchaSecretKey(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                  placeholder="Enter Captcha Secret Key"
                />
              </div>
            </div>
          )}

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end space-x-2 mt-6">
            <button className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer">
              Cancel
            </button>
            <button className="px-4 py-2 text-sm bg-emerald-300 text-black hover:bg-emerald-400 border border-emerald-500 hover:border-emerald-700 rounded-lg cursor-pointer">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protection;
