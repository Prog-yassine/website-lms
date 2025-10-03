import { useState, useEffect, useRef, useContext } from "react";
import { Routes, Route, useParams, Link } from "react-router-dom";

import { ReactComponent as Users } from '../assets/icons/users.svg';
import { ReactComponent as Blocks } from '../assets/icons/blocks.svg';
import { ReactComponent as Settings } from '../assets/icons/settings.svg';
import { ReactComponent as Packages } from '../assets/icons/packages.svg';
import { ReactComponent as Box } from '../assets/icons/box.svg';
import { ReactComponent as Folder } from '../assets/icons/folder.svg';
import { ReactComponent as Dashboard } from '../assets/icons/dashboard.svg';
import { ReactComponent as Database_2 } from '../assets/icons/database-2.svg';
import { ReactComponent as Selector } from '../assets/icons/selector.svg';

import Integrations from "./dashboard/integrations";
import Auth from "./dashboard/auth";
import Home from "./dashboard/home";
import Storage from "./dashboard/storage";
import Setting from "./dashboard/setting";
import Database from "./dashboard/database";

import { AuthContext } from "../protected"; // 👈 ajoute ton context ici

const DashboardDivision = () => {
  const { id } = useParams();
  const { organizations } = useContext(AuthContext); // 👈 récupère les orgs du contexte
  const [Logs, setLogs] = useState([]);


  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 👇 Cherche le projet et son org
  const currentOrg = organizations.find((org) =>
    org.projects?.some((p) => p.id === id)
  );
  const currentProject = currentOrg?.projects.find((p) => p.id === id);

  const sidebarItems = [
    { icon: <Dashboard className="w-6 h-6"/>, title: "Overview", link: `/dashboard/division/${id}` },
    { icon: <Database_2 className="w-6 h-6"/>, title: "Database", link: `/dashboard/division/${id}/database` },
    { icon: <Folder className="w-6 h-6"/>, title: "Storage", link: `/dashboard/division/${id}/storage` },
    { icon: <Users className="w-6 h-6"/>, title: "Users", link: `/dashboard/division/${id}/auth/user` },
    { icon: <Blocks className="w-6 h-6"/>, title: "Integrations", link: `/dashboard/division/${id}/integrations` },
    { icon: <Settings className="w-6 h-6"/>, title: "Settings", link: `/dashboard/division/${id}/setting/` },
  ];


  useEffect(() => {
      const verifyToken = async () => {
        try {
          const res = await fetch("http://localhost:5000/api/data/status/" + id, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
  
          const data = await res.json();
          setLogs(data.logs || []);
          console.log(Logs)
        } catch (err) {
          console.error("Error Getting Data token:", err);
        }
      };
  
      verifyToken();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100 w-full font-sans font-[inter]">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`h-full transition-all duration-300 flex flex-col overflow-x-hidden py-8 pl-4
            ${dropdownOpen ? "w-60" : "w-18 hover:w-60 group"}
          `}
        >
          {/* Org box with dropdown */}
          <div ref={dropdownRef} className="relative w-full">
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center border-b py-4 border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="w-14 h-14 bg-gray-900 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
                #
              </div>
              <div
                className={`flex-1 ml-4 flex flex-col overflow-hidden text-sm text-gray-800 transition-opacity duration-300 font-medium 
                  ${dropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <h1 className="font-semibold text-xl text-gray-900 truncate">
                  {currentOrg?.name || "Unknown Org"}
                </h1>
                <h1 className="truncate">{currentProject?.name || "Unknown Project"}</h1>
              </div>
              <div className="w-8 h-8 shrink-0 ml-2 flex items-center justify-center ">
                <Selector className="w-7 h-7 text-black m-auto"/>
              </div>
            </div>
            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white shadow-lg rounded-lg border border-gray-200 z-50">
                {currentOrg.projects.map((project) => (
                  <Link 
                    key={project.id} 
                    to={`/dashboard/division/${project.id}`} 
                    className="flex flex-col px-4 py-2 hover:bg-gray-100 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="font-medium text-gray-900 truncate">{project.name}</span>
                    <span className="text-xs text-gray-500 truncate">project</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar items */}
          {sidebarItems.map((item, index) => (
            <Link to={item?.link} key={index} className="flex items-center w-full px-4 py-3 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center">
                {item?.icon}
              </div>
              <span className={`ml-4 text-sm text-gray-800 transition-opacity duration-300 whitespace-nowrap font-medium ${dropdownOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                {item.title}
              </span>
            </Link>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 pt-8 pl-8 pr-0">
          <div className="bg-white border-l border-t border-b border-gray-300 h-full rounded-tl-xl">
            <div className="w-full h-20 flex items-center px-8 space-x-3 border-b border-gray-300">
              <div>
                <img src="../../../../logo.svg" alt="" className="w-8 h-8"/>
              </div>
              <h2 className="font-medium text-gray-400 text-2xl">/</h2>
              <h2 className="font-semibold text-gray-900 text-2xl">{currentOrg?.name || "Unknown Org"}</h2>
              <h2 className="font-medium text-gray-400 text-2xl">/</h2>
              <h2 className="font-semibold text-gray-900 text-2xl">{currentProject?.name || "Unknown Project"}</h2>
            </div>
            <div className="h-full overflow-y-auto">
              <Routes>
                <Route path="integrations" element={<Integrations/>} />
                <Route path="auth/*" element={<Auth divisionId={id} />} />
                <Route path="" element={<Home divisionId={id} logs={Logs}/>} />
                <Route path="storage/*" element={<Storage divisionId={id}/>} />
                <Route path="setting/*" element={<Setting divisionId={id}/>} />
                <Route path="database/*" element={<Database divisionId={id}/>} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDivision;
