import { useNavigate } from 'react-router-dom';



import { ReactComponent as Packages } from '../assets/icons/packages.svg';





const Organization = () => {
    const navcigate = useNavigate();

    const handleNewOrganization = () => {
        navcigate('/dashboard/org/new');
    };
    return (
        <div className="flex flex-col h-screen bg-gray-100 w-full ">
            <div className="w-full bg-white shadow px-6 py-4 flex items-center justify-start sticky top-0 z-10 space-x-2">
                <img src="../logo.svg" className='w-8 h-8'/>
                <div className="text-xl font-semibold">/ Organization</div>
            </div>
            <div>
                <div className="max-w-5xl mx-auto p-6 space-y-6 ">
                    <h2 className="text-2xl font-bold my-6">Welcome to the Organization Dashboard</h2>
                    <div className="flex flex-row space-x-4">
                        <button onClick={handleNewOrganization} className="h-10 bg-emerald-300 border rounded-lg border-emerald-500 px-3 cursor-pointer hover:bg-emerald-400 hover:border-emerald-600">New Organization</button>
                        <input type="text" className="min-w-sm h-10 px-4 bg-white rounded-lg focus:outline-gray-300" placeholder="Search for an organization"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white h-24 rounded-[10px] shadow-sm hover:shadow-md flex flex-row  text-black cursor-pointer">
                                <div className="flex items-center justify-center w-[80px] rounded-l-md"> 
                                    <div className="h-[50px] w-[50px] rounded-full bg-gray-100 mx-auto flex items-center justify-center"> 
                                        <Packages className="h-6 w-6 text-gray-500" />
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center h-full text-black font-semibold">
                                    <h1 className="w-full">Organization {i}</h1>
                                    <h1 className="w-full text-gray-500">Free Plan</h1>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Organization;