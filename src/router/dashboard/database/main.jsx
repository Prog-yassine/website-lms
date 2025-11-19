import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
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

const Main = ({ divisionId, bearerToken, public_ip, dbname }) => {
  const { table } = useParams();
  const [InsertDropDownOpen, setInsertDropDownOpen] = useState(false);
  const [SortDropDownOpen, setSortDropDownOpen] = useState(false);
  const [FilterDropDownOpen, setFilterDropDownOpen] = useState(false);
  
  const [CsvModalOpen, setCsvModalOpen] = useState(false);
  const [ColumnModalOpen, setColumnModalOpen] = useState(false);
  const [RowModalOpen, setRowModalOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState({ rowId: null, col: null });

  // ===== Fetch tenant table from API =====
  useEffect(() => {
    const fetchTenantTable = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/data/table/${table}?dbname=${dbname}`,
          {
            headers: { Authorization: `Bearer ${bearerToken}` },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch tenant table");
        const tableData = await res.json();

        const mappedColumns = tableData.columns.map((col) => ({
          name: col.name,
          type: col.type,
          isPrimary: tableData.primary_keys.includes(col.name),
          isUnique: false,
          isNullable: col.nullable,
          defaultValue: col.default,
          desc: "",
        }));

        const mappedRows = tableData.rows.map((row, index) => ({
          id: index + 1,
          ...row,
        }));

        setColumns(mappedColumns);
        setData(mappedRows);
      } catch (err) {
        console.error("❌ Error fetching tenant table:", err);
      }
    };
    fetchTenantTable();
  }, [table, bearerToken]);

  // ===== Row selection =====
  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    if (selected.length === data.length) setSelected([]);
    else setSelected(data.map((row) => row.id));
  };

  // ===== Editing =====
  const handleDoubleClick = (rowId, col) => setEditing({ rowId, col });
  const handleChange = (rowId, col, value) => {
    const colObj = columns.find(c => c.name === col);
    if (colObj?.isUnique && data.some(r => r[col] === value && r.id !== rowId)) {
      alert("Cette valeur doit être unique !");
      return;
    }
    if (colObj && !colObj.isNullable && (value === "" || value == null)) {
      alert("Cette colonne ne peut pas être vide !");
      return;
    }
    setData(prev =>
      prev.map(row => (row.id === rowId ? { ...row, [col]: value } : row))
    );
  };
  const handleBlur = () => setEditing({ rowId: null, col: null });

  // ===== Close dropdowns on outside click =====
  useEffect(() => {
    function handleClickOutside(event) {
      if (InsertDropDownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) setInsertDropDownOpen(false);
      if (FilterDropDownOpen && filterRef.current && !filterRef.current.contains(event.target)) setFilterDropDownOpen(false);
      if (SortDropDownOpen && sortRef.current && !sortRef.current.contains(event.target)) setSortDropDownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [InsertDropDownOpen, FilterDropDownOpen, SortDropDownOpen]);

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* TOP BUTTONS UI */}
      <div className="w-full h-14 bg-gray-50 flex items-center bg-white px-2">
        {/* FILTER */}
        <div className="relative">
          <button onClick={() => setFilterDropDownOpen(!FilterDropDownOpen)} className="flex items-center space-x-1 px-3 py-1 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-300">
            <Filter className="w-5"/> <h1>Filter</h1>
          </button>
          {FilterDropDownOpen && (
            <div ref={filterRef} className="font-medium bg-white flex-cols items-center min-w-max p-2 border border-gray-300 rounded-lg absolute top-10 left-2 z-50">
              <h1 className="text-sm text-gray-600">No filters applied</h1>
              <h1 className="text-sm text-gray-400">Add a column below to filter</h1>
              <div className="flex w-full items-center py-1 justify-between border-t border-gray-300 mt-1">
                <button className="flex items-center px-2 py-1 hover:bg-gray-300 rounded-lg cursor-pointer">
                  <Plus className="w-5 h-5 text-black"/> <h1 className="text-sm">Add filter</h1>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* SORT */}
        <div className="relative mx-2">
          <button onClick={() => setSortDropDownOpen(!SortDropDownOpen)} className="flex items-center space-x-1 px-3 py-1 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-300">
            <Sort className="w-5"/> <h1>Sort</h1>
          </button>
          {SortDropDownOpen && (
            <div ref={sortRef} className="font-medium bg-white flex-cols items-center min-w-max p-2 border border-gray-300 rounded-lg absolute top-10 left-2 z-50">
              <h1 className="text-sm text-gray-600">No sorts applied</h1>
              <h1 className="text-sm text-gray-400">Add a column below to sort</h1>
              <div className="flex w-full items-center py-1 justify-between border-t border-gray-300 mt-1">
                <button className="flex items-center px-2 py-1 hover:bg-gray-300 rounded-lg cursor-pointer">
                  <Plus className="w-5 h-5 text-black"/> <h1 className="text-sm">Add sort</h1>
                </button>
              </div>
            </div>
          )}
        </div>
        {/* INSERT DROPDOWN */}
        <div className="relative px-2 h-full flex items-center border-l border-gray-300">
          <button onClick={() => setInsertDropDownOpen(!InsertDropDownOpen)} className="flex items-center space-x-1 px-3 py-1 bg-emerald-300 hover:bg-emerald-400 rounded-lg cursor-pointer border border-emerald-500">
            <h1>Insert</h1> <ChevronDown className="inline w-4 h-4 ml-1"/>
          </button>
          {InsertDropDownOpen && (
            <div ref={dropdownRef} className="font-medium bg-white flex-cols items-center min-w-max p-2 border border-gray-300 rounded-lg absolute top-12 left-2 z-50">
              <div onClick={() => setColumnModalOpen(true)} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                <TableCol /> <h1>Insert column</h1>
              </div>
              <div onClick={() => setRowModalOpen(true)} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                <TablsRow /> <h1>Insert row</h1>
              </div>
              <div onClick={() => setCsvModalOpen(true)} className="flex items-center space-x-2 px-2 py-2 hover:bg-gray-100 cursor-pointer">
                <FileCSV /> <h1>Insert data from CSV</h1>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="absolute top-14 left-0 w-full   overflow-auto bg-white " id="scrollbar">
        <table className="rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 min-w-30 border-t border-b border-r border-gray-300">
                <input
                  type="checkbox"
                  checked={selected.length === data.length && data.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-emerald-500"
                />
              </th>
              {columns.map(col => (
                <th
                  key={col.name}
                  className="p-2 w-40 border-r border-y border-gray-300 text-left font-medium whitespace-nowrap"
                  title={col.desc || ""}
                >
                  <div className="flex flex-col">
                    <span className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h1>{col.name}</h1>
                        <h1 className="text-gray-400 font-normal">{col.type}</h1>
                      </div>
                      <div className="flex items-center space-x-1 text-sm">
                        {col.isPrimary && (
                          <span className="text-emerald-600 font-bold ml-1 ">PK</span>
                        )}
                        {col.isUnique && (
                          <span className="text-blue-600 font-bold ml-1">UQ</span>
                        )}
                      </div>
                    </span>
                  </div>
                </th>
              ))}
              <th className="min-w-30 border-t border-b border-r border-gray-300">
                <button
                  className="h-full w-30 flex items-center justify-center w-full cursor-pointer"
                  onClick={() => setColumnModalOpen(true)}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id} className={selected.includes(row.id) ? "bg-gray-100" : ""}>
                <td className="p-2 w-30 border-y border-r border-gray-300 text-center">
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    className="accent-emerald-500"
                  />
                </td>
                {columns.map(col => (
                  <td
                    key={col.name}
                    className="w-40 h-10 truncate whitespace-nowrap overflow-hidden border-l border-b border-gray-300 cursor-text"
                    onDoubleClick={() => handleDoubleClick(row.id, col.name)}
                  >
                    {editing.rowId === row.id && editing.col === col.name ? (
                      <input
                        type="text"
                        autoFocus
                        value={row[col.name]}
                        onChange={(e) => handleChange(row.id, col.name, e.target.value)}
                        onBlur={handleBlur}
                        className="w-[300px] text-sm h-full outline-none px-2 whitespace-nowrap w-full"
                        style={{ width: `${(row[col.name]?.length || 1) + 5}ch` }}
                      />
                    ) : (
                      <h1 className="p-2 text-sm whitespace-nowrap truncate overflow-hidden">
                        {row[col.name] !== null && typeof row[col.name] === "object"
                          ? JSON.stringify(row[col.name])
                          : row[col.name] || ""}
                      </h1>
                    )}
                  </td>
                ))}
                <td className="p-2 w-34 border-l border-b border-gray-300"></td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

      {/* MODALS */}
      {ColumnModalOpen && <Create_Column bearerToken={bearerToken} dbname={dbname} table={table} public_ip={public_ip} onClose={() => setColumnModalOpen(false)} onCreate={(col) => {
        let newCol = { ...col };
        setColumns(prev => [...prev, newCol]);
        setData(prev => prev.map(row => ({ ...row, [newCol.name]: newCol.defaultValue || "" })));
        setColumnModalOpen(false);
      }} />}
      {RowModalOpen && <Create_Row columns={columns} dbname={dbname} table={table} onClose={() => setRowModalOpen(false)} onCreate={(row) => {
        const newId = Math.max(0, ...data.map(r => r.id)) + 1;
        setData(prev => [...prev, { id: newId, ...row }]);
        setRowModalOpen(false);
      }} />}
      {CsvModalOpen && <CsvImport 
        columns={columns} 
        data={data} 
        onClose={() => setCsvModalOpen(false)} 
        onImport={(rows) => {
            let maxId = Math.max(0, ...data.map(r => Number(r.id) || 0));
            const newRows = rows.map(row => ({ id: ++maxId, ...row }));
            setData(prev => [...prev, ...newRows]);
            setCsvModalOpen(false);
        }}
        onAddColumns={(missingCols) => {
            // Ajoute les colonnes manquantes au tableau
            const newCols = missingCols.map(col => ({
                name: col,
                type: "string",
                isPrimary: false,
                isUnique: false,
                isNullable: true,
                defaultValue: "",
                desc: "",
            }));
            setColumns(prev => [...prev, ...newCols]);
            setData(prev => prev.map(row => {
                const newRow = { ...row };
                missingCols.forEach(col => newRow[col] = "");
                return newRow;
            }));
        }}
    />}
    </div>
  );
};

export default Main;
