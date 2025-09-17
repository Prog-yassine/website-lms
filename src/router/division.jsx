import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ReactComponent as Packages } from "../assets/icons/packages.svg";

const Division = () => {
    const {id} = useParams();


    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleNewOrganization = () => {
        navigate("/dashboard/org/" + id + "/division/new");
    };

    useEffect(() => {
        const fetchOrganizations = async () => {
            try {
            const token = localStorage.getItem("token"); // récupère ton token

            const res = await fetch(
                "http://localhost:5000/api/division/org/" + id,
                {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`, // ajoute ton bearer token ici
                },
                }
            );

            if (!res.ok) throw new Error("Failed to fetch organizations");

            const data = await res.json();
            setOrganizations(data); // si ton API retourne un array ou un objet
            } catch (err) {
            console.error("Error fetching organizations:", err);
            } finally {
            setLoading(false);
            }
        };

        fetchOrganizations();
    }, []);


  return (
    <div className="flex flex-col h-screen bg-gray-100 w-full">
      {/* HEADER */}
      <div className="w-full bg-white shadow px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-4">
            <img src="../../../logo.svg" className="w-8 h-8" />
            <div className="text-xl font-semibold text-gray-400">/</div>
            <div className="text-xl font-semibold">Organization</div>
            <div className="text-xl font-semibold text-gray-400">/</div>
            <div className="text-xl font-semibold">{id}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300">
            
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-w-5xl mx-auto p-6 space-y-6">
        <h2 className="text-2xl font-bold my-6">Welcome to the Division Dashboard</h2>

        {/* Actions */}
        <div className="flex flex-row space-x-4">
          <button
            onClick={handleNewOrganization}
            className="h-10 bg-emerald-300 border rounded-lg border-emerald-500 px-3 cursor-pointer hover:bg-emerald-400 hover:border-emerald-600"
          >
            New Division
          </button>
          <input
            type="text"
            className="min-w-sm h-10 px-4 bg-white rounded-lg focus:outline-gray-300"
            placeholder="Search for an organization"
          />
        </div>

        {/* List */}
        {loading ? (
          <p className="text-gray-500">Loading organizations...</p>
        ) : organizations.length === 0 ? (
          <p className="text-gray-500">No organizations found.</p>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
                {organizations.map((org) => (
                    <div
                    key={org.id}
                    onClick={() => navigate(`/dashboard/division/${org.uuid}`)}
                    className="bg-white rounded-xl border border-gray-300 transition-shadow border border-gray-100 cursor-pointer flex items-center p-4 space-x-4"
                    >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Packages className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <h1 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                        {org.name}
                        </h1>
                        <p className="text-gray-500 text-xs sm:text-sm truncate">
                        {org.plan || "Free Plan"}
                        </p>
                    </div>
                    </div>
                ))}
            </div>

        )}
      </div>
    </div>
  );
};

export default Division;
