import { useState } from "react";

const configurations = [
    { id: "nano", name: "NANO", price: "$0", desc: "Up to 0.5 GB memory\nShared CPU" },
    { id: "micro", name: "MICRO", price: "$0.01344", desc: "1 GB memory\n2-core ARM CPU" },
    { id: "small", name: "SMALL", price: "$0.0206", desc: "2 GB memory\n2-core ARM CPU" },
    { id: "medium", name: "MEDIUM", price: "$0.0822", desc: "4 GB memory\n2-core ARM CPU" },
    { id: "large", name: "LARGE", price: "$0.1517", desc: "8 GB memory\n2-core ARM CPU" },
    { id: "xl", name: "XL", price: "$0.2877", desc: "16 GB memory\n4-core ARM CPU" },
    { id: "2xl", name: "2XL", price: "$0.562", desc: "32 GB memory\n8-core ARM CPU" },
    { id: "4xl", name: "4XL", price: "$1.32", desc: "64 GB memory\n16-core ARM CPU" },
    { id: "8xl", name: "8XL", price: "$2.562", desc: "128 GB memory\n32-core ARM CPU" },
    { id: "12xl", name: "12XL", price: "$3.836", desc: "192 GB memory\n48-core ARM CPU" },
    { id: "16xl", name: "16XL", price: "$5.12", desc: "256 GB memory\n64-core ARM CPU" }
];

const Compute = ({divisionId}) => {
    const [selected, setSelected] = useState("nano");
    return (
        <div className="w-full min-h-full bg-white flex items-start justify-center">
            <div className="w-full max-w-5xl rounded-lg px-4 pt-0 pb-30"> 
                <h1 className='text-[25px] font-medium text-black/80 mt-5'>Compute and Disk</h1>
                <h1 className='text-[15px] font-semibold text-black/60'>Configure the compute and disk settings for your project.</h1>
                <div className="w-full">
                    <div className="bg-white border-t border-gray-300 pt-8 mt-6 flex">
                        <div className="w-1/3">
                            <h1 className="font-medium text-xl text-gray-700">Compute size</h1>
                            <h1 className="text-sm font-medium text-gray-400">Hardware resources allocated to your Postgres database</h1>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            {configurations.map((cfg) => (
                            <button
                                key={cfg.id}
                                className={`border rounded-lg p-4 text-left transition container cursor-pointer ${
                                selected === cfg.id
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-gray-300 bg-white hover:border-emerald-300"
                                }`}
                                onClick={() => setSelected(cfg.id)}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-xs text-emerald-700 border border-emerald-500 p-1 rounded-lg">{cfg.name}</span>
                                    <span className="font-medium text-gray-700">{cfg.price} <span className="text-xs">/ hour</span></span>
                                </div>
                                <div className="text-gray-600 whitespace-pre-line text-sm">{cfg.desc}</div>
                            </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-full py-4 flex items-center justify-end">
                        <button className="px-4 py-2 bg-emerald-300 rounded-lg hover:bg-emerald-500 transition text-black cursor-pointer border border-emerald-600 font-medium">
                            Save Configuration
                        </button>
                    </div>
                </div>
                <div className="w-full mt-8 flex gap-8 border-t border-gray-300 pt-8">
                    {/* Disk Usage Section */}
                    <div className="flex-1 flex flex-col">
                        <div className="mb-2 text-gray-700 text-sm">
                            <span className="font-medium">0.25 GB</span> used of <span className="font-medium">8 GB</span>
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                            {/* Input on the left */}
                            <div className="flex items-center gap-0">
                                <input
                                    type="number"
                                    min={1}
                                    max={256}
                                    defaultValue={8}
                                    className="border-x border-y border-gray-300 rounded-l-lg px-3 h-10 w-20 outline-none"
                                    style={{width: "70px"}}
                                />
                                <span className="font-medium text-gray-700 h-10 border-y border-gray-300 border-r rounded-r-lg flex items-center justify-center px-2 bg-gray-200">GB</span>
                            </div>
                            {/* Bar on the right */}
                            <div className="w-full h-6 bg-gray-100 rounded-lg flex items-center relative">
                                <div className="h-full bg-black" style={{width: "2%"}} />
                                <div className="h-full bg-purple-400" style={{width: "8%"}} />
                                <div className="h-full bg-red-200" style={{width: "20%"}} />
                                <div className="h-full bg-gray-300" style={{width: "70%"}} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs mb-2">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-black inline-block rounded"></span> Database</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-400 inline-block rounded"></span> WAL</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 inline-block rounded"></span> System</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-300 inline-block rounded"></span> Available space</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            <span className="font-semibold">Note:</span> Disk Size refers to the total space your project occupies on disk, including the database itself (currently 0.02 GB), additional files like the write-ahead log (currently 0.06 GB), and other system resources (currently 0.16 GB). Data can take 5 minutes to refresh.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Compute;