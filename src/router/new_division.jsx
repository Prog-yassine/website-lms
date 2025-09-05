import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ReactComponent as ChevronDown } from "../assets/icons/chevron-down.svg";

const awsRegions = [
  {
    name: "US East (N. Virginia)",
    code: "us-east-1",
    flag: "https://flagcdn.com/us.svg",
  },
  {
    name: "US West (Oregon)",
    code: "us-west-2",
    flag: "https://flagcdn.com/us.svg",
  },
  {
    name: "Europe (Ireland)",
    code: "eu-west-1",
    flag: "https://flagcdn.com/ie.svg",
  },
  {
    name: "Asia Pacific (Tokyo)",
    code: "ap-northeast-1",
    flag: "https://flagcdn.com/jp.svg",
  },
  {
    name: "Asia Pacific (Mumbai)",
    code: "ap-south-1",
    flag: "https://flagcdn.com/in.svg",
  },
  {
    name: "Middle East (Bahrain)",
    code: "me-south-1",
    flag: "https://flagcdn.com/bh.svg",
  },
];

const plans = [
  {
    name: "Free",
    description: "$0/month – Basic features",
    icon: "🟢",
    color: "text-green-600",
  },
  {
    name: "Pro",
    description: "$10/month – Advanced features",
    icon: "🔵",
    color: "text-blue-600",
  },
  {
    name: "Enterprise",
    description: "Custom – Premium features & support",
    icon: "🟣",
    color: "text-purple-600",
  },
];

const NewDivision = () => {
    const { id } = useParams();
    const [region, setRegion] = useState(awsRegions[0]);
    const [regionOpen, setRegionOpen] = useState(false);
    const navigate = useNavigate();
    const [plan, setPlan] = useState(plans[0]);
    const [planOpen, setPlanOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-gray-100 w-full">
            <div className="w-full bg-white shadow px-6 py-4 flex items-center justify-start sticky top-0 z-10 space-x-4">
                <img src="../../../logo.svg" className="w-8 h-8" />
                <div className="text-xl font-semibold text-gray-400">/</div>
                <div className="text-xl font-semibold">{id}</div>
                <div className="text-xl font-semibold text-gray-400">/</div>
                <div className="text-xl font-semibold">New Division</div>
            </div>
            <div className="py-10">
                <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg border border-gray-300">
                <div className="border-b border-gray-300 px-6 py-5 flex items-center justify-between">
                    <h2 className="text-[20px] text-black/80 font-medium">Create a new division</h2>
                </div>
                <div className="space-y-4 py-5">
                    <div className="x-auto space-y-6 px-6">
                    {/* Organization ID */}
                    <div className="flex items-start gap-4">
                        <label className="w-1/4 pt-2 text-sm font-medium text-gray-700">Organization</label>
                        <div className="w-3/4">
                        <input
                            type="text"
                            placeholder="Organization name"
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-not-allowed"
                            value={id}
                            disabled
                        />
                        </div>
                    </div>

                    {/* Division Name */}
                    <div className="flex items-start gap-4">
                        <label className="w-1/4 pt-2 text-sm font-medium text-gray-700">Division name</label>
                        <div className="w-3/4">
                        <input
                            type="text"
                            placeholder="Division name"
                            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        </div>
                    </div>

                    {/* AWS Region Selector */}
                    <div className="flex items-start gap-4">
                        <label className="w-1/4 pt-2 text-sm font-medium text-gray-700">Region</label>
                        <div className="w-3/4 relative">
                        <div
                            onClick={() => setRegionOpen(!regionOpen)}
                            className="cursor-pointer p-2 border border-gray-300 rounded-md flex items-center justify-between bg-white hover:bg-gray-50"
                        >
                            <div className="flex items-center gap-2">
                            <img src={region.flag} alt="flag" className="w-5 h-5 rounded-sm" />
                            <span>{region.name}</span>
                            </div>
                            <span className="ml-auto"><ChevronDown /></span>
                        </div>
                        {regionOpen && (
                            <ul className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow z-10 max-h-60 overflow-y-auto">
                            {awsRegions.map((opt) => (
                                <li
                                key={opt.code}
                                onClick={() => {
                                    setRegion(opt);
                                    setRegionOpen(false);
                                }}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                <img src={opt.flag} alt="flag" className="w-5 h-5 rounded-sm" />
                                <span>{opt.name}</span>
                                </li>
                            ))}
                            </ul>
                        )}
                        <p className="text-sm text-gray-500 mt-1">Choose the closest AWS region for best performance.</p>
                        </div>
                    </div>

                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-between items-center mt-6 border-t border-gray-300 pt-4 px-6">
                    <button className="border-gray-300 rounded-lg border py-2 px-4 cursor-pointer" onClick={() => navigate('/dashboard/org')}>Cancel</button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        Create Division
                    </button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default NewDivision;
