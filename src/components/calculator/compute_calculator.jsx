import { useState } from 'react';

const ComputeCalculator = () => {
  const [projects, setProjects] = useState([{ size: 'Micro', count: 1 }]);
  const [totalEstimate, setTotalEstimate] = useState(25); // Prix de base du plan Pro
  const [showDetails, setShowDetails] = useState(false); // NEW state

  const computeSizes = [
    { name: 'Micro', price: 10, cpu: '2-core ARM', memory: '1GB', direct: 60, pooler: 200 },
    { name: 'Small', price: 15, cpu: '2-core ARM', memory: '2GB', direct: 90, pooler: 400 },
    { name: 'Medium', price: 30, cpu: '4-core ARM', memory: '4GB', direct: 120, pooler: 800 },
    { name: 'Large', price: 60, cpu: '8-core ARM', memory: '8GB', direct: 180, pooler: 1200 },
    { name: 'XLarge', price: 120, cpu: '16-core ARM', memory: '16GB', direct: 240, pooler: 2000 },
    { name: '2XLarge', price: 240, cpu: '32-core ARM', memory: '32GB', direct: 360, pooler: 3000 },
    { name: '4XLarge', price: 480, cpu: '64-core ARM', memory: '64GB', direct: 500, pooler: 5000 },
    { name: '8XLarge', price: 960, cpu: '64-core ARM', memory: '128GB', direct: 500, pooler: 8000 },
    { name: '16XLarge', price: 1920, cpu: '64-core ARM', memory: '256GB', direct: 500, pooler: 12000 },
  ];

  const addProject = () => {
    const updatedProjects = [...projects, { size: 'Micro', count: 1 }];
    setProjects(updatedProjects);
    calculateTotal(updatedProjects);
  };

  const removeProject = (index) => {
    if (projects.length <= 1) return;
    const updatedProjects = [...projects];
    updatedProjects.splice(index, 1);
    setProjects(updatedProjects);
    calculateTotal(updatedProjects);
  };

  const updateProjectSize = (index, size) => {
    const updatedProjects = [...projects];
    updatedProjects[index].size = size;
    setProjects(updatedProjects);
    calculateTotal(updatedProjects);
  };


  const calculateTotal = (projectsList) => {
    let total = 25; // Prix de base du plan Pro
    
    projectsList.forEach(project => {
      const sizeInfo = computeSizes.find(s => s.name === project.size);
      if (sizeInfo && project.count > 0) {
        total += sizeInfo.price * project.count;
      }
    });
    
    // Appliquer les crédits de calcul (max $10)
    const credits = Math.min(10, total - 25);
    setTotalEstimate(total - credits);
  };

  return (
    <div className="relative mt-12 bg-white rounded-xl p-6 border border-gray-200">
      <div className='flex mb-6'>
        {/* LEFT SIDE */}
        <div className='w-1/2'>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Compute Add-ons</h3>
            <p className="text-gray-600 mb-2">
                Paid Plans include $10/month in compute credits. Additional compute power is available if you need extra performance when scaling up.
            </p>
            <a href="#" className="text-green-500 hover:text-green-600 text-sm font-medium mb-6 inline-block">
                Learn about Compute add-ons →
            </a>
        </div>

        {/* RIGHT SIDE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border p-4 rounded-lg border-gray-300 w-1/2">
            <div className='pr-4 border-r border-gray-300 relative'>
                <h4 className="font-semibold text-gray-700 mb-3">Organization</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700">PRO Plan</span>
                    <span className="font-medium">$25</span>
                    </div>
                    <p className="text-sm text-gray-500">Includes $10 in compute credits</p>
                </div>
                <div className='absolute bottom-0'>
                    <div className="flex justify-between items-center space-x-2 mt-4 mb-2">
                        <span className="text-gray-700">Estimate Total</span>
                        <span className="font-bold text-lg">${totalEstimate}</span>
                    </div>
                </div>
            </div>

            <div>
            <h4 className="font-semibold text-gray-700 mb-3">Compute Add-ons</h4>
            {projects.map((project, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                        <select 
                            value={project.size} 
                            onChange={(e) => updateProjectSize(index, e.target.value)}
                            className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm mr-2 outline-none focus:border-emerald-500"
                        >
                            {computeSizes.map(size => (
                            <option key={size.name} value={size.name}>{size.name}</option>
                            ))}
                        </select>
                        </div>
                        <div className="flex items-center">
                        <button 
                            onClick={() => removeProject(index)}
                            className="text-red-500 hover:text-red-700 text-lg font-bold"
                            disabled={projects.length <= 1}
                        >
                            ×
                        </button>
                        </div>
                    </div>
                    {project.count > 0 && (
                        <div className="text-sm text-gray-500 mt-2">
                        {computeSizes.find(s => s.name === project.size)?.memory} RAM / {computeSizes.find(s => s.name === project.size)?.cpu} / Connections: Direct {computeSizes.find(s => s.name === project.size)?.direct}, Pooler {computeSizes.find(s => s.name === project.size)?.pooler}
                        </div>
                    )}
                    </div>
                ))}
                
                <button 
                    onClick={addProject}
                    className="border-dashed border w-full flex items-center justify-center py-1 cursor-pointer rounded-lg text-green-500 hover:text-green-600 text-sm font-medium"
                >
                    + Add Project
                </button>
            </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-6 overflow-x-auto mb-10 rounded-xl border border-gray-200">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                <tr>
                    <th className="px-6 py-3">Size</th>
                    <th className="px-6 py-3">Price ($)</th>
                    <th className="px-6 py-3">CPU</th>
                    <th className="px-6 py-3">Memory</th>
                    <th className="px-6 py-3">Direct</th>
                    <th className="px-6 py-3">Pooler</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {computeSizes.map((size, idx) => (
                    <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors duration-200"
                    >
                    <td className="px-6 py-4 font-medium text-gray-900">{size.name}</td>
                    <td className="px-6 py-4 text-green-600 font-semibold">${size.price}</td>
                    <td className="px-6 py-4">{size.cpu}</td>
                    <td className="px-6 py-4">{size.memory}</td>
                    <td className="px-6 py-4">{size.direct}</td>
                    <td className="px-6 py-4">{size.pooler}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
      )}

      {/* Expand More Button */}
      <div onClick={() => setShowDetails(!showDetails)} className="text-center absolute bottom-0 left-0 w-full border-t border-gray-300 py-3 flex items-center justify-center cursor-pointer">
        <button 
          
          className=" text-black font-semibold rounded-lg cursor-pointer "
        >
          {showDetails ? "Hide Details" : "Expand More Details"}
        </button>
      </div>

    </div>
  );
};

export default ComputeCalculator;
