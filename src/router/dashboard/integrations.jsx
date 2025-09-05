import { useState } from 'react';
import { ReactComponent as Calendar } from '../../assets/icons/calendar-week.svg';
import { ReactComponent as Slack } from '../../assets/icons/brand-slack.svg';
import { ReactComponent as Notion } from '../../assets/icons/brand-notion.svg';

const installed = [
  {
    id: 1,
    name: 'Calendar',
    icon: <Calendar className='w-7 h-7'/>,
    description: 'Schedule all your daily task',
    official: true,
  },
];

const marketplace = [
  {
    id: 2,
    name: 'Slack',
    icon: <Slack className='w-7 h-7'/>,
    description: 'Receive updates in Slack channels',
    official: true,
  },
  {
    id: 3,
    name: 'Notion',
    icon: <Notion className='w-7 h-7'/>,
    description: 'Sync tasks with Notion pages',
    official: true,
  },
  {
    id: 4,
    name: 'Calendar',
    icon: <Calendar className='w-7 h-7'/>,
    description: 'Schedule all your daily task',
    official: true,
    downloaded: true,
  },
];

const Integrations = () => {
  const [search, setSearch] = useState('');

  const filteredInstalled = installed.filter(plugin =>
    plugin.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMarketplace = marketplace.filter(plugin =>
    plugin.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-screen flex flex-row">
      {/* Sidebar */}
      <div className="w-[300px] h-full bg-white border-r border-gray-300 flex-col">
        <div className="w-full py-4 px-3 border-b border-gray-300">
          <h1 className="text-black text-[20px] font-medium">Integrations</h1>
        </div>
        <div className="w-full py-6 px-3 border-b border-gray-300">
          <h1 className="font-medium text-black/60">INSTALLED INTEGRATIONS</h1>
          {installed.length === 0 ? (
            <h1 className="w-full py-3 flex justify-center text-gray-500">
              No integrations installed
            </h1>
          ) : (
            installed.map(p => (
              <div key={p.id} className="text-sm text-black py-1">{p.name}</div>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-white h-full overflow-y-auto">
        <div className="w-full py-5 border-b border-gray-300 px-5">
          <h1 className="text-[25px] font-[500]">Integrations</h1>
        </div>

        {/* Search */}
        <div className="px-10 pt-6 pb-2">
          <input
            type="text"
            placeholder="Search integrations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[600px] p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </div>

        {/* Installed */}
        <div className="w-full px-10 py-4">
          <h1 className="text-[20px] font-[500] mb-4">Installed Integrations</h1>
          {filteredInstalled.length === 0 ? (
            <div className="text-gray-500">No installed integrations match your search.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredInstalled.map((plugin, i) => (
                <IntegrationCard key={i} plugin={plugin} installed={true}/>
              ))}
            </div>
          )}
        </div>

        {/* Marketplace */}
        <div className="w-full px-10 py-4">
          <h1 className="text-[20px] font-[500] mb-4">Available in Marketplace</h1>
          {filteredMarketplace.length === 0 ? (
            <div className="text-gray-500">No marketplace integrations match your search.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMarketplace.map((plugin, i) => (
                <IntegrationCard key={i} plugin={plugin} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IntegrationCard = ({ plugin, installed }) => (
  <div className="bg-white py-4 px-3 rounded-xl flex flex-col border border-gray-300 hover:bg-gray-100 transition duration-200 cursor-pointer">
    <div className="flex items-center space-x-3">
      <div className="h-[50px] w-[50px] bg-white rounded-lg flex items-center justify-center border border-gray-300">
        {plugin.icon}
      </div>
      <div className="flex-1">
        <h1 className="font-semibold text-black">{plugin.name}</h1>
        <p className="text-sm text-gray-500">{plugin.description}</p>
      </div>
    </div>
      <div className="mt-3 w-full flex justify-between items-center">
        {plugin.official && (
            <span className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-xs text-gray-600">
                Official
            </span>
        )}
        {plugin.downloaded && !installed && (
            <span className="px-3 py-1 bg-emerald-300 border border-emerald-500 rounded-full text-xs text-gray-600">
                Installed
            </span>
        )}
      </div>
  </div>
);

export default Integrations;
