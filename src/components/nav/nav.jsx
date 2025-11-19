import { useState } from "react"; // <-- import useState
import { useNavigate } from "react-router-dom";
import { ReactComponent as Blocks } from '../../assets/icons/blocks.svg';
import { ReactComponent as Hierarchy } from '../../assets/icons/hierarchy-3.svg';
import { ReactComponent as Careers } from '../../assets/icons/briefcase.svg';
import { ReactComponent as Handshake } from '../../assets/icons/heart-handshake.svg';
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
          {/* <li onMouseEnter={toggleProductDropdown} onMouseLeave={() => setProductDropdownOpen(false)} className="h-full items-center flex">
            <a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer">Product</a>
            {isProductDropdownOpen && (
              <div className="absolute min-w-max bg-white border border-gray-300 rounded-md mt-2 w-64 z-50 top-[72px]">
                <div className="grid grid-cols-2 gap-4 p-4">
                  <div>
                    <h4 className="font-semibold text-xl">Product Links</h4>
                    <ul className="space-y-4 mt-4">
                      <li className="flex items-center">
                        <img src="/icons/icon1.svg" alt="Icon 1" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-lg">Link 1</a>
                      </li>
                      <li className="flex items-center">
                        <img src="/icons/icon2.svg" alt="Icon 2" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-lg">Link 2</a>
                      </li>

                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xl">More Links</h4>
                    <ul className="space-y-4 mt-4">
                      <li className="flex items-center">
                        <img src="/icons/icon3.svg" alt="Icon 3" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-lg">Link 3</a>
                      </li>
                      <li className="flex items-center">
                        <img src="/icons/icon4.svg" alt="Icon 4" className="w-4 h-4 mr-2" />
                        <a href="#" className="text-lg">Link 4</a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </li> */}
          <li onMouseEnter={toggleDeveloperDropdown} onMouseLeave={() => setDeveloperDropdownOpen(false)} className="h-full items-center flex">
            <a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl cursor-pointer">Developers</a>
            {isDeveloperDropdownOpen && (
              <div className="absolute bg-white border border-gray-300 rounded-md mt-2 w-auto z-50 top-[72px]"> {/* Increased width */}
                <div className="grid grid-cols-2 gap-8 p-7">
                  <div>
                    <h4 className="font-semibold text-xl">Developers</h4>
                    <ul className="space-y-4 mt-4">
                      <li className="flex items-center cursor-pointer" onClick={() => navigate("/docs")}>
                        <Hierarchy alt="Icon 5" className="w-7 h-7 mr-2" />
                        <a className="text-lg">Documentation</a>
                      </li>
                      <li className="flex items-center cursor-pointer" onClick={() => navigate("/devs")}>
                        <Blocks alt="Icon 6" className="w-7 h-7 mr-2" />
                        <a className="text-lg">Integrations</a>
                      </li>
                      {/* Add more links as needed */}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xl">Resources</h4>
                    <ul className="space-y-4 mt-4">
                      <li className="flex items-center">
                        <Handshake alt="Icon 7" className="w-7 h-7 mr-2" />
                        <a href="#" className="text-lg">Become a Partner</a>
                      </li>
                      <li className="flex items-center">
                        <Careers alt="Icon 8" className="w-7 h-7 mr-2" />
                        <a href="#" className="text-lg">Careers <span className="text-gray-800">(30)</span></a>
                      </li>
                      {/* Add more links as needed */}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </li>
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
