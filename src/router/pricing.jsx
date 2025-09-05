import NavBar from "../components/nav/nav";
import { ReactComponent as Check } from '../assets/icons/check.svg';
import ComputeCalculator from "../components/calculator/compute_calculator";
import { ReactComponent as BrandYoutubeFilled } from '../assets/icons/brand-youtube-filled.svg';
import { ReactComponent as BrandDiscord } from '../assets/icons/brand-discord.svg';



import Footer from '../components/footer/footer';


const Pricing = () => {
  return (
    <div className="w-full font-sans min-h-screen bg-gray-50">
      <NavBar />

      {/* Header */}
      <div className="pt-28 pb-10 text-center px-4 mt-20">
        <h1 className="text-3xl md:text-5xl font-semibold text-gray-800">
          Predictable pricing, designed to scale
        </h1>
        <p className="mt-4 text-gray-600 text-base md:text-lg max-w-2xl mx-auto font-medium">
          Start building for free, collaborate with your team, then scale to millions of users
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto pb-16 grid grid-cols-1 md:grid-cols-3 gap-5 px-6 items-stretch">
        
        {/* Free */}
        <div className="flex flex-col border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-all duration-300 bg-white transform h-full">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-gray-800">FREE</h2>
              <p className="text-gray-600 mt-2 text-sm">Perfect for passion projects & simple websites.</p>
              
              <div className="mt-6">
                <p className="text-4xl font-bold text-gray-800">$0<span className="text-base font-medium text-gray-500">/month</span></p>
              </div>
            </div>
            
            {/* Ligne fine de séparation - position fixe */}
            <div className="border-t border-gray-200 w-full my-6"></div>
            
            <div className="flex-grow">
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Unlimited API requests</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 5000 monthly active users</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 500 MB database size</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 5 GB egress</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 5 GB cached egress</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 1 GB file storage</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Community support</li>
              </ul>
            </div>
            
            <div className="mt-8 pt-4">
              <button className="w-full bg-emerald-400 hover:bg-emerald-500 border-emerald-600 border text-black font-medium py-3 rounded-md transition-colors">
                Start for Free
              </button>
              <p className="mt-4 text-xs text-gray-500 text-center">
                Free projects are paused after 14 days. Limit of 1 active project.
              </p>
            </div>
          </div>
        </div>

        {/* Pro */}
        <div className="flex flex-col border-2 border-emerald-500 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 bg-white transform relative h-full">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">
            Most Popular
          </div>
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-gray-800">PRO</h2>
              <p className="text-gray-600 mt-2 text-sm">For production applications with the power to scale.</p>
              
              <div className="mt-6">
                <p className="text-4xl font-bold text-gray-800">$25<span className="text-base font-medium text-gray-500">/month</span></p>
                <p className="text-xs text-gray-500 mt-1">$10 in compute credits included</p>
              </div>
            </div>
            
            {/* Ligne fine de séparation - position fixe */}
            <div className="border-t border-gray-200 w-full my-6"></div>
            
            <div className="flex-grow">
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2"><Check className="w-6 h-6"/></span> 
                    <span>100,000 monthly active users</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-8 mt-1">then $0.05 per 1GB</div>
                </li>
                <li className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2"><Check className="w-6 h-6"/></span> 
                    <span>8 GB disk size per project</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-8 mt-1">then $0.05 per 1GB</div>
                </li>
                <li className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2"><Check className="w-6 h-6"/></span> 
                    <span>250 GB egress</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-8 mt-1">then $0.05 per 1GB</div>
                </li>
                <li className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2"><Check className="w-6 h-6"/></span> 
                    <span>250 GB cached egress</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-8 mt-1">then $0.05 per 1GB</div>
                </li>
                <li className="flex flex-col">
                  <div className="flex items-center">
                    <span className="text-green-500 mr-2"><Check className="w-6 h-6"/></span> 
                    <span>100 GB file storage</span>
                  </div>
                  <div className="text-xs text-gray-500 ml-8 mt-1">then $0.05 per 1GB</div>
                </li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Email support</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Daily backups (7 days)</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 7-day log retention</li>
              </ul>
            </div>
            
            <div className="mt-8 pt-4">
              <button className="w-full bg-emerald-400 hover:bg-emerald-500 border-emerald-600 border text-black font-medium py-3 rounded-md transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="flex flex-col border border-gray-200 rounded-xl p-8 hover:shadow-xl transition-all duration-300 bg-white transform h-full">
          <div className="flex flex-col h-full">
            <div className="flex-grow">
              <h2 className="text-xl font-bold text-gray-800">TEAM</h2>
              <p className="text-gray-600 mt-2 text-sm">Add features such as SSO, control over backups, and certifications.</p>
              
              <div className="mt-6">
                <p className="text-4xl font-bold text-gray-800">$599<span className="text-base font-medium text-gray-500">/month</span></p>
                <p className="text-xs text-gray-500 mt-1">$10 in compute credits included</p>
              </div>
            </div>
            
            {/* Ligne fine de séparation - position fixe */}
            <div className="border-t border-gray-200 w-full my-6"></div>
            
            <div className="flex-grow">
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Everything in Pro, plus:</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> SOC2</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Project-scoped & read-only access</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> HIPAA (add-on)</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> SSO for dashboard</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Priority email support & SLAs</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> Daily backups (14 days)</li>
                <li className="flex items-center"><span className="text-green-500 mr-2"><Check/></span> 28-day log retention</li>
              </ul>
            </div>
            
            <div className="mt-8 pt-4">
              <button className="w-full bg-emerald-400 hover:bg-emerald-500 border-emerald-600 border text-black font-medium py-3 rounded-md transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <ComputeCalculator />
      </div>
      <Footer />
    </div>
  );
};

export default Pricing;