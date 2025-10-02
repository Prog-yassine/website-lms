import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ReactComponent as ChevronDown } from "../assets/icons/chevron-down.svg";

const configurations = [
  { name: "Micro", price: 10, cpu: 256, memory: 1024, direct: 60, pooler: 200 },      // 0.25 vCPU, 1GB
  { name: "Small", price: 15, cpu: 256, memory: 2048, direct: 90, pooler: 400 },      // 0.25 vCPU, 2GB
  { name: "Medium", price: 30, cpu: 512, memory: 4096, direct: 120, pooler: 800 },    // 0.5 vCPU, 4GB
  { name: "Large", price: 60, cpu: 1024, memory: 8192, direct: 180, pooler: 1200 },   // 1 vCPU, 8GB
  { name: "XLarge", price: 120, cpu: 2048, memory: 16384, direct: 240, pooler: 2000 }, // 2 vCPU, 16GB
  { name: "2XLarge", price: 240, cpu: 4096, memory: 32768, direct: 360, pooler: 3000 }, // 4 vCPU, 32GB
  { name: "4XLarge", price: 480, cpu: 8192, memory: 65536, direct: 500, pooler: 5000 }, // 8 vCPU, 64GB
  { name: "8XLarge", price: 960, cpu: 16384, memory: 131072, direct: 500, pooler: 8000 }, // 16 vCPU, 128GB
  { name: "16XLarge", price: 1920, cpu: 32768, memory: 262144, direct: 500, pooler: 12000 }, // 32 vCPU, 256GB
];



const NewDivision = () => {
  const { id } = useParams(); // organization uuid/id
  const navigate = useNavigate();

  const [divisionName, setDivisionName] = useState("");
  const [config, setConfig] = useState(configurations[0]);
  const [configOpen, setConfigOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!divisionName.trim()) {
      setError("Please enter a division name.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/division/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: divisionName,
          config: config,
          organization: id,
        }),
      });

      if (!res.ok) throw new Error("Error while creating division");

      const data = await res.json();
      setSuccess("✅ Division created successfully!");

      setTimeout(() => {
        navigate(`/dashboard/division/${data.uuid}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("❌ Unable to create the division.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 w-full">
      {/* Header */}
      <div className="w-full bg-white shadow px-6 py-4 flex items-center justify-start sticky top-0 z-10 space-x-4">
        <img src="../../../../logo.svg" className="w-8 h-8" alt="Logo" />
        <div className="text-xl font-semibold text-gray-400">/</div>
        <div className="text-xl font-semibold">Organization</div>
        <div className="text-xl font-semibold text-gray-400">/</div>
        <div className="text-xl font-semibold">{id}</div>
        <div className="text-xl font-semibold text-gray-400">/</div>
        <div className="text-xl font-semibold">New Division</div>
      </div>

      {/* Body */}
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
                    value={id}
                    disabled
                    className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 cursor-not-allowed"
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
                    value={divisionName}
                    onChange={(e) => setDivisionName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              {/* Configuration Selector */}
              <div className="flex items-start gap-4">
                <label className="w-1/4 pt-2 text-sm font-medium text-gray-700">Configuration</label>
                <div className="w-3/4 relative">
                  <div
                    onClick={() => setConfigOpen(!configOpen)}
                    className="cursor-pointer p-2 border border-gray-300 rounded-md flex items-center justify-between bg-white hover:bg-gray-50"
                  >
                    <span>{config.name}</span>
                    <span className="ml-auto">
                      <ChevronDown />
                    </span>
                  </div>
                  {configOpen && (
                    <ul className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow z-10 max-h-60 overflow-y-auto">
                      {configurations.map((config) => (
                        <li
                          key={config.name}
                          onClick={() => {
                            setConfig(config); // use same state variable
                            setConfigOpen(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                        >
                          <span>{config.name}</span>
                          <span className="text-gray-500">${config.price}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Select the configuration you want for this division.
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {error && <p className="text-red-500 px-6">{error}</p>}
            {success && <p className="text-green-600 px-6">{success}</p>}

            {/* Footer */}
            <div className="flex justify-between items-center mt-6 border-t border-gray-300 pt-4 px-6">
              <button
                className="border-gray-300 rounded-lg border py-2 px-4 cursor-pointer"
                onClick={() => navigate(`/dashboard/org/${id}`)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Division"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewDivision;
