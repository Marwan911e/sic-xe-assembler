import React, { useState } from "react";

function App() {
  const [sicCode, setSicCode] = useState(""); // Store the user input
  const [output, setOutput] = useState([]); // Store the assembled output as an array
  const [symbolTable, setSymbolTable] = useState([]); // Store the symbol table
  const [programLength, setProgramLength] = useState(null); // Store the program length
  const [loading, setLoading] = useState(false); // Track loading state
  const [records, setRecords] = useState([]);
  const [file, setFile] = useState(null); // Track the uploaded file

  // Function to handle file upload and read file contents
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSicCode(e.target.result); // Set the SIC code from file contents
      };
      reader.readAsText(file); // Read the file as text
      setFile(file); // Store the file
    }
  };

  // Function to send SIC code to the backend for processing
  const handleAssemble = async () => {
    setLoading(true); // Start loading
    setOutput([]); // Reset the output before new assembly
    setSymbolTable([]); // Reset the symbol table before new assembly
    setProgramLength(null); // Reset program length before new assembly

    try {
      const response = await fetch("http://localhost:5000/assemble", {
        // Make sure this URL matches the backend endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sicCode }), // Send SIC code as JSON
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
        data.records // Ensure the records are included in the response
      ) {
        // Transform the data into a table-friendly format for assembly output
        const assembledOutput = data.locationCounter.map((loc, index) => ({
          locationCounter: loc,
          label: data.label[index] || "-",
          instruction: data.instruction[index] || "-",
          reference: data.reference[index] || "-",
          objectCode: data.objectCode[index] || "-", // Add Object Code
        }));
        setOutput(assembledOutput); // Update output state with the result

        // Set the symbol table data
        const symbolTableData = Object.entries(data.symbolTable).map(
          ([label, location]) => ({
            label,
            location,
          })
        );
        setSymbolTable(symbolTableData); // Update symbol table state with the result

        // Set the program length from the response
        setProgramLength(data.programLength); // Set the program length

        // Set the records (H, T, E records)
        const records = data.records.map((record, index) => {
          const parts = record.split("^");
          return {
            type: parts[0], // H, T, or E
            address: parts[1], // Address or starting address
            length: parts[2], // Length of the record (for T records)
            objectCode: parts.slice(3).join("^"), // The object code (only for T records)
          };
        });
        setRecords(records); // Store the records state
      } else {
        setOutput([
          {
            locationCounter: "-",
            label: "Error",
            instruction: "Error",
            reference: data.error || "Unknown error occurred",
            objectCode: "-",
          },
        ]); // Show error message
      }
    } catch (error) {
      setOutput([
        {
          locationCounter: "-",
          label: "Error",
          instruction: "Error",
          reference: "Failed to connect to server. Please try again.",
          objectCode: "-",
        },
      ]);
    } finally {
      setLoading(false); // Stop loading
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
        onChange={(e) => setSicCode(e.target.value)} // Update sicCode when user types
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
            {record.address && record.type !== "E" ? `${record.address}^` : `${record.address}`}
            {record.length && record.type !== "E" ? `${record.length}^` : ""}
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
