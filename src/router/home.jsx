

import { ReactComponent as RowRight } from '../assets/icons/chevron-right.svg';
import { ReactComponent as LockPassword } from '../assets/icons/lock-password.svg';
import { ReactComponent as FolderCog } from '../assets/icons/folder-cog.svg';
import { ReactComponent as File } from '../assets/icons/file.svg';
import { ReactComponent as BrandYoutube } from '../assets/icons/brand-youtube.svg';
import { ReactComponent as BrandYoutubeFilled } from '../assets/icons/brand-youtube-filled.svg';
import { ReactComponent as BrandDiscord } from '../assets/icons/brand-discord.svg';
import { ReactComponent as Photo } from '../assets/icons/photo.svg';
import { ReactComponent as OpenAi } from '../assets/icons/openai-logo.svg';
import { ReactComponent as HuggingFace } from '../assets/icons/hugging_face.svg';
import { ReactComponent as Hierarchy } from '../assets/icons/hierarchy-3.svg';
import { ReactComponent as Click } from '../assets/icons/click.svg';
import { ReactComponent as Spy } from '../assets/icons/spy.svg';
import { ReactComponent as Ai } from '../assets/icons/ai.svg';
import { ReactComponent as Message_circle } from '../assets/icons/message-circle.svg';



import NavBar from '../components/nav/nav';
import InfiniteLoop from '../components/infinity-loop/infinity-loop';
import IntegrationsSection from '../components/integration';
import Footer from '../components/footer/footer';

const Home = () => {


  return (
    <div className="flex flex-col min-h-screen font-sans font-[inter] overflow-x-hidden">
      {/* Navbar */}
      <NavBar />

      {/* Main Content */}
      <main className="flex-grow w-full max-w-[1940px] mx-auto px-4 sm:px-8 lg:px-20 pt-[80px]">
        
        {/* Hero Section */}
        <div className="w-full flex flex-col items-center justify-center mt-10 sm:mt-20">
          <div className="w-full max-w-md sm:max-w-2xl flex flex-col sm:flex-row items-center justify-between bg-white rounded-full px-2 py-2 space-y-2 sm:space-y-0 sm:space-x-4 border border-gray-300">
            <div className="flex-1 flex items-center justify-center bg-[#65D9A5]/30 rounded-full h-[34px] border border-[#22C55E] cursor-pointer">
              <p className="font-semibold text-[#22C55E] text-sm sm:text-base">Launch 2025</p>
            </div>
            <div className="flex-1 flex items-center justify-center rounded-full h-[34px] cursor-pointer">
              <p className='text-[14px] sm:text-[16px]'>Discover the next-gen LMS</p>
              <RowRight className="text-black w-[17px] h-[17px] ml-2"/>
            </div>
          </div>
        </div>
        
        {/* Headline */}
        <div className='w-full mt-20 text-center'>
          <p className='text-[28px] sm:text-[40px] md:text-[55px] lg:text-[65px] font-semibold leading-tight'>
            Build your LMS in a weekend
          </p>
          <p className='text-[28px] sm:text-[40px] md:text-[55px] lg:text-[65px] font-semibold text-[#10B981] leading-tight'>
            Scale to thousands of learners
          </p>

          <div className='mt-6 sm:mt-8 md:mt-10 space-y-2'>
            <p className='text-[14px] sm:text-[16px] md:text-[18px] font-semibold'>
              LMS is the next-generation learning management platform.
            </p>
            <p className='text-[14px] sm:text-[16px] md:text-[18px] font-semibold'>
              Start your platform with built-in authentication, course hosting, exams, file storage,
            </p>
            <p className='text-[14px] sm:text-[16px] md:text-[18px] font-semibold'>
              real-time collaboration, AI tools, and a powerful Postgres database.
            </p>
          </div>

          <div className='mt-6 sm:mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-4'>
            <button className="text-xs sm:text-sm font-semibold px-4 h-[42px] sm:h-[46px] bg-[#65D9A5] text-black rounded-[12px] border border-[#22C55E] hover:border-[#00802F] cursor-pointer">
              Start your project
            </button>
            <button className="text-xs sm:text-sm font-semibold px-4 h-[42px] sm:h-[46px] bg-[#fff] hover:bg-gray-100 text-black rounded-[12px] border border-gray-200 hover:border-gray-300 cursor-pointer">
              Request a demo
            </button>
          </div>
        </div>

        {/* Infinite Loop */}
        <div className='w-full flex items-center justify-center mt-20'>
          <div className='w-full sm:w-4/5 md:w-1/2'>
            <InfiniteLoop/>
            <p className='text-center text-[#000000]/50 font-semibold mt-7'>Trusted by the best universities worldwide</p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-7 mt-20 select-none">
          {/* Integration Section */}
          <div className="col-span-1 sm:col-span-2 bg-white rounded-[12px] border border-gray-300 flex items-center justify-center sm:h-[400px] min-h-[400px] hover:border-gray-400 cursor-pointer">
            <IntegrationsSection/>
          </div>

          {/* Auth Card */}
          <div className="flex flex-col bg-white rounded-[12px] border border-gray-300 sm:h-[400px] min-h-auto pb-7 hover:border-gray-400 cursor-pointer">
            <div className='p-7 pb-0'>
              <div className='flex items-center mb-2'>
                <LockPassword className="w-[24px] h-[24px] mr-3" />
                <h2>Authentification</h2>
              </div>
              <p className='font-semibold text-[16px]'>Add user sign'in</p>
              <p className='text-black/50 font-medium text-[16px]'>custom your own login page.</p>
            </div>
            <div className='hidden sm:block w-full flex flex-grow bg-[url("./universitys/auth.svg")] bg-no-repeat bg-cover rounded-b-[12px]' />
          </div>

          {/* Smart Anti-Cheat */}
          <div className="sm:h-[400px] min-h-auto pb-7 flex flex-col bg-white rounded-[12px] border border-gray-300 hover:border-gray-400 cursor-pointer">
            <div className='p-7 pb-0'>
              <div className='flex items-center mb-2'>
                <Spy className="w-[24px] h-[24px] mr-3" />
                <h2>Smart Anti-Cheat</h2>
              </div>
              <p className='font-semibold text-[16px]'>Protect exam integrity</p>
              <p className='text-black/50 font-medium text-[16px]'>with AI-based monitoring, behavior analysis, and copy detection.</p>
            </div>
            <div className='hidden sm:block w-full flex flex-grow bg-[url("./universitys/anticheat.svg")] bg-no-repeat bg-cover rounded-b-[12px]' />
          </div>

          {/* Storage */}
          <div className="sm:h-[400px] min-h-auto relative bg-white rounded-[12px] border border-gray-300 font-normal text-[19px] hover:border-gray-400 cursor-pointer">
            {/* Header */}
            <div className="p-7">
                <div className="flex items-center mb-2">
                <FolderCog className="w-[24px] h-[24px] mr-3" />
                <h2>Storage</h2>
                </div>
                <p className="font-semibold text-[16px]">Store, organize and serve</p>
                <p className="text-black/50 font-medium text-[16px]">
                large files, from videos to images.
                </p>
            </div>

            {/* File icons grid */}
            <div className="hidden sm:grid absolute bottom-0 left-0 right-0 grid grid-cols-5 grid-rows-3 gap-4 justify-items-center p-4">
                {/* Files */}
                {[...Array(5)].map((_, i) => (
                <div
                    key={`file-${i}`}
                    className="col-span-1 w-15 h-15 border border-gray-300 rounded-[12px] flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer"
                >
                    <File className="w-[24px] h-[24px] text-gray-500" />
                </div>
                ))}

                {/* Youtube */}
                {[...Array(5)].map((_, i) => (
                <div
                    key={`yt-${i}`}
                    className="col-span-1 w-15 h-15 border border-gray-300 rounded-[12px] flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer"
                >
                    <BrandYoutube className="w-[24px] h-[24px] text-gray-500" />
                </div>
                ))}

                {/* Photos */}
                {[...Array(5)].map((_, i) => (
                <div
                    key={`photo-${i}`}
                    className="col-span-1 w-15 h-15 border border-gray-300 rounded-[12px] flex items-center justify-center hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer"
                >
                    <Photo className="w-[24px] h-[24px] text-gray-500" />
                </div>
                ))}
            </div>
        </div>


          {/* Realtime */}
        <div className="sm:h-[400px] min-h-auto flex flex-col bg-white rounded-[12px] border border-gray-300 hover:border-gray-400 cursor-pointer">
            <div className='p-7'>
              <div className='flex items-center mb-2'>
                <Click className="w-[24px] h-[24px] mr-3" />
                <h2>Realtime</h2>
              </div>
              <p className='font-semibold text-[16px]'>Work together in real-time</p>
              <p className='text-black/50 font-medium text-[16px]'>enable shared editing, whiteboards, and instant feedback.</p>
            </div>
            <div className='hidden sm:flex w-full flex-grow bg-[url("./universitys/realtime.svg")] bg-no-repeat bg-cover rounded-b-[12px]' />
        </div>

          {/* LMS AI */}
          <div className="sm:h-[400px] min-h-auto relative flex flex-col bg-white rounded-[12px] border border-gray-300 hover:border-gray-400 cursor-pointer">
            <div className='p-7'>
              <div className='flex items-center mb-2'>
                <Ai className="w-[24px] h-[24px] mr-3" />
                <h2>LMS AI</h2>
              </div>
              <p className='font-semibold text-[16px]'>Integrate your favorite ML-models</p>
              <p className='text-black/50 font-medium text-[16px]'>help students achieve their academic results.</p>
            </div>
            <div className='hidden sm:flex w-full flex-grow bg-[url("./universitys/openai.jpg")] bg-no-repeat bg-center rounded-b-[12px]' />
            <div className='absolute bottom-0 left-7 right-7 flex items-end gap-2 hidden sm:block'>
              <OpenAi className="h-16 w-16"/>
              <HuggingFace className="h-10 w-25 -translate-y-4 -translate-x-1"/>
            </div>
          </div>

          {/* Data Hub */}
          <div className="sm:h-[400px] min-h-auto flex flex-col bg-white rounded-[12px] border border-gray-300 hover:border-gray-400 cursor-pointer">
            <div className='p-7'>
              <div className='flex items-center mb-2'>
                <Hierarchy className="w-[24px] h-[24px] mr-3" />
                <h2>Data Hub API</h2>
              </div>
              <p className='font-semibold text-[16px]'>Import, sync and edit university data</p>
              <p className='text-black/50 font-medium text-[16px]'>securely through a powerful REST API.</p>
            </div>
            <div className='hidden sm:flex w-full flex-grow bg-[url("./universitys/apis.svg")] bg-no-repeat bg-cover rounded-b-[12px]' />
          </div>
        </div>

        {/* Subtext */}
        <p className="text-left text-[14px] sm:text-[18px] md:text-[20px] font-medium my-5 text-black/60">
          <span className="text-black font-semibold">Use one or all.</span> Best of breed products. Integrated as a platform.
        </p>
      </main>

      {/* Community Section */}
      <div className='w-full max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center'>
        <h2 className='text-center text-[22px] sm:text-[28px] md:text-[32px] font-medium text-black'>Join the community</h2>
        <h3 className='text-center text-[14px] sm:text-[16px] md:text-[20px] font-medium text-black/60 mt-2'>
          Discover what our community has to say about their Supabase experience.
        </h3>
        <div className='flex items-center justify-center mt-6'>
          <button 
            className='px-5 py-2 bg-white border border-gray-300 rounded-lg font-medium flex items-center hover:bg-gray-100 hover:border-gray-400 transition cursor-pointer' 
            onClick={() => window.open('https://discord.gg/tJwaCDxR', '_blank')}
          >
            <span>Discord</span>
            <Message_circle className="w-6 h-6 inline-block ml-2"/>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-white/30 backdrop-blur-md mt-auto select-none pt-10">
        <Footer />
      </footer>
    </div>
  );
};

export default Home;
