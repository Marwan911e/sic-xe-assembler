import React, { useState } from "react";

function App() {
    const [sicCode, setSicCode] = useState(""); // Store the user input
    const [output, setOutput] = useState([]); // Store the assembled output as an array
    const [symbolTable, setSymbolTable] = useState([]); // Store the symbol table
    const [loading, setLoading] = useState(false); // Track loading state
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

        try {
            const response = await fetch("http://localhost:5000/assemble", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: sicCode }), // Send SIC code as JSON
            });

            const data = await response.json();

            if (response.ok && data.label && data.instruction && data.reference && data.locationCounter && data.symbolTable) {
                // Transform the data into a table-friendly format for assembly output
                const assembledOutput = data.locationCounter.map((loc, index) => ({
                    locationCounter: loc,
                    label: data.label[index] || "-",
                    instruction: data.instruction[index] || "-",
                    reference: data.reference[index] || "-",
                }));
                setOutput(assembledOutput); // Update output state with the result

                // Set the symbol table data
                const symbolTableData = Object.entries(data.symbolTable).map(([label, location]) => ({
                    label,
                    location,
                }));
                setSymbolTable(symbolTableData); // Update symbol table state with the result
            } else {
                setOutput([{ locationCounter: "-", label: "Error", instruction: "Error", reference: data.error || "Unknown error occurred" }]); // Show error message
            }
        } catch (error) {
            setOutput([{ locationCounter: "-", label: "Error", instruction: "Error", reference: "Failed to connect to server. Please try again." }]);
        } finally {
            setLoading(false); // Stop loading
        }
    };

    return (
        <div style={{ padding: "20px"}}>
            <h1>SIC Assembler</h1>

            {/* File Upload Section */}
            <input 
                type="file" 
                accept=".txt" 
                onChange={handleFileUpload} 
                disabled={loading}
            />
            {file && <p>Uploaded File: {file.name}</p>}

            <textarea
                rows="10"
                cols="50"
                placeholder="Write SIC code here or upload a file..."
                value={sicCode}
                onChange={(e) => setSicCode(e.target.value)} // Update sicCode when user types
                disabled={loading}
            />
            <br />
            <button onClick={handleAssemble} disabled={loading}>
                {loading ? "Assembling..." : "Assemble"} {/* Button text based on loading state */}
            </button>

            <h2>Output:</h2>

            {/* Render the assembly output as a table */}
            {output.length > 0 && (
                <table border="1" style={{ borderCollapse: "collapse", width: "100%", marginTop: "20px" }}>
                    <thead>
                        <tr>
                            <th>Location Counter</th>
                            <th>Label</th>
                            <th>Instruction</th>
                            <th>Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        {output.map((row, index) => (
                            <tr key={index}>
                                <td>{row.locationCounter}</td>
                                <td>{row.label}</td>
                                <td>{row.instruction}</td>
                                <td>{row.reference}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Display a message if no output is available */}
            {output.length === 0 && !loading && <p>No output to display.</p>}

            <h2>Symbol Table:</h2>

            {/* Render the symbol table as a table */}
            {symbolTable.length > 0 && (
                <table border="1" style={{ borderCollapse: "collapse", width: "100%", marginTop: "20px" }}>
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
            )}

            {/* Display a message if no symbol table is available */}
            {symbolTable.length === 0 && !loading && <p>No symbol table to display.</p>}
        </div>
    );
}

export default App;
