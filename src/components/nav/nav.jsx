import { useState } from "react"; // <-- import useState
import { useNavigate } from "react-router-dom";

const NavBar = () => {
  const navigate = useNavigate();
  const [isProductDropdownOpen, setProductDropdownOpen] = useState(false); // <-- state for product dropdown
  const [isDeveloperDropdownOpen, setDeveloperDropdownOpen] = useState(false); // <-- state for developer dropdown

  const toggleProductDropdown = () => {
    setProductDropdownOpen(!isProductDropdownOpen);
    setDeveloperDropdownOpen(false); // Close developer dropdown when product is opened
  };

  const toggleDeveloperDropdown = () => {
    setDeveloperDropdownOpen(!isDeveloperDropdownOpen);
    setProductDropdownOpen(false); // Close product dropdown when developer is opened
  };

  return (
    <nav className="fixed top-0 w-full h-[80px] backdrop-blur-md bg-white/30 border-b border-gray-300 top-0 left-0 z-50 select-none">
      <div className="max-w-[1940px] mx-auto px-6 lg:px-20 flex items-center justify-between h-full">
        
        {/* Logo + Title */}
        <div className="flex items-center select-none cursor-pointer space-x-2" onClick={() => navigate("/")}>
          <img src="./logo.svg" alt="" className="w-10 h-10" />
          <span className="font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl">
            Grupedia
          </span>
        </div>

        {/* Menu Links */}
        <ul className="hidden md:flex space-x-6 lg:space-x-10 text-gray-700 font-medium h-full items-center">
          <li onMouseEnter={toggleProductDropdown} onMouseLeave={() => setProductDropdownOpen(false)} className="h-full items-center flex">
            <a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer">Product</a>
            {isProductDropdownOpen && (
              <div className="absolute bg-white border border-gray-300 rounded-md mt-2 w-64 z-50 top-[72px]"> {/* Increased width */}
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <h4 className="font-semibold">Product Links</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <img src="/icons/icon1.svg" alt="Icon 1" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Link 1</a>
                      </li>
                      <li className="flex items-center">
                        <img src="/icons/icon2.svg" alt="Icon 2" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Link 2</a>
                      </li>
                      {/* Add more links as needed */}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">More Links</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <img src="/icons/icon3.svg" alt="Icon 3" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Link 3</a>
                      </li>
                      <li className="flex items-center">
                        <img src="/icons/icon4.svg" alt="Icon 4" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Link 4</a>
                      </li>
                      {/* Add more links as needed */}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </li>
          <li onMouseEnter={toggleDeveloperDropdown} onMouseLeave={() => setDeveloperDropdownOpen(false)} className="h-full items-center flex">
            <a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer">Developers</a>
            {isDeveloperDropdownOpen && (
              <div className="absolute bg-white border border-gray-300 rounded-md mt-2 w-auto z-50 top-[72px]"> {/* Increased width */}
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <h4 className="font-semibold">Developers</h4>
                    <ul className="space-y-2 mt-3">
                      <li className="flex items-center">
                        <img src="/icons/icon5.svg" alt="Icon 5" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Documentation</a>
                      </li>
                      <li className="flex items-center">
                        <img src="/icons/icon6.svg" alt="Icon 6" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Integrations</a>
                      </li>
                      {/* Add more links as needed */}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold">Resources</h4>
                    <ul className="space-y-2 mt-3">
                      <li className="flex items-center">
                        <img src="/icons/icon7.svg" alt="Icon 7" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Pa</a>
                      </li>
                      <li className="flex items-center">
                        <img src="/icons/icon8.svg" alt="Icon 8" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-sm">Link 8</a>
                      </li>
                      {/* Add more links as needed */}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </li>
          <li><a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl">University</a></li>
          <li onClick={() => navigate("/pricing")} className="cursor-pointer"><a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl">Pricing</a></li>
          <li><a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl">Docs</a></li>
          <li><a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl">Blog</a></li>
        </ul>

        {/* Buttons */}
        <div className="flex items-center space-x-4">
          <button
            className="text-xs sm:text-sm md:text-base font-semibold px-4 h-[40px] md:h-[46px] bg-white hover:bg-gray-100 text-black rounded-[12px] transition border border-gray-200 hover:border-gray-300 cursor-pointer"
            onClick={() => navigate('/login')}
          >
            Sign in
          </button>
          <button
            className="text-xs sm:text-sm md:text-base font-semibold px-4 h-[40px] md:h-[46px] bg-[#65D9A5] text-black rounded-[12px] transition border border-[#22C55E] hover:border-[#00802F] cursor-pointer"
            onClick={() => navigate('/login')}
          >
            Start your project
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
