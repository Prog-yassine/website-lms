import { useRef, useState } from "react";

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
  });
}

const CsvImport = ({ columns, data, onClose, onImport, onAddColumns }) => {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState([]);
  const [error, setError] = useState("");
  const [missingCols, setMissingCols] = useState([]);
  const [showAddColsModal, setShowAddColsModal] = useState(false);
  const fileInputRef = useRef();

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText(e.target.result);
      try {
        const rows = parseCSV(e.target.result);
        setParsed(rows);
        setError("");
        checkMissingColumns(rows);
      } catch {
        setError("Invalid CSV format.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e) => {
    setCsvText(e.target.value);
    try {
      const rows = parseCSV(e.target.value);
      setParsed(rows);
      setError("");
      checkMissingColumns(rows);
    } catch {
      setError("Invalid CSV format.");
    }
  };

  const checkMissingColumns = (rows) => {
    if (!rows.length) return;
    const csvHeaders = Object.keys(rows[0]);
    const existingHeaders = columns.map(c => c.name);
    const missing = csvHeaders.filter(h => !existingHeaders.includes(h));
    setMissingCols(missing);
    setShowAddColsModal(missing.length > 0);
  };

  const validateUnique = () => {
    let errors = [];
    columns.forEach(col => {
      if (col.isUnique) {
        const values = parsed.map(row => row[col.name]).filter(v => v !== undefined);
        const duplicates = values.filter((v, i, arr) => arr.indexOf(v) !== i && arr.indexOf(v) === i);
        if (duplicates.length) {
          errors.push(`Column "${col.name}" has duplicate values: ${duplicates.join(", ")}`);
        }
        // Check against existing data
        values.forEach(v => {
          if (data.some(row => row[col.name] === v)) {
            errors.push(`Value "${v}" in column "${col.name}" already exists in your table.`);
          }
        });
      }
    });
    setError(errors.join("\n"));
    return errors.length === 0;
  };

  const handleImport = () => {
    if (!validateUnique()) return;
    onImport(parsed);
    setCsvText("");
    setParsed([]);
    setError("");
    onClose();
  };

  const handleAddColumns = () => {
    onAddColumns(missingCols);
    setShowAddColsModal(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-300/30 backdrop-blur-sm flex items-center justify-end z-50">
      <div className="w-[500px] h-full bg-white border-l border-gray-300 flex flex-col">
        <div className="h-16 border-b border-gray-300 flex items-center justify-between px-5">
          <h1 className="font-medium text-lg">Add data from CSV</h1>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 flex flex-col px-5 py-8">
          <div className="flex space-x-2 mb-4">
            <button
              className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-medium"
              onClick={() => fileInputRef.current.click()}
            >
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={e => {
                if (e.target.files.length) handleFile(e.target.files[0]);
              }}
            />
            <button
              className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-medium"
              onClick={() => setCsvText("")}
            >
              Paste text
            </button>
          </div>
          <div
            className="flex-1 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4 bg-gray-50"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            style={{ minHeight: 120 }}
          >
            <textarea
              className="w-full h-full bg-transparent outline-none resize-none p-4"
              value={csvText}
              onChange={handlePaste}
              placeholder="Drag and drop, or paste CSV text here"
              rows={6}
            />
          </div>
          <div className="text-xs text-gray-500 mb-2">
            The first row should be the headers. Datetime columns: YYYY-MM-DD HH:mm:ss
          </div>
          {error && <div className="text-red-500 text-sm mb-2 whitespace-pre-line">{error}</div>}
          {parsed.length > 0 && (
            <div className="overflow-auto border rounded mb-2">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    {Object.keys(parsed[0]).map(h => (
                      <th key={h} className="p-2 border-b border-gray-200 bg-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="p-2 border-b border-gray-100">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="h-16 border-t border-gray-300 flex items-center justify-end px-5 space-x-3">
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
            disabled={!parsed.length || !!error}
            onClick={handleImport}
          >
            Import data
          </button>
        </div>
      </div>
      {/* Modal for adding missing columns */}
      {showAddColsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
            <h2 className="text-lg font-bold mb-2">Missing columns detected</h2>
            <p className="mb-4">The following columns are in your CSV but not in your table:</p>
            <ul className="mb-4 list-disc list-inside text-sm text-gray-700">
              {missingCols.map(col => <li key={col}>{col}</li>)}
            </ul>
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-2 text-sm bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
                onClick={() => setShowAddColsModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
                onClick={handleAddColumns}
              >
                Add columns
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvImport;