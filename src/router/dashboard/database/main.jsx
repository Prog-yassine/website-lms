import { useState, useRef, useEffect } from "react";
import { ReactComponent as Plus } from "../../../assets/icons/plus.svg";
import { ReactComponent as TableCol } from "../../../assets/icons/table-column.svg";
import { ReactComponent as TablsRow } from "../../../assets/icons/table-row.svg";
import { ReactComponent as FileCSV } from "../../../assets/icons/file-type-csv.svg";
import { ReactComponent as Filter } from "../../../assets/icons/filter.svg";
import { ReactComponent as Sort } from "../../../assets/icons/sort-ascending.svg";
import { ReactComponent as ChevronDown } from "../../../assets/icons/chevron-down.svg";
import Create_Column from "./modal/create_collumn";
import Create_Row from "./modal/create_row";
import CsvImport from "./modal/csvfile";

const Main = ({ divisionId }) => {
  const [InsertDropDownOpen, setInsertDropdownOpen] = useState(false);
  const [SortDropDownOpen, setSortDropDownOpen] = useState(false);
  const [FilterDropDownOpen, setFilterDropDownOpen] = useState(false);
  
  const [CsvModalOpen, setCsvModalOpen] = useState(false);
  const [ColumnModalOpen, setColumnModalOpen] = useState(false);
  const [RowModalOpen, setRowModalOpen] = useState(false);
  

  const dropdownRef = useRef(null);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const [data, setData] = useState([
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ]);

  const [columns, setColumns] = useState([
    { name: "id", type: "serial", isPrimary: true, isUnique: true, isNullable: false, defaultValue: "1", desc: "Identifiant unique" },
    { name: "name", type: "text", isPrimary: false, isUnique: false, isNullable: false, defaultValue: "", desc: "Nom complet" },
    { name: "email", type: "text", isPrimary: false, isUnique: true, isNullable: false, defaultValue: "", desc: "Adresse email" },
  ]);

  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState({ rowId: null, col: null });

  // Toggle row selection
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Select all toggle
  const toggleSelectAll = () => {
    if (selected.length === data.length) {
      setSelected([]); // unselect all
    } else {
      setSelected(data.map((row) => row.id)); // select all
    }
  };

  // Add new column
  const addColumn = () => {
    const newCol = {
      name: prompt("Enter column name:"),
      type: prompt("Enter column type:"),
    };
    if (newCol?.name && !columns.find((c) => c.name === newCol.name)) {
      setColumns([...columns, newCol]);
      setData(data.map((row) => ({ ...row, [newCol.name]: "" })));
    }
  };

  // Handle edit start
  const handleDoubleClick = (rowId, col) => {
    setEditing({ rowId, col });
  };

  // Handle edit finish
  const handleChange = (rowId, col, value) => {
    const colObj = columns.find(c => c.name === col);
    if (colObj?.isUnique) {
      if (data.some(row => row[col] === value && row.id !== rowId)) {
        alert("Cette valeur doit être unique !");
        return;
      }
    }
    if (colObj && !colObj.isNullable && (value === "" || value === null)) {
      alert("Cette colonne ne peut pas être vide !");
      return;
    }
    setData((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [col]: value } : row
      )
    );
  };

  const handleBlur = () => {
    setEditing({ rowId: null, col: null });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      // Insert dropdown
      if (
        InsertDropDownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setInsertDropdownOpen(false);
      }
      // Filter dropdown
      if (
        FilterDropDownOpen &&
        filterRef.current &&
        !filterRef.current.contains(event.target)
      ) {
        setFilterDropDownOpen(false);
      }
      // Sort dropdown
      if (
        SortDropDownOpen &&
        sortRef.current &&
        !sortRef.current.contains(event.target)
      ) {
        setSortDropDownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [InsertDropDownOpen, FilterDropDownOpen, SortDropDownOpen]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Add Column Button */}
      <div className="w-full h-14 bg-gray-50 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-2 px-2">
          <div className="relative">
            <button onClick={() => setFilterDropDownOpen(!FilterDropDownOpen)} className="flex items-center space-x-1 px-3 py-1 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-300">
              <Filter className="w-5"/>
              <h1>Filter</h1>
            </button>
            {FilterDropDownOpen === true &&
              <div ref={filterRef} className="font-medium bg-white flex-cols items-center min-w-max p-2 border border-gray-300 rounded-lg absolute top-10 left-2">
                <h1 className="text-sm text-gray-600">No filters applied to this view</h1>
                <h1 className="text-sm text-gray-400">Add a column below to filter the view</h1>
                <div className="flex w-full items-center py-1 justify-between border-t border-gray-300 mt-1">
                  <button className="flex items-center  px-2 py-1 hover:bg-gray-300 rounded-lg cursor-pointer">
                    <Plus className="w-5 h-5 text-black"/>
                    <h1 className="text-sm">Add filter</h1>
                  </button>
                </div>
              </div>
            }
          </div>
          <div className="relative">
            <button onClick={() => setSortDropDownOpen(!SortDropDownOpen)} className="flex items-center space-x-1 px-3 py-1 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-300">
              <Sort className="w-5"/>
              <h1>Sort</h1>
            </button>
            {SortDropDownOpen === true &&
              <div ref={sortRef} className="font-medium bg-white flex-cols items-center min-w-max p-2 border border-gray-300 rounded-lg absolute top-10 left-2">
                <h1 className="text-sm text-gray-600">No sorts applied to this view</h1>
                <h1 className="text-sm text-gray-400">Add a column below to sort the view</h1>
                <div className="flex w-full items-center py-1 justify-between border-t border-gray-300 mt-1">
                  <button className="flex items-center  px-2 py-1 hover:bg-gray-300 rounded-lg cursor-pointer">
                    <Plus className="w-5 h-5 text-black"/>
                    <h1 className="text-sm">Add sort</h1>
                  </button>
                </div>
              </div>
            }
          </div>
          <div className="relative px-2 h-full border-l border-gray-300">
            <button onClick={() => setInsertDropdownOpen(!InsertDropDownOpen)} className="flex items-center space-x-1 px-3 py-1 bg-emerald-300 hover:bg-emerald-400 rounded-lg cursor-pointer border border-emerald-500">
              <h1>Insert</h1>
              <ChevronDown className="inline w-4 h-4 ml-1"/>
            </button>
            {InsertDropDownOpen === true && 
              <div ref={dropdownRef} className="font-medium bg-white flex-cols items-center min-w-max p-2 border border-gray-300 rounded-lg absolute top-10 left-2">
                <div onClick={() => setColumnModalOpen(!ColumnModalOpen)} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                  <TableCol />
                  <h1>Insert column</h1>
                </div>
                <div onClick={() => setRowModalOpen(!RowModalOpen)} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                  <TablsRow />
                  <h1>Insert row</h1>
                </div>
                <div onClick={() => setCsvModalOpen(!CsvModalOpen)} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                  <FileCSV />
                  <h1>Insert data from CSV</h1>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 w-12 border-t border-b border-r border-gray-300">
                <input
                  type="checkbox"
                  checked={selected.length === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-emerald-500"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="p-2 w-40 border-r border-y border-gray-300 text-left font-medium"
                  title={col.desc || ""}
                >
                  <div className="flex flex-col">
                    <span className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h1>{col.name}</h1>
                        <h1 className="text-gray-400 font-normal">{col.type}</h1>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        {col.isPrimary && <span className="text-emerald-600 font-bold ml-1 ">PK</span>}
                        {col.isUnique && <span className="text-blue-600 font-bold ml-1">UQ</span>}
                      </div>
                    </span>
                  </div>
                </th>
              ))}
              <th className="w-12 border-t border-b border-r border-gray-300">
                <button
                  className="h-full flex items-center justify-center w-full cursor-pointer"
                  onClick={() => setColumnModalOpen(!ColumnModalOpen)}
                >
                  <Plus className="w-5 h-5 " />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                className={selected.includes(row.id) ? "bg-gray-100" : ""}
              >
                <td className="p-2 w-12 border-y border-r border-gray-300 text-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="accent-emerald-500"
                  />
                </td>
                {columns.map((col) => (
                  <td
                    key={col.name}
                    className="w-40 h-10 truncate border-l border-b border-gray-300 cursor-text"
                    onDoubleClick={() => handleDoubleClick(row.id, col.name)}
                  >
                    {editing.rowId === row.id && editing.col === col.name ? (
                      <input
                        type="text"
                        autoFocus
                        value={row[col.name]}
                        onChange={(e) =>
                          handleChange(row.id, col.name, e.target.value)
                        }
                        onBlur={handleBlur}
                        className="text-sm w-full h-full outline-none focus:border border-gray-900 px-2"
                      />
                    ) : (
                      <h1 className="p-2 text-sm">{row[col.name] || ""}</h1>
                    )}
                  </td>
                ))}
                <td className="p-2 w-12 border-l border-b border-gray-300"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ColumnModalOpen && <Create_Column 
        onClose={() => setColumnModalOpen(false)} 
        onCreate={(col) => {
          let newCol = { ...col };
          if (col.isPrimary) {
            newCol.isUnique = true;
            newCol.isNullable = false;
            if (col.type === "Integer") {
              const max = Math.max(0, ...data.map(r => Number(r[col.name] || 0)));
              newCol.defaultValue = String(max + 1);
            }
          }
          setColumns((prev) => [...prev, newCol]);
          setData((prev) => prev.map(row => {
            let value = "";
            // Default value
            if (newCol.defaultValue !== undefined && newCol.defaultValue !== "") {
              value = newCol.defaultValue;
            }
            // Unique: vérifie si la valeur existe déjà
            if (newCol.isUnique && prev.some(r => r[newCol.name] === value)) {
              value = "";
            }
            // Not nullable: force a value if missing
            if (!newCol.isNullable && (!value || value === "")) {
              value = newCol.defaultValue || "N/A";
            }
            return { ...row, [newCol.name]: value };
          }));
          setColumnModalOpen(false);
        }}
      />}
      {RowModalOpen && (
        <Create_Row
          columns={columns}
          onClose={() => setRowModalOpen(false)}
          onCreate={(row) => {
            // Generate a new id (auto-increment)
            const newId = Math.max(0, ...data.map(r => r.id)) + 1;
            const newRow = { id: newId, ...row };
            setData(prev => [...prev, newRow]);
            setRowModalOpen(false);
          }}
        />
      )}
      {CsvModalOpen && (
        <CsvImport
          columns={columns}
          data={data}
          onClose={() => setCsvModalOpen(false)}
          onImport={(rows) => {
            const idCol = columns.find(c => c.name === "id");
            let maxId = Math.max(0, ...data.map(r => Number(r.id) || 0));
            const newRows = [];

            rows.forEach(row => {
              let newRow = { ...row };

              // Security: Sanitize all incoming data
              Object.keys(newRow).forEach(key => {
                if (typeof newRow[key] === "string") {
                  newRow[key] = newRow[key].replace(/[<>]/g, ""); // basic XSS prevention
                }
              });

              // Security: Ignore CSV id if auto-generated
              if (idCol && (idCol.type === "serial" || idCol.isPrimary)) {
                maxId += 1;
                newRow.id = maxId;
              } else if (data.some(r => String(r.id) === String(row.id))) {
                // Security: Prevent duplicate IDs
                return;
              }

              // Security: Check unique columns
              for (const col of columns) {
                if (col.isUnique && data.some(r => r[col.name] === newRow[col.name])) {
                  // Optionally log or notify about duplicate unique values
                  return;
                }
              }

              // Security: Enforce not-null columns
              for (const col of columns) {
                if (!col.isNullable && (newRow[col.name] === "" || newRow[col.name] == null)) {
                  // Optionally fill with default or skip
                  newRow[col.name] = col.defaultValue || "N/A";
                }
              }

              newRows.push(newRow);
            });

            setData(prev => [...prev, ...newRows]);
            setCsvModalOpen(false);
          }}
          onAddColumns={(missingCols) => {
            const newCols = missingCols.map(name => ({
              name,
              type: "text",
              isPrimary: false,
              isUnique: false,
              isNullable: false, // force not nullable for this example
              defaultValue: "N/A",
              desc: "",
            }));
            setColumns(prev => [...prev, ...newCols]);
            // Update existing data to fill missing columns
            setData(prev =>
              prev.map(row => {
                let updated = { ...row };
                newCols.forEach(col => {
                  if (!updated.hasOwnProperty(col.name) || updated[col.name] === "" || updated[col.name] == null) {
                    updated[col.name] = col.defaultValue || "N/A";
                  }
                });
                return updated;
              })
            );
          }}
        />
      )}
    </div>
  );
};

export default Main;
