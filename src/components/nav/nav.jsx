import { useNavigate } from "react-router-dom";

const NavBar = () => {
  const navigate = useNavigate();

  return (
    <nav className="w-full h-[80px] backdrop-blur-md bg-white/30 border-b border-gray-300 top-0 left-0 z-50 select-none">
      <div className="max-w-[1940px] mx-auto px-6 lg:px-20 flex items-center justify-between h-full">
        
        {/* Logo + Title */}
        <div className="flex items-center select-none cursor-pointer space-x-2" onClick={() => navigate("/")}>
          <img src="./logo.svg" alt="" className="w-10 h-10" />
          <span className="font-semibold text-lg sm:text-xl md:text-2xl lg:text-3xl">
            Grupedia
          </span>
        </div>

        {/* Menu Links */}
        <ul className="hidden md:flex space-x-6 lg:space-x-10 text-gray-700 font-medium">
          <li><a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl">Product</a></li>
          <li><a className="hover:text-[#10B981] text-sm sm:text-base md:text-lg lg:text-xl">Developers</a></li>
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
          >
            Start your project
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
