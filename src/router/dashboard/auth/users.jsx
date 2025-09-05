import { useState, useRef, useEffect } from 'react';

import { ReactComponent as Search } from '../../../assets/icons/search.svg';
import { ReactComponent as Mail } from '../../../assets/icons/mail.svg';
import { ReactComponent as UserPlus } from '../../../assets/icons/user-plus.svg';
import { ReactComponent as FileTypeCSV } from '../../../assets/icons/file-type-csv.svg';
import { ReactComponent as Refresh } from '../../../assets/icons/refresh.svg';
import { ReactComponent as ChevronDown } from '../../../assets/icons/chevron-down.svg';
import { ReactComponent as Ban } from '../../../assets/icons/ban.svg';
import { ReactComponent as Trash } from '../../../assets/icons/trash.svg';

const users = [
  {
    uid: 'de42c2f7-02c8-4753-aa43-fcddc614d65f',
    email: 'yassineaboutaib@gmail.com',
    phone: '-',
    createdAt: 'Fri 02 May 2025 12:10:16 GMT+0100',
    lastSignInAt: 'Fri 02 May 2025 12:20:23 GMT+0100',
  },
  {
    uid: 'd0ce1859-8277-4c32-a505-b0c27a871f22',
    email: 'yassineaboutaib1lt@gmail.com',
    phone: '-',
    createdAt: 'Fri 25 Apr 2025 11:54:34 GMT+0100',
    lastSignInAt: 'Fri 25 Apr 2025 11:54:34 GMT+0100',
  },
  {
    uid: '4ed98798-6d28-458b-9bab-150752f16553',
    email: 'yassineaboutaib0lt@gmail.com',
    phone: '-',
    createdAt: 'Fri 25 Apr 2025 11:42:24 GMT+0100',
    lastSignInAt: 'Fri 16 May 2025 15:04:12 GMT+0100',
  },
];

