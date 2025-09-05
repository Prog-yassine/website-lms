import { useState } from 'react';
import { Link, Routes, Route, useLocation } from 'react-router-dom';



const SmtpTab = () => {
    const [captchaEnabled, setCaptchaEnabled] = useState(false);
    const [captchaSecretKey, setCaptchaSecretKey] = useState('');


    return (
        <div className="w-full h-full bg-white flex items-center justify-center">
            <div className="w-full max-w-5xl h-full rounded-lg overflow-y-scroll py-10 space-y-6">
                {/* Bot and Abuse Protection Section */}
                <div className="border border-gray-300 rounded-md p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-[15px] font-semibold">Enable Custom SMTP</h3>
                            <p className="text-sm text-gray-500">
                                Emails will be sent using your custom SMTP provider.
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
                    <div className="mt-5">
                        <div className='flex items-start justify-between w-full  border-t border-gray-300 mt-5 pt-5'>
                            <div className='w-xs pr-8'>
                                <label className="text-sm font-medium text-gray-700">Sender details</label>
                                <h1 className='text-black/40 font-medium text-[15px]'>Configure the sender information for your emails.</h1>
                            </div>
                            <div className='flex-1 flex-col space-y-4'>
                                <div className='flex-col space-y-2'>
                                    <h1 className='font-medium text-[16px]'>Sender email</h1>
                                    <input
                                        type="password"
                                        value={captchaSecretKey}
                                        onChange={(e) => setCaptchaSecretKey(e.target.value)}
                                        className="px-3 py-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                                        placeholder="noreply@yourdomain.com"
                                    />
                                    <p className='text-black/40 font-medium text-[15px]'>This is the email address the emails are sent from</p>
                                </div>
                                <div className='flex-col space-y-2'>
                                    <h1 className='font-medium text-[16px]'>Sender name</h1>
                                    <input
                                        type="password"
                                        value={captchaSecretKey}
                                        onChange={(e) => setCaptchaSecretKey(e.target.value)}
                                        className="px-3 py-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                                        placeholder="The name shown on the email"
                                    />
                                    <p className='text-black/40 font-medium text-[15px]'>Name displayed in the recipient's inbox</p>
                                </div>
                            </div>
                        </div>
                        <div className='flex items-start justify-between w-full border-t border-gray-300 mt-5 pt-5'>
                            <div className='w-xs pr-8'>
                                <label className="text-sm font-medium text-gray-700">SMTP Provider Settings</label>
                                <h1 className='text-black/40 font-medium text-[15px]'>Your SMTP Credentials will always be encrypted in our database.</h1>
                            </div>
                            <div className='flex-1 flex-col space-y-4'>
                                <div className='flex-col space-y-2'>
                                    <h1 className='font-medium text-[16px]'>Host</h1>
                                    <input
                                        type="password"
                                        value={captchaSecretKey}
                                        onChange={(e) => setCaptchaSecretKey(e.target.value)}
                                        className="px-3 py-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                                        placeholder="your.smtp.host.com"
                                    />
                                    <p className='text-black/40 font-medium text-[15px]'>Hostname or IP address of your SMTP server.</p>
                                </div>
                                <div className='flex-col space-y-2'>
                                    <h1 className='font-medium text-[16px]'>Port number</h1>
                                    <input
                                        type="password"
                                        value={captchaSecretKey}
                                        onChange={(e) => setCaptchaSecretKey(e.target.value)}
                                        className="px-3 py-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                                        placeholder="The name shown on the email"
                                    />
                                    <p className='text-black/40 font-medium text-[15px]'>Port used by your SMTP server. Common ports include 25, 465, and 587.</p>
                                </div>
                                <div className='flex-col space-y-2'>
                                    <h1 className='font-medium text-[16px]'>Username</h1>
                                    <input
                                        type="password"
                                        value={captchaSecretKey}
                                        onChange={(e) => setCaptchaSecretKey(e.target.value)}
                                        className="px-3 py-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                                        placeholder="SMTP username"
                                    />
                                    <p className='text-black/40 font-medium text-[15px]'>Username for your SMTP server</p>
                                </div>
                                <div className='flex-col space-y-2'>
                                    <h1 className='font-medium text-[16px]'>Password</h1>
                                    <input
                                        type="password"
                                        value={captchaSecretKey}
                                        onChange={(e) => setCaptchaSecretKey(e.target.value)}
                                        className="px-3 py-2 border w-full border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-emerald-300"
                                        placeholder="SMTP password"
                                    />
                                    <p className='text-black/40 font-medium text-[15px]'>For security reasons, the password is write-only. Once saved, it cannot be retrieved or displayed.</p>
                                </div>
                            </div>
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



export default SmtpTab;