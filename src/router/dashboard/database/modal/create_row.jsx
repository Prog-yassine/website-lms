import { useState } from "react";

function getInputType(colType) {
    switch (colType?.toLowerCase()) {
        case "integer":
        case "bigint":
        case "float":
        case "double":
        case "serial":
        case "decimal":
        case "numeric":
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

const Create_Row = ({ columns, onClose, onCreate, data = [], table, dbname }) => {
    // Build initial state
    const initialState = {};

    columns.forEach(col => {
        // Auto PK ID
        if (col.isPrimary && col.name === "id") {
            let maxId = 0;
            data.forEach(row => {
                const val = Number(row.id);
                if (!isNaN(val)) maxId = Math.max(maxId, val);
            });
            initialState.id = String(maxId + 1);
        }
        else {
            // Use backend default if exists, else empty
            initialState[col.name] =
                col.defaultValue !== undefined &&
                col.defaultValue !== null &&
                col.defaultValue !== ""
                    ? col.defaultValue
                    : "";
        }
    });

    const [rowData, setRowData] = useState(initialState);

    // Input change manager
    const handleChange = (col, value, type) => {
        if (type === "number") {
            value = value === "" ? "" : Number(value);
        }
        if (type === "checkbox") {
            value = value.target.checked;
        }
        setRowData(prev => ({ ...prev, [col]: value }));
    };

    const handleCreate = async () => {
        // Validation
        for (const col of columns) {
            const value = rowData[col.name];
            const inputType = getInputType(col.type);

            // Required column cannot be empty
            // if (!col.isNullable && (value === "" || value === null || value === undefined)) {
            //     alert(`La colonne "${col.name}" ne peut pas être vide.`);
            //     return;
            // }

            // Unique constraint
            if (col.isUnique && value !== "" && data.some(r => String(r[col.name]) === String(value))) {
                alert(`La colonne "${col.name}" doit être unique !`);
                return;
            }

            // Number
            if (inputType === "number" && value !== "" && isNaN(value)) {
                alert(`La colonne "${col.name}" doit être un nombre valide.`);
                return;
            }

            // Date
            if (inputType === "date" && value && isNaN(Date.parse(value))) {
                alert(`La colonne "${col.name}" doit être une date valide.`);
                return;
            }

            // JSON
            if (
                (col.type === "json" || col.type === "jsonb") &&
                value !== "" &&
                typeof value === "string"
            ) {
                try {
                    JSON.parse(value);
                } catch {
                    alert(`La colonne "${col.name}" doit être un JSON valide.`);
                    return;
                }
            }
        }

        // Backend expects array
        const payload = [{ ...rowData }];

        try {
            const bearerToken = localStorage.getItem("token");

            const res = await fetch(
                `http://localhost:5000/api/data/add-rows/${table}?dbname=${dbname}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${bearerToken}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await res.json();

            if (!res.ok) {
                alert(result.error || result.message || "Erreur lors de l'ajout.");
                return;
            }

            onCreate(result.rows[0]);
            onClose();

        } catch (err) {
            console.error(err);
            alert("Network error");
        }
    };

    // JSX UI
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
                    >
                        ×
                    </button>
                </div>

                <div className="w-[800px] h-full bg-white flex py-10 px-5">
                    <form className="w-full space-y-6">
                        {columns.map(col => {
                            const type = getInputType(col.type);

                            return (
                                <div key={col.name} className="flex items-center">
                                    <label className="w-40 pr-6 font-medium text-gray-700">
                                        {col.name}
                                        {col.isPrimary && <span className="ml-2 text-emerald-600 font-bold">PK</span>}
                                        {col.isUnique && <span className="ml-2 text-blue-600 font-bold">UQ</span>}
                                    </label>

                                    {type === "textarea" ? (
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            value={rowData[col.name]}
                                            onChange={e => handleChange(col.name, e.target.value, type)}
                                        />
                                    ) : type === "checkbox" ? (
                                        <input
                                            type="checkbox"
                                            checked={!!rowData[col.name]}
                                            onChange={e => handleChange(col.name, e, type)}
                                            className="w-6 h-6 accent-emerald-500"
                                        />
                                    ) : (
                                        <input
                                            type={type}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            value={rowData[col.name]}
                                            onChange={e => handleChange(col.name, e.target.value, type)}
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
                        className="px-3 py-2 bg-gray-200 rounded-lg"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg"
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
