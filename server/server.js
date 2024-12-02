const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = 5000;

// Setup for file upload using multer
const upload = multer({ dest: "uploads/" }); // Temporary storage for uploaded files

app.use(cors());
app.use(bodyParser.json());

// Initialize OPTAB
const OPTAB = Array(59).fill(null).map(() => Array(3));

function initialize() {
    OPTAB[0] = ["FIX", "1", "C4"];
    OPTAB[1] = ["FLOAT", "1", "C0"];
    OPTAB[2] = ["HIO", "1", "F4"];
    OPTAB[3] = ["NORM", "1", "C8"];
    OPTAB[4] = ["SIO", "1", "F0"];
    OPTAB[5] = ["TIO", "1", "F8"];
    OPTAB[6] = ["ADDR", "2", "90"];
    OPTAB[7] = ["CLEAR", "2", "B4"];
    OPTAB[8] = ["COMPR", "2", "A0"];
    OPTAB[9] = ["DIVR", "2", "9C"];
    OPTAB[10] = ["MULR", "2", "98"];
    OPTAB[11] = ["RMO", "2", "AC"];
    OPTAB[12] = ["SHIFTL", "2", "A4"];
    OPTAB[13] = ["SHIFTR", "2", "A8"];
    OPTAB[14] = ["SUBR", "2", "94"];
    OPTAB[15] = ["SVC", "2", "B0"];
    OPTAB[16] = ["TIXR", "2", "B8"];
    OPTAB[17] = ["ADD", "3", "18"];
    OPTAB[18] = ["ADDF", "3", "58"];
    OPTAB[19] = ["AND", "3", "40"];
    OPTAB[20] = ["COMP", "3", "28"];
    OPTAB[21] = ["COMPF", "3", "88"];
    OPTAB[22] = ["DIV", "3", "24"];
    OPTAB[23] = ["DIVF", "3", "64"];
    OPTAB[24] = ["J", "3", "3C"];
    OPTAB[25] = ["JEQ", "3", "30"];
    OPTAB[26] = ["JGT", "3", "34"];
    OPTAB[27] = ["JLT", "3", "38"];
    OPTAB[28] = ["JSUB", "3", "48"];
    OPTAB[29] = ["LDA", "3", "00"];
    OPTAB[30] = ["LDB", "3", "68"];
    OPTAB[31] = ["LDCH", "3", "50"];
    OPTAB[32] = ["LDF", "3", "70"];
    OPTAB[33] = ["LDL", "3", "08"];
    OPTAB[34] = ["LDS", "3", "6C"];
    OPTAB[35] = ["LDT", "3", "74"];
    OPTAB[36] = ["LDX", "3", "04"];
    OPTAB[37] = ["LPS", "3", "D0"];
    OPTAB[38] = ["MUL", "3", "20"];
    OPTAB[39] = ["MULF", "3", "60"];
    OPTAB[40] = ["OR", "3", "44"];
    OPTAB[41] = ["RD", "3", "D8"];
    OPTAB[42] = ["RSUB", "3", "4C"];
    OPTAB[43] = ["SSK", "3", "EC"];
    OPTAB[44] = ["STA", "3", "0C"];
    OPTAB[45] = ["STB", "3", "78"];
    OPTAB[46] = ["STCH", "3", "54"];
    OPTAB[47] = ["STF", "3", "80"];
    OPTAB[48] = ["STI", "3", "D4"];
    OPTAB[49] = ["STL", "3", "14"];
    OPTAB[50] = ["STS", "3", "7C"];
    OPTAB[51] = ["STSW", "3", "E8"];
    OPTAB[52] = ["STT", "3", "84"];
    OPTAB[53] = ["STX", "3", "10"];
    OPTAB[54] = ["SUB", "3", "1C"];
    OPTAB[55] = ["SUBF", "3", "5C"];
    OPTAB[56] = ["TD", "3", "E0"];
    OPTAB[57] = ["TIX", "3", "2C"];
    OPTAB[58] = ["WD", "3", "DC"];
}

// Call initialize to populate the OPTAB
initialize();

// Function to assemble SIC code and calculate location counter
const assembleSIC = (code, startAddress = "0") => {
    const lines = code.split("\n");
    const label = [];
    const instruction = [];
    const reference = [];
    const locationCounter = [];
    const symbolTable = {}; // Initialize symbol table

    let locctr = parseInt(startAddress, 16); // Start location counter from the given address

    lines.forEach((line) => {
        locationCounter.push(locctr.toString(16).toUpperCase()); // Store the current location counter

        const words = line.trim().split(/\s+/);

        if (words.length === 3) {
            label.push(words[0]);
            instruction.push(words[1]);
            reference.push(words[2]);
        } else if (words.length === 2) {
            label.push("-"); 
            instruction.push(words[0]);
            reference.push(words[1]);
        } else if (words.length === 1) {
            label.push("-"); 
            instruction.push(words[0]);
            reference.push("-"); 
        } else {
            label.push("-"); 
            instruction.push("-");
            reference.push("-");
        }

        // Add the label and location to the symbol table
        if (label[label.length - 1] !== "-" && !symbolTable[label[label.length - 1]]) {
            symbolTable[label[label.length - 1]] = locctr.toString(16).toUpperCase();
        }

        // Work with instruction array to determine location counter
        const inst = instruction[label.length - 1];  // Use current instruction

        if (inst?.startsWith("+")) {
            locctr += 4; // Format 4 instructions
        } else if (inst === "WORD") {
            locctr += 3;
        } else if (inst === "RESW") {
            locctr += 3 * parseInt(reference[label.length - 1]);
        } else if (inst === "RESB") {
            locctr += parseInt(reference[label.length - 1]);
        } else if (inst === "BYTE") {
            const byteValue = reference[label.length - 1];
            if (byteValue.startsWith("X")) {
                locctr += Math.ceil((byteValue.length - 3) / 2);  // For hexadecimal literals
            } else if (byteValue.startsWith("C")) {
                locctr += byteValue.length - 3;  // For character literals
            }
        } else {
            const opInfo = OPTAB.find(op => op[0] === inst);
            if (opInfo) {
                locctr += parseInt(opInfo[1], 10);  // Add the size based on the format from OPTAB
            } else {
                console.warn(`Instruction not found in OPTAB: ${inst}`);
            }
        }
    });

    return { label, instruction, reference, locationCounter, symbolTable };
};

// Endpoint to handle assembly of SIC code
app.post("/assemble", upload.single("file"), (req, res) => {
    let code = req.body.code;

    if (req.file) {
        fs.readFile(req.file.path, "utf-8", (err, fileContent) => {
            if (err) {
                return res.status(500).json({ error: "Failed to read file" });
            }
            code = fileContent;
            const { label, instruction, reference, locationCounter, symbolTable } = assembleSIC(code);
            res.json({ label, instruction, reference, locationCounter, symbolTable });
        });
    } else {
        const { label, instruction, reference, locationCounter, symbolTable } = assembleSIC(code);
        res.json({ label, instruction, reference, locationCounter, symbolTable });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
