import React, { useState } from "react";

function App() {
  const [sicCode, setSicCode] = useState("");
  const [output, setOutput] = useState([]);
  const [symbolTable, setSymbolTable] = useState([]);
  const [programLength, setProgramLength] = useState(null);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [file, setFile] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSicCode(e.target.result);
      };
      reader.readAsText(file);
      setFile(file);
    }
  };

  // Function to send SIC code to the backend for processing
  const handleAssemble = async () => {
    setLoading(true);
    setOutput([]);
    setSymbolTable([]);
    setProgramLength(null);

    try {
      const response = await fetch("http://localhost:5000/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sicCode }),
      });

      const data = await response.json();

      if (
        response.ok &&
        data.label &&
        data.instruction &&
        data.reference &&
        data.locationCounter &&
        data.symbolTable &&
        data.objectCode &&
        data.records
      ) {
        const assembledOutput = data.locationCounter.map((loc, index) => ({
          locationCounter: loc,
          label: data.label[index] || "-",
          instruction: data.instruction[index] || "-",
          reference: data.reference[index] || "-",
          objectCode: data.objectCode[index] || "-",
        }));
        setOutput(assembledOutput);

        const symbolTableData = Object.entries(data.symbolTable).map(
          ([label, location]) => ({
            label,
            location,
          })
        );
        setSymbolTable(symbolTableData);

        setProgramLength(data.programLength);

        const records = data.records.map((record, index) => {
          const parts = record.split("^");
          return {
            type: parts[0],
            address: parts[1],
            length: parts[2],
            objectCode: parts.slice(3).join("^"),
          };
        });
        setRecords(records);
      } else {
        setOutput([
          {
            locationCounter: "-",
            label: "Error",
            instruction: "Error",
            reference: data.error || "Unknown error occurred",
            objectCode: "-",
          },
        ]);
      }
    } catch (error) {
      setOutput([
        {
          locationCounter: "-",
          label: "Error",
          instruction: "Error",
          reference: "Error",
          objectCode: "-",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="parentDiv" style={{ padding: "20px" }}>
      <h1 className="title">SIC/XE Assembler</h1>

      {/* File Upload Section */}
      <input
        type="file"
        accept=".txt"
        className="inputFile"
        onChange={handleFileUpload}
        disabled={loading}
        style={{ marginBottom: "20px" }}
      />

      <textarea
        rows="10"
        cols="50"
        className="textInput"
        placeholder="Write SIC code here or upload a file..."
        value={sicCode}
        onChange={(e) => setSicCode(e.target.value)}
        disabled={loading}
      />
      <br />
      <button onClick={handleAssemble} disabled={loading}>
        {loading ? "Assembling..." : "Assemble"}{" "}
        {/* Button text based on loading state */}
      </button>

      <h2 style={{ textAlign: "center" }}>Assmbled Code</h2>

      {/* Render the assembly output as a table */}
      {output.length > 0 && (
        <div className="table-wrapper">
          <table
            className="table"
            border="1"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              marginTop: "20px",
            }}
          >
            <thead>
              <tr>
                <th>Location Counter</th>
                <th>Label</th>
                <th>Instruction</th>
                <th>Reference</th>
                <th>Object Code</th> {/* New Object Code column */}
              </tr>
            </thead>
            <tbody>
              {output.map((row, index) => (
                <tr key={index}>
                  <td>{row.locationCounter}</td>
                  <td>{row.label}</td>
                  <td>{row.instruction}</td>
                  <td>{row.reference}</td>
                  <td>{row.objectCode}</td> {/* Display Object Code */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Display a message if no output is available */}
      {output.length === 0 && !loading && <p>No output to display.</p>}

      <h2 style={{ textAlign: "center" }}>Symbol Table</h2>

      {/* Render the symbol table as a table */}
      {symbolTable.length > 0 && (
        <div className="table-wrapper">
          <table
            border="1"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              marginTop: "20px",
            }}
            className="table"
          >
            <thead>
              <tr>
                <th>Label</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {symbolTable.map((row, index) => (
                <tr key={index}>
                  <td>{row.label}</td>
                  <td>{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Display a message if no symbol table is available */}
      {symbolTable.length === 0 && !loading && (
        <p>No symbol table to display.</p>
      )}

      {/* Display the program length */}
      {programLength !== null && (
        <h3 style={{ textAlign: "center" }}>Program Length: {programLength}</h3>
      )}

      {records.length > 0 && (
        <div className="records-wrapper" style={{ marginTop: "20px" }}>
          {records.map((record, index) => {
            return (
              <div key={index} style={{ marginBottom: "10px" }}>
                <pre>
                  {record.type}^
                  {record.address && record.type !== "E"
                    ? `${record.address}^`
                    : `${record.address}`}
                  {record.length && record.type !== "E"
                    ? `${record.length}^`
                    : ""}
                  {record.objectCode}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
