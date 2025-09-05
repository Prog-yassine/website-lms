const MainSetting = ({divisionId}) => {

    return (
        <div className="w-full h-full bg-white flex items-center justify-center">
            <div className="w-full max-w-5xl h-full rounded-lg overflow-y-scroll py-8 px-4">
                <h1 className='text-[25px] font-medium text-black/80'>Project Settings</h1>
                <div className="bg-white border border-gray-300 rounded-lg mt-6 flex-col">
                    <div className="w-full py-10 px-6 flex items-start justify-between">
                        <div className="w-1/2">
                            <h1 className='text-[20px] font-medium text-black/80'>General settings</h1>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="">Project name</label>
                                <input type="text" className="py-2 px-3 outline-none border border-gray-300 rounded-lg" placeholder="Project name"/>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="">Project ID</label>
                                <input type="text" disabled className="py-2 px-3 outline-none border border-gray-300 rounded-lg cursor-not-allowed" value={divisionId} />
                            </div>
                        </div>
                    </div>
                    <div className="w-full py-4 px-6 border-t border-gray-300 flex items-center justify-end">
                        <button className="px-4 py-2 bg-emerald-300 rounded-lg hover:bg-emerald-500 transition text-black cursor-pointer border border-emerald-600 font-medium">
                            Save
                        </button>
                    </div>
                </div>
                <h1 className='text-[25px] font-medium text-black/80 mt-10'>Custom Domains</h1>
                <h1 className='text-[15px] font-semibold text-black/60'>Present a branded experience to your users</h1>
                <div className="bg-white border border-gray-300 rounded-lg mt-6 flex-col">
                    <div className="w-full py-10 px-6 flex items-start justify-between">
                        <div className="w-1/2">
                            <h1 className='text-[20px] font-medium text-black/80'>Domain settings</h1>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="">Add a custom domain</label>
                                <input type="text" className="py-2 px-3 outline-none border border-gray-300 rounded-lg" placeholder="Project name"/>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <label htmlFor="">Project ID</label>
                                <input type="text" disabled className="py-2 px-3 outline-none border border-gray-300 rounded-lg cursor-not-allowed" value={divisionId} />
                            </div>
                        </div>
                    </div>
                    <div className="w-full py-4 px-6 border-t border-gray-300 flex items-center justify-end">
                        <button className="px-4 py-2 bg-emerald-300 rounded-lg hover:bg-emerald-500 transition text-black cursor-pointer border border-emerald-600 font-medium">
                            Save
                        </button>
                    </div>
                </div>
            </div>
            
        </div>
    );
}

export default MainSetting;