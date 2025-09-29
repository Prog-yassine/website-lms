import { useState } from "react";

function getInputType(colType) {
    switch (colType.toLowerCase()) {
        case "integer":
        case "bigint":
        case "float":
        case "double":
        case "serial":
            return "number";
        case "boolean":
            return "checkbox";
        case "date":
            return "date";
        case "timestamp":
        case "timestamptz":
            return "datetime-local";
        case "json":
        case "jsonb":
        case "array":
            return "textarea";
        default:
            return "text";
    }
}

const Create_Row = ({ columns, onClose, onCreate, data = [] }) => {
    // Initialize state for each column including id
    const initialState = {};
    columns.forEach(col => {
        if (col.name === "id" && col.isPrimary) {
            const maxId = data.length > 0 ? Math.max(...data.map(r => Number(r.id) || 0)) : 0;
            initialState.id = String(maxId + 1);
        } else {
            initialState[col.name] = col.defaultValue || "";
        }
    });
    const [rowData, setRowData] = useState(initialState);

    const handleChange = (col, value, type) => {
        if (type === "number") {
            value = value === "" ? "" : Number(value);
        }
        if (type === "checkbox") {
            value = value.target.checked;
        }
        setRowData(prev => ({ ...prev, [col]: value }));
    };

    const handleCreate = () => {
        for (const col of columns) {
            const value = rowData[col.name];
            if (!col.isNullable && (value === "" || value == null)) {
                alert(`La colonne "${col.name}" ne peut pas être vide.`);
                return;
            }
            if (col.isUnique && data.some(row => String(row[col.name]) === String(value))) {
                alert(`La colonne "${col.name}" doit être unique !`);
                return;
            }
            // Type validation
            const type = getInputType(col.type);
            if (type === "number" && value !== "" && isNaN(value)) {
                alert(`La colonne "${col.name}" doit être un nombre.`);
                return;
            }
            if (type === "date" && value && isNaN(Date.parse(value))) {
                alert(`La colonne "${col.name}" doit être une date valide.`);
                return;
            }
            if ((col.type === "json" || col.type === "jsonb") && value) {
                try {
                    JSON.parse(value);
                } catch {
                    alert(`La colonne "${col.name}" doit être un JSON valide.`);
                    return;
                }
            }
        }
        onCreate(rowData);
    };

    return (
        <div className="flex w-full h-full fixed top-0 right-0 border-l border-gray-300 bg-gray-300/30 backdrop-blur-sm">
            <div className="flex-1 h-full" onClick={onClose}></div>
            <div className="w-[800px] border-l border-gray-300 h-full bg-white flex flex-col">
                <div className="w-full h-16 bg-white border-b border-gray-300 flex items-center justify-between px-5">
                    <h1 className="font-medium text-lg">Create a new row</h1>
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
                    <form className="w-full space-y-6">
                        {columns.map(col => {
                            const inputType = getInputType(col.type);
                            return (
                                <div key={col.name} className="flex items-center">
                                    <label className="w-40 text-left pr-6 font-medium text-gray-700">
                                        {col.name}
                                        {col.isPrimary && <span className="ml-2 text-emerald-600 font-bold">PK</span>}
                                        {col.isUnique && <span className="ml-2 text-blue-600 font-bold">UQ</span>}
                                    </label>
                                    {inputType === "textarea" ? (
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={rowData[col.name]}
                                            onChange={e => handleChange(col.name, e.target.value, inputType)}
                                            placeholder={col.desc || ""}
                                        />
                                    ) : inputType === "checkbox" ? (
                                        <input
                                            type="checkbox"
                                            checked={!!rowData[col.name]}
                                            onChange={e => handleChange(col.name, e, inputType)}
                                            className="w-6 h-6 accent-emerald-500"
                                        />
                                    ) : (
                                        <input
                                            type={inputType}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none"
                                            value={rowData[col.name]}
                                            onChange={e => handleChange(col.name, e.target.value, inputType)}
                                            placeholder={col.desc || ""}
                                        />
                                    )}
                                </div>
                            );
                        })}
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
                        Create Row
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Create_Row;