const UsersPage = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const dropdownRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full h-screen flex flex-row relative overflow-hidden">
      {/* Left Menu */}

      {/* Main Content */}
      <div className="flex-1 bg-white h-full flex flex-col">
        {/* Page Title */}
        <div className="w-full h-16 border-b border-gray-300 px-5 flex items-center">
          <h1 className="text-[25px] font-[400]">Users</h1>
        </div>

        {/* Search and Actions */}
        <div className="w-full p-5 border-b border-gray-300 flex items-center justify-between">
          <div className='flex items-center border border-gray-300 rounded-lg w-[300px] py-[5px] px-2 space-x-2'>
            <Search className='text-gray-500 w-5 h-5' />
            <input
              type="search"
              className='outline-none flex-1 text-[13px]'
              placeholder='Search email, phone or UUID'
            />
          </div>

          <div className="relative" ref={dropdownRef}>
            <div className='flex items-center'>
              <button className="bg-white text-black text-sm px-4 py-2 rounded-md hover:bg-gray-200 transition cursor-pointer mx-2 border border-gray-300 flex items-center space-x-1">
                <Refresh className='w-5' />
                <h1>Refresh</h1>
              </button>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-emerald-300 text-black text-sm px-4 py-2 rounded-md hover:bg-emerald-400 transition cursor-pointer border border-emerald-500 flex items-center space-x-1"
              >
                <h1>Add users</h1>
                <ChevronDown className='w-5' />
              </button>
            </div>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow z-30 flex flex-col p-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    console.log("Invite by Email");
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-500 hover:text-gray-700 rounded cursor-pointer flex items-center space-x-1 text-[14px]"
                >
                  <Mail className='h-5' />
                  <h1>Send Invitation</h1>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    console.log("Create new user");
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-500 hover:text-gray-700  rounded cursor-pointer flex items-center space-x-1 text-[14px]"
                >
                  <UserPlus className='h-5' />
                  <h1>Create new user</h1>
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    console.log("Import CSV");
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-gray-100 text-gray-500 hover:text-gray-700  rounded cursor-pointer flex items-center space-x-1 text-[14px]"
                >
                  <FileTypeCSV className='h-5' />
                  <h1>Import CSV</h1>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table + Sidebar */}
        <div className="relative flex-1 overflow-hidden">
          <div className="overflow-auto h-full "> {/* Reserve space for sidebar */}
            <table className="min-w-full text-sm border-b border-gray-200 bg-white">
              <thead className="bg-gray-100 text-gray-600">
                <tr className="text-left">
                  <th className="p-2 border-b border-gray-200">UID</th>
                  <th className="p-2 border-b border-gray-200">Display Name</th>
                  <th className="p-2 border-b border-gray-200">Email</th>
                  <th className="p-2 border-b border-gray-200">Phone</th>
                  <th className="p-2 border-b border-gray-200">Providers</th>
                  <th className="p-2 border-b border-gray-200">Provider Type</th>
                  <th className="p-2 border-b border-gray-200">Created at</th>
                  <th className="p-2 border-b border-gray-200">Last sign in at</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="p-2 border-b border-gray-200">{user.uid}</td>
                    <td className="p-2 border-b border-gray-200">-</td>
                    <td className="p-2 border-b border-gray-200">{user.email}</td>
                    <td className="p-2 border-b border-gray-200">{user.phone}</td>
                    <td className="p-2 border-b border-gray-200">Email</td>
                    <td className="p-2 border-b border-gray-200">-</td>
                    <td className="p-2 border-b border-gray-200">{user.createdAt}</td>
                    <td className="p-2 border-b border-gray-200">{user.lastSignInAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sidebar (over table only) */}
          {selectedUser && (
            <div className="absolute top-0 right-0 h-full w-[800px] bg-gray-100 border-l border-gray-300 z-20 p-6 overflow-y-auto pb-20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700 text-lg cursor-pointer w-8 h-8 hover:bg-gray-200 flex items-center justify-center rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 text-sm text-gray-700 py-5">
                <p><strong>UID:</strong> {selectedUser.uid}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Phone:</strong> {selectedUser.phone}</p>
                <p><strong>Created At:</strong> {selectedUser.createdAt}</p>
                <p><strong>Last Sign In:</strong> {selectedUser.lastSignInAt}</p>
              </div>
              <div className="w-full border-y border-gray-300 py-5">
                <div className='flex-col w-full bg-white border border-gray-300 rounded-lg' >
                  <div className='h-20 w-full flex items-center justify-between px-5 border-b border-gray-300'> 
                    <div className='flex-col'>
                      <h1 className='text-black/80 font-semibold'>Reset password</h1>
                      <h1 className='text-[13px] text-black/70'>Send a password recovery email to the user</h1>
                    </div>
                    <button className='py-1 px-4 bg-white border border-gray-300 rounded-lg text-[15px] cursor-pointer flex items-center justify-center space-x-2 hover:bg-gray-100 hover:border-gray-400'>
                      <Mail className='w-5 text-black/80'/>
                      <h1 className='text-black/80 font-medium'>Send password recovery</h1>
                    </button>
                  </div>
                  <div className='h-20 w-full flex items-center justify-between px-5'> 
                    <div className='flex-col'>
                      <h1 className='text-black/80 font-semibold'>Send magic link</h1>
                      <h1 className='text-[13px] text-black/70'>Passwordless login via email for the user</h1>
                    </div>
                    <button className='py-1 px-4 bg-white border border-gray-300 rounded-lg text-[15px] cursor-pointer flex items-center justify-center space-x-2 hover:bg-gray-100 hover:border-gray-400'>
                      <Mail className='w-5 text-black/80'/>
                      <h1 className='text-black/80 font-medium'>Send magic link</h1>
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-full py-5">
                <h1 className='font-medium'>Danger zone</h1>
                <h1 className='text-black/60'>Be wary of the following features as they cannot be undone.</h1>
                <div className='flex-col w-full bg-white border border-red-300 rounded-lg mt-5' >
                  <div className='h-20 w-full flex items-center justify-between px-5 border-b border-red-300'> 
                    <div className='flex-col'>
                      <h1 className='text-black/80 font-semibold'>Ban user</h1>
                      <h1 className='text-[13px] text-black/70'>Revoke access to the project for a set duration</h1>
                    </div>
                    <button className='py-1 px-4 bg-white border border-gray-300 rounded-lg text-[15px] cursor-pointer flex items-center justify-center space-x-2 hover:bg-gray-100 hover:border-gray-400'>
                      <Ban className='w-5 text-black/80'/>
                      <h1 className='text-black/80 font-medium'>Ban user</h1>
                    </button>
                  </div>
                  <div className='h-20 w-full flex items-center justify-between px-5'> 
                    <div className='flex-col'>
                      <h1 className='text-black/80 font-semibold'>Delete user</h1>
                      <h1 className='text-[13px] text-black/70'>User will no longer have access to the project</h1>
                    </div>
                    <button className='py-1 px-4 bg-red-100 border border-red-400 rounded-lg text-[15px] cursor-pointer flex items-center justify-center space-x-2 hover:bg-red-200 hover:border-red-500'>
                      <Trash className='w-5 text-red-600'/>
                      <h1 className='text-black/80 font-medium'>Delete user</h1>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
