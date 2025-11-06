import { useState, useRef, useEffect } from "react";
import { ReactComponent as Search } from "../../../../assets/icons/search.svg";
import { ReactComponent as Text } from "../../../../assets/icons/cursor-text.svg";
import { ReactComponent as Braces } from "../../../../assets/icons/braces.svg";
import { ReactComponent as Hash } from "../../../../assets/icons/hash.svg";
import { ReactComponent as Calendar } from "../../../../assets/icons/calendar-week.svg";
import { ReactComponent as ToggleLeft } from "../../../../assets/icons/toggle-left.svg";
// Fix: pgTypes should be array of objects with label and icon
const pgTypes = [
    { label: "UUID", icon: <Hash className="w-5 h-5" /> },
    { label: "Float", icon: <Hash className="w-5 h-5" /> },
    { label: "Integer", icon: <Hash className="w-5 h-5" /> },
    { label: "Bigint", icon: <Hash className="w-5 h-5" /> },
    { label: "Serial", icon: <Hash className="w-5 h-5" /> },
    { label: "Text", icon: <Text className="w-5 h-5" /> },
    { label: "Varchar", icon: <Text className="w-5 h-5" /> },
    { label: "Boolean", icon: <ToggleLeft className="w-5 h-5" /> },
    { label: "Date", icon: <Calendar className="w-5 h-5" /> },
    { label: "Time", icon: <Calendar className="w-5 h-5" /> },
    { label: "Timestamp", icon: <Calendar className="w-5 h-5" /> },
    { label: "Timestamptz", icon: <Calendar className="w-5 h-5" /> },
    { label: "Json", icon: <Braces className="w-5 h-5" /> },
    { label: "Jsonb", icon: <Braces className="w-5 h-5" /> },
    { label: "Array", icon: <Braces className="w-5 h-5" /> },
];

// Fix: CustomSelect should filter by label, not by object
const CustomSelect = ({ options, value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const ref = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (open && ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    // Fix: filter by label
    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={ref}>
            <button
                type="button"
                className="cursor-pointer  w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center space-x-1"
                onClick={() => setOpen((o) => !o)}
            >
                {value?.icon || ""}
                <h1>{value?.label || "Select type"}</h1>
            </button>
            {open && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow mt-1 overflow-y-auto max-h-60">
                    <div className="flex items-center sticky top-0 bg-white px-3 py-2 border-b border-gray-200">
                        <Search className="text-gray-400"/>
                        <input
                            type="text"
                            className="w-full px-2 py-1 outline-none placeholder:text-gray-400"
                            placeholder="Search type..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-gray-400">No options found</div>
                    ) : (
                        filteredOptions.map((opt) => (
                            <div
                                key={opt.label}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2"
                                onClick={() => {
                                    onChange(opt);
                                    setOpen(false);
                                    setSearch("");
                                }}
                            >
                                <span>{opt.icon}</span>
                                <span>{opt.label}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const Create_Column = ({ onClose, onCreate, bearerToken, public_ip  }) => {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [type, setType] = useState(null);
    const [defaultValue, setDefaultValue] = useState("");
    const [isPrimary, setIsPrimary] = useState(false);
    const [isNullable, setIsNullable] = useState(false);
    const [isUnique, setIsUnique] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleCreate = async () => {
        if (!name || !type) return; // validation simple
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`http://${public_ip}:3000/third_party/add-column/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${bearerToken}`,
                },
                body: JSON.stringify({
                    name,
                    type: type.label,
                    defaultValue,
                    isPrimary,
                    isNullable,
                    isUnique,
                    desc, // tu peux stocker la description ailleurs si besoin
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Erreur serveur");

            // notifier le parent pour rafraîchir la table
            onCreate && onCreate({ name, type: type.label, desc, defaultValue, isPrimary, isNullable, isUnique, });;
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex w-full h-full fixed top-0 right-0 border-l border-gray-300 bg-gray-300/30 backdrop-blur-sm">
            <div className="flex-1 h-full" onClick={onClose}></div>
            <div className="w-[800px] border-l border-gray-300 h-full bg-white flex flex-col">
                <div className="w-full h-16 bg-white border-b border-gray-300 flex items-center justify-between px-5">
                    <h1 className="font-medium text-lg">Create a new column</h1>
                    <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="w-[800px] h-full bg-white flex py-10 px-5">
                    <form className="w-full">
                        <div className="space-y-6">
                            {/* Name */}
                            <div className="flex items-center">
                                <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                    Column Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter column name"
                                />
                            </div>
                            {/* Description */}
                            <div className="flex items-start">
                                <label className="w-40 text-text pr-6 font-medium text-gray-700 ">
                                    Description
                                </label>
                                <textarea
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                    value={desc}
                                    rows={4}
                                    onChange={(e) => setDesc(e.target.value)}
                                    placeholder="Enter description"
                                />
                            </div>
                            {/* Type */}
                            <div className="flex items-center">
                                <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                    Type
                                </label>
                                <CustomSelect
                                    options={pgTypes}
                                    value={type}
                                    onChange={setType}
                                />
                            </div>
                            {/* Default Value */}
                            <div className="flex items-center">
                                <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                    Default Value
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                    value={defaultValue}
                                    onChange={(e) => setDefaultValue(e.target.value)}
                                    placeholder="Default value"
                                />
                            </div>
                            {/* Primary Key */}
                            <div className="flex items-center">
                                <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                    Primary Key
                                </label>
                                <div className="w-full flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-6 h-6 accent-emerald-500"
                                        checked={isPrimary}
                                        onChange={(e) => setIsPrimary(e.target.checked)}
                                    />
                                </div>
                            </div>
                            {/* Nullable */}
                            <div className="flex items-center">
                                <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                    Allow Null
                                </label>
                                <div className="w-full flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-6 h-6 accent-emerald-500"
                                        checked={isNullable}
                                        onChange={(e) => setIsNullable(e.target.checked)}
                                    />
                                </div>
                            </div>
                            {/* Unique */}
                            <div className="flex items-center">
                                <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                    Unique
                                </label>
                                <div className="w-full flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        className="w-6 h-6 accent-emerald-500"
                                        checked={isUnique}
                                        onChange={(e) => setIsUnique(e.target.checked)}
                                    />
                                </div>
                            </div>

                        </div>
                    </form>
                </div>
                <div className="w-full h-16 bg-white border-t border-gray-300 flex items-center justify-end px-5 space-x-3">
                    <button
                        type="button"
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                        onClick={handleCreate}
                    >
                        Create Column
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Create_Column;
