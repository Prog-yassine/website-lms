import { useState, useEffect } from 'react';

import { ReactComponent as CPU } from '../../assets/icons/cpu.svg';
import { ReactComponent as Server } from '../../assets/icons/server.svg';
import { ReactComponent as Database } from '../../assets/icons/database.svg';
import { ReactComponent as User } from '../../assets/icons/users.svg';
import { ReactComponent as ChevronRight } from '../../assets/icons/chevron-right.svg';
import { ReactComponent as SingleUser } from '../../assets/icons/user.svg';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Générer les 7 derniers jours
const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  return days;
};

const last7Days = getLast7Days();

const cpuData = last7Days.map((day) => ({
  name: day,
  usage: 0
}));

const ramData = last7Days.map((day) => ({
  name: day,
  usage: 0
}));

const MAU = last7Days.map((day) => ({
  name: day,
  DAU: 0
}));

const storageData = [
  { name: "Used", value: 500 },
  { name: "Free", value: 300 },
];

const COLORS = ["#00bc7d", "#e5e7eb"];

const Home = ({logs}) => {


  return (
    <div className="h-screen w-full p-6 bg-white overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* CPU Usage - Bar Chart */}
        <div className="bg-white p-4 rounded-2xl border border-gray-300 outline-none">
          <div className="flex items-center mb-6">
            <CPU className="w-8 h-8 text-black mr-2" />
            <h2 className="text-lg font-semibold">CPU Usage</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usage" fill="#00bc7d" radius={[4, 4, 0, 0]} barSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RAM Usage - Bar Chart */}
        <div className="bg-white p-4 rounded-2xl border border-gray-300">
          <div className="flex items-center mb-6">
            <Server className="w-8 h-8 text-black mr-2" />
            <h2 className="text-lg font-semibold">RAM Usage</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ramData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usage" fill="#00bc7d" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Storage - Donut */}
        <div className="bg-white p-4 rounded-2xl border border-gray-300">
          <div className="flex items-center mb-6">
            <Database className="w-8 h-8 text-black mr-2" />
            <h2 className="text-lg font-semibold">Storage</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={storageData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
              >
                {storageData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* MAU */}
        <div className="bg-white p-4 rounded-2xl border border-gray-300 outline-none">
          <div className="flex items-center mb-6">
            <CPU className="w-8 h-8 text-black mr-2" />
            <h2 className="text-lg font-semibold">MAU : 1293</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MAU}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="DAU" fill="#00bc7d" radius={[4, 4, 0, 0]} barSize={40}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Console Log (2 columns wide) */}
        <div className="bg-white p-4 rounded-2xl border border-gray-300 col-span-2">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold">Console Log</h2>
          </div>
          <div className="h-[200px] overflow-y-auto bg-gray-50 rounded-xl p-3 text-sm font-mono text-gray-700">

            {Array.isArray(logs) && logs.map((log, index) => {
              // Convert timestamp into readable date/time
              const formattedTime = new Date(log.timestamp).toLocaleString();

              return (
                <div key={index} className="mb-1 flex">
                  <h1 className='font-semibold'>[{formattedTime}] :</h1>
                  <h1>{log.message || JSON.stringify(log)}</h1>
                </div>
              );
            })}

          </div>

        </div>

        
        <div className="bg-white p-4 rounded-2xl border border-gray-300 col-span-2  h-[300px]">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <User className="w-7 h-7 text-black mr-2"/>
              <h2 className="text-lg font-semibold">IAM</h2>
            </div>
            <button className='px-5 rounded-lg cursor-pointer border border-emerald-600 py-1 bg-emerald-400'>Add</button>
          </div>
          <div className="overflow-y-auto rounded-xl text-sm space-y-2 py-2 font-mono flex-col h-[240px]">
            <div className='flex items-center hover:bg-gray-100 border-b border-gray-300 px-2 py-3 cursor-pointer'>
              <div className='w-7 h-7 flex items-center justify-center'>
                <SingleUser className='w-7 h-7'/>
              </div>
              <div className='flex-1 ml-4'>
                <h1>Yassine</h1>
                <h1>Last login: 12pm</h1>
              </div>
              <div className=''>
                <ChevronRight />
              </div>
            </div>
            <div className='flex items-center hover:bg-gray-100 border-b border-gray-300 px-2 py-3 cursor-pointer'>
              <div className='w-7 h-7 flex items-center justify-center'>
                <SingleUser className='w-7 h-7'/>
              </div>
              <div className='flex-1 ml-4'>
                <h1>Yassine</h1>
                <h1>Last login: 12pm</h1>
              </div>
              <div className=''>
                <ChevronRight />
              </div>
            </div>
            <div className='flex items-center hover:bg-gray-100 border-b border-gray-300 px-2 py-3 cursor-pointer'>
              <div className='w-7 h-7 flex items-center justify-center'>
                <SingleUser className='w-7 h-7'/>
              </div>
              <div className='flex-1 ml-4'>
                <h1>Yassine</h1>
                <h1>Last login: 12pm</h1>
              </div>
              <div className=''>
                <ChevronRight />
              </div>
            </div>
            <div className='flex items-center hover:bg-gray-100 border-b border-gray-300 px-2 py-3 cursor-pointer'>
              <div className='w-7 h-7 flex items-center justify-center'>
                <SingleUser className='w-7 h-7'/>
              </div>
              <div className='flex-1 ml-4'>
                <h1>Yassine</h1>
                <h1>Last login: 12pm</h1>
              </div>
              <div className=''>
                <ChevronRight />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
