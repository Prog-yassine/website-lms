const Footer = () => {
  return (
    <div className="w-full bg-white/30 backdrop-blur-md border-t border-gray-300 mt-20 select-none">
      <div className="max-w-[1940px] mx-auto px-6 lg:px-20 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* Logo + About */}
        <div>
          <div className="flex items-center space-x-2 mb-4 cursor-pointer">
            <img src="./logo.svg" alt="logo" className="w-10 h-10" />
            <span className="font-semibold text-xl">Grupedia</span>
          </div>
          <p className="text-sm text-gray-600">
            Empowering learning, collaboration, and growth with modern tools for
            students, developers, and organizations.
          </p>
        </div>

        {/* Links 1 */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Product</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#" className="hover:text-[#10B981]">Overview</a></li>
            <li><a href="#" className="hover:text-[#10B981]">Features</a></li>
            <li><a href="#" className="hover:text-[#10B981]">Pricing</a></li>
            <li><a href="#" className="hover:text-[#10B981]">Releases</a></li>
          </ul>
        </div>

        {/* Links 2 */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Resources</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#" className="hover:text-[#10B981]">Docs</a></li>
            <li><a href="#" className="hover:text-[#10B981]">Developers</a></li>
            <li><a href="#" className="hover:text-[#10B981]">Blog</a></li>
            <li><a href="#" className="hover:text-[#10B981]">University</a></li>
          </ul>
        </div>

        {/* Socials */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Connect</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="#" className="hover:text-[#10B981]">Twitter</a></li>
            <li><a href="#" className="hover:text-[#10B981]">LinkedIn</a></li>
            <li><a href="#" className="hover:text-[#10B981]">GitHub</a></li>
            <li><a href="#" className="hover:text-[#10B981]">Support</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 py-4 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Grupedia. All rights reserved.
      </div>
    </div>
  );
};

export default Footer;
