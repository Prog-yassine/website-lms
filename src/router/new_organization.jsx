import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ReactComponent as ChevronDown } from '../assets/icons/chevron-down.svg';

const plans = [
  { name: "Free", price: "$0/month", description: "Basic features for personal projects." },
  { name: "Pro", price: "$10/month", description: "Advanced tools for growing teams." }
];

const types = [
  { name: "Individuals", icon: "👤", description: "For solo developers and freelancers." },
  { name: "Educational", icon: "🎓", description: "Universities, schools, or academic use." },
  { name: "Companies", icon: "🏢", description: "Small businesses or corporations." },
  { name: "Government", icon: "🏛️", description: "State and public sector organizations." },
  { name: "Nonprofit", icon: "🤝", description: "NGOs and nonprofit teams." }
];

const NewOrganization = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [plan, setPlan] = useState(plans[0]);
  const [planOpen, setPlanOpen] = useState(false);

  const [type, setType] = useState(types[0]);
  const [typeOpen, setTypeOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter an organization name.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("token"); // JWT stocké côté client

      const res = await fetch("http://localhost:5000/api/organization/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // ton middleware verifyToken
        },
        body: JSON.stringify({
          name,
          type: type.name,
          plan: plan.name,
          root: "root-uuid-ou-id" // remplace par l’ID/UUID réel du root user
        }),
      });

      if (!res.ok) throw new Error("Error while creating organization");

      const data = await res.json();
      setSuccess("✅ Organization created successfully!");

      // Redirection après 1.5 sec
      setTimeout(() => {
        navigate(`/dashboard/division/new/${data.uuid}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setError("❌ Unable to create the organization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 w-full ">
      <div className="w-full bg-white shadow px-6 py-4 flex items-center justify-start sticky top-0 z-10 space-x-4">
        <img src="../../logo.svg" className="w-8 h-8" alt="Logo" />
        <div className="text-xl font-semibold text-gray-400">/</div>
        <div className="text-xl font-semibold">New Organization</div>
      </div>

      <div className="py-10">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg border border-gray-300">
          <div className="border-b border-gray-300 px-6 py-5 flex items-center justify-between">
            <h2 className="text-[20px] text-black/80 font-medium">Create New Organization</h2>
          </div>

          <div className="space-y-4 py-5">
            <div className="py-2">
              <p className="text-gray-700 px-6">Fill out the form below to create a new organization.</p>
              <p className="text-gray-500 px-6">For example, you can use the name of your company or department.</p>
            </div>

            <div className="x-auto space-y-6 px-6">
              {/* Name Field */}
              <div className="flex items-start gap-4">
                <label className="w-1/4 pt-2 text-sm font-medium text-gray-700">Name</label>
                <div className="w-3/4">
                  <input
                    type="text"
                    placeholder="Organization name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">What's the name of your company or team?</p>
                </div>
              </div>

              {/* Type Selector */}
              <div className="flex items-start gap-4 relative">
                <label className="w-1/4 pt-2 text-sm font-medium text-gray-700">Type</label>
                <div className="w-3/4 relative">
                  <div
                    onClick={() => setTypeOpen(!typeOpen)}
                    className="cursor-pointer p-2 border border-gray-300 rounded-md flex items-center justify-between bg-white hover:bg-gray-50"
                  >
                    <div className="flex-col items-center gap-2 px-2">
                      <div className="font-medium flex items-center gap-2">
                        <span>{type.icon}</span> {type.name}
                      </div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                    <span className="ml-auto"><ChevronDown /></span>
                  </div>

                  {typeOpen && (
                    <ul className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow z-10 max-h-60 overflow-y-auto">
                      {types.map((opt) => (
                        <li
                          key={opt.name}
                          onClick={() => {
                            setType(opt);
                            setTypeOpen(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="font-medium flex items-center gap-2">
                            <span>{opt.icon}</span> {opt.name}
                          </div>
                          <div className="text-sm text-gray-500">{opt.description}</div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-sm text-gray-500 mt-1">What would best describe your organization?</p>
                </div>
              </div>

              {/* Plan Selector */}
              <div className="flex items-start gap-4 relative">
                <label className="w-1/4 pt-2 text-sm font-medium">
                  <h1 className="text-gray-700">Plan</h1>
                  <h1 className="text-gray-500 cursor-pointer">Pricing</h1>
                </label>
                <div className="w-3/4 relative">
                  <div
                    onClick={() => setPlanOpen(!planOpen)}
                    className="cursor-pointer p-2 border border-gray-300 rounded-md flex items-center justify-between bg-white hover:bg-gray-50"
                  >
                    <div className="flex-col items-center gap-2 px-2">
                      <div className="font-medium">{plan.name} - {plan.price}</div>
                      <div className="text-sm text-gray-500">{plan.description}</div>
                    </div>
                    <span className="ml-auto"><ChevronDown /></span>
                  </div>

                  {planOpen && (
                    <ul className="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow z-10 max-h-60 overflow-y-auto">
                      {plans.map((opt) => (
                        <li
                          key={opt.name}
                          onClick={() => {
                            setPlan(opt);
                            setPlanOpen(false);
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="font-medium">{opt.name} - {opt.price}</div>
                          <div className="text-sm text-gray-500">{opt.description}</div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-sm text-gray-500 mt-1">The Plan applies to your new organization.</p>
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
                onClick={() => navigate('/dashboard/org')}
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
                {loading ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrganization;
