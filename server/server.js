const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const { CLIENT_RENEG_WINDOW } = require("tls");
const { log } = require("console");

const app = express();
const PORT = 5000;

// Setup for file upload using multer
const upload = multer({ dest: "uploads/" }); // Temporary storage for uploaded files

app.use(cors());
app.use(bodyParser.json());

// Initialize OPTAB
const OPTAB = Array(59)
  .fill(null)
  .map(() => Array(3));

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

const assemble = (code) => {
  const lines = code.split("\n");
  const label = [];
  const instruction = [];
  const reference = [];
  const locationCounter = [];
  const symbolTable = {}; // Initialize symbol table
  const objectCode = [];
  const length = locationCounter.length;
  const registerMap = {
    A: "0",
    X: "1",
    L: "2",
    B: "3",
    S: "4",
    T: "5",
    F: "6",
    PC: "8",
    SW: "9",
  };
  // First, process the lines to populate the reference array
  lines.forEach((line) => {
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
  });
  // Initialize the startAddress (locctr) after the reference array is populated
  let locctr = 0; // Default starting address
  // If reference[0] exists, use it as the starting address
  if (reference[0]) {
    locctr = parseInt(reference[0], 16);
  }
  // Calculate the location counter and symbol table
  lines.forEach((line, index) => {
    locationCounter.push(locctr.toString(16).toUpperCase()); // Store the current location counter

    const words = line.trim().split(/\s+/);
    const currentLabel = label[index];
    const currentInst = instruction[index];
    const currentRef = reference[index];

    // Add the label and location to the symbol table
    if (currentLabel !== "-" && !symbolTable[currentLabel]) {
      symbolTable[currentLabel] = locctr.toString(16).toUpperCase();
    }

    // Determine how much to increment the location counter based on the instruction
    if (currentInst?.startsWith("+")) {
      locctr += 4; // Format 4 instructions
    } else if (currentInst === "WORD") {
      locctr += 3;
    } else if (currentInst === "RESW") {
      locctr += 3 * parseInt(currentRef);
    } else if (currentInst === "RESB") {
      locctr += parseInt(currentRef);
    } else if (currentInst === "BYTE") {
      const byteValue = currentRef;
      if (byteValue.startsWith("X")) {
        locctr += Math.ceil((byteValue.length - 3) / 2); // For hexadecimal literals
      } else if (byteValue.startsWith("C")) {
        locctr += byteValue.length - 3; // For character literals
      }
    } else {
      const opInfo = OPTAB.find((op) => op[0] === currentInst);
      if (opInfo) {
        locctr += parseInt(opInfo[1], 10); // Add the size based on the format from OPTAB
      } else {
        console.warn(`Instruction not found in OPTAB: ${currentInst}`);
      }
    }
  });
  // Calculate the program length
  const lastLocctr = locationCounter[locationCounter.length - 1];
  const startingAddress = reference[0];
  const lastLocctrDecimal = parseInt(lastLocctr, 16);
  const startingAddressDecimal = parseInt(startingAddress, 16);
  const programLengthDecimal = lastLocctrDecimal - startingAddressDecimal;
  const programLength = programLengthDecimal.toString(16);
  function findBaseRegister() {
    let baseRegister = 0;
    for (let index = 0; index < instruction.length; index++) {
      let currentInst = instruction[index];
      if (currentInst === "BASE") {
        let symbol = reference[index];
        if (symbol in symbolTable) {
          baseRegister = symbolTable[symbol];
        } else {
          console.log(`Symbol ${symbol} not found in symbolTable`);
        }
      }
    }
    return baseRegister;
  }
  // object code generation
  for (let index = 0; index < instruction.length; index++) {
    let obcode = null;
    let n = 0,
      i = 0,
      x = 0,
      b = 0,
      p = 0,
      e = 0;
    let currentInst = instruction[index];
    let currentRef = reference[index];
    let pc = locationCounter[index + 1];
    let baseRegister = findBaseRegister();
    let instructionData = OPTAB.find((op) => op[0] === currentInst);
    if (instructionData) {
      let opcode = instructionData[2];
      console.log(
        `${index}: ${currentInst} => format: ${instructionData[1]}, opcode: ${opcode}, pc = ${pc}, base = ${baseRegister}`
      );
      if (instructionData[1] === "1") {
      } else if (instructionData[1] === "2") {
        opcode = instructionData[2];
        if (reference[index].length == 3) {
          let reg1 = "";
          let reg2 = "";
          let values = reference[index].split(",");
          reg1 = registerMap[values[0]];
          reg2 = registerMap[values[1]];
          obcode = opcode + reg1 + reg2;
        } else if (reference[index].length == 1) {
          let value = reference[index];
          let reg = registerMap[value];
          obcode = opcode + reg + "0";
        }
      } else if (instructionData[1] === "3") {
        let opcode = instructionData[2];
        let firstDigit = parseInt(opcode[0], 16);
        let secondDigit = parseInt(opcode[1], 16);
        let binaryFirst = firstDigit.toString(2).padStart(4, "0");
        let binarySecond = secondDigit.toString(2).padStart(4, "0");
        let modifiedBinarySecond = binarySecond.slice(0, 2);
        let binaryOpcode = binaryFirst + modifiedBinarySecond;
        if (currentInst == "RSUB"){
            obcode = "4F0000"
        }
        else if (reference[index].startsWith("#")) {
          let targetValue = reference[index].slice(1);
          console.log(`target value is ${targetValue}`);
          if (/^\d+$/.test(targetValue)) {
            (n = 0), (i = 1), (x = 0), (b = 0), (p = 0), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            targetValue = targetValue.padStart(3, "0");
            obcode = hexValue + targetValue;
          } else {
            let targetAddress = symbolTable[targetValue];
            let targetDecimal = parseInt(targetAddress, 16); // 16 indicates base 16 (hexadecimal)
            let pcDecimal = parseInt(pc, 16);
            let dispDecimal = targetDecimal - pcDecimal;
            let dispHex = dispDecimal.toString(16).toUpperCase();
            dispHex = dispHex.replace("-", "");
            if (-2048 <= dispDecimal && dispDecimal <= 2047) {
              let opcode = instructionData[2];
              let firstDigit = parseInt(opcode[0], 16);
              let secondDigit = parseInt(opcode[1], 16);
              let binaryFirst = firstDigit.toString(2).padStart(4, "0");
              let binarySecond = secondDigit.toString(2).padStart(4, "0");
              let modifiedBinarySecond = binarySecond.slice(0, 2);
              let binaryOpcode = binaryFirst + modifiedBinarySecond;
              (n = 0), (i = 1), (x = 0), (b = 0), (p = 1), (e = 0);
              let flagbits =
                n.toString() +
                i.toString() +
                x.toString() +
                b.toString() +
                p.toString() +
                e.toString();
              let opcodeAndFlagBits = binaryOpcode + flagbits;
              let hexValue = parseInt(opcodeAndFlagBits, 2)
                .toString(16)
                .toUpperCase()
                .padStart(3, "0");
              let dispHex = Math.abs(dispDecimal)
                .toString(16)
                .padStart(3, "0")
                .toUpperCase();
              obcode = hexValue + dispHex;
            }
          }
        } else if (reference[index].startsWith("@")) {
          let targetVariable = reference[index].slice(1);
          let targetAddress = symbolTable[targetVariable];
          let decimalTargetAddress = parseInt(targetAddress, 16);
          let decimalPc = parseInt(pc, 16);
          let decimalDisp = decimalTargetAddress - decimalPc;
          if (-2048 <= decimalDisp && decimalDisp < 2047) {
            (n = 1), (i = 0), (x = 0), (b = 0), (p = 1), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            let hexDisp = Math.abs(decimalDisp)
              .toString(16)
              .padStart(3, "0")
              .toUpperCase();
            obcode = hexValue + hexDisp;
          } else {
            let opcode = instructionData[2];
            let firstDigit = parseInt(opcode[0], 16);
            let secondDigit = parseInt(opcode[1], 16);
            let binaryFirst = firstDigit.toString(2).padStart(4, "0");
            let binarySecond = secondDigit.toString(2).padStart(4, "0");
            let modifiedBinarySecond = binarySecond.slice(0, 2);
            let binaryOpcode = binaryFirst + modifiedBinarySecond;
            (n = 1), (i = 0), (x = 0), (b = 1), (p = 0), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            let decimalBaseRegister = parseInt(baseRegister, 16).toString();
            let decimalDisp = decimalTargetAddress - decimalBaseRegister;
            let hexDisp = (
              decimalDisp >= 0
                ? decimalDisp.toString(16)
                : (0xfff + decimalDisp + 1).toString(16)
            )
              .toUpperCase()
              .padStart(3, "0");
            obcode = hexValue + hexDisp;
          }
        } else if (reference[index].includes(",X")) {
          let targetValue = reference[index].slice(0, -2);
          let targetAddress = symbolTable[targetValue];
          let decimalTargetAddress = parseInt(targetAddress, 16);
          let decimalPc = parseInt(pc, 16);
          let decimalDisp = decimalTargetAddress - decimalPc;
          let hexDisp = decimalDisp.toString(16).toUpperCase();
          hexDisp = hexDisp.replace("-", "");
          hexDisp = hexDisp.padStart(3, "0");
          if (-2048 <= decimalDisp && decimalDisp < 2047) {
            (n = 1), (i = 1), (x = 1), (b = 0), (p = 1), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            obcode = hexValue + hexDisp;
          } else {
            (n = 1), (i = 1), (x = 1), (b = 1), (p = 0), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            let decimalBaseRegister = parseInt(baseRegister, 16);
            let decimalDisp = decimalTargetAddress - decimalBaseRegister;
            let hexDisp = decimalDisp.toString(16).toUpperCase();
            hexDisp = hexDisp.replace("-", "");
            hexDisp = hexDisp.padStart(3, "0");
            obcode = hexValue + hexDisp;
          }
        } else {
            let opcode = instructionData[2];
          let firstDigit = parseInt(opcode[0], 16);
          let secondDigit = parseInt(opcode[1], 16);
          let binaryFirst = firstDigit.toString(2).padStart(4, "0");
          let binarySecond = secondDigit.toString(2).padStart(4, "0");
          let modifiedBinarySecond = binarySecond.slice(0, 2);
          let binaryOpcode = binaryFirst + modifiedBinarySecond;
          let targetAddress = symbolTable[reference[index]];
          let decimalTargetAddress = parseInt(targetAddress, 16);
          let decimalPc = parseInt(pc, 16);
          let decimalDisp = decimalTargetAddress - decimalPc;
          let hexDisp = ((decimalDisp + 4096) % 4096)
            .toString(16)
            .toUpperCase();
          hexDisp = hexDisp.replace("-", "");
          hexDisp = hexDisp.padStart(3, "0");
          if (-2048 <= decimalDisp && decimalDisp < 2047) {
            (n = 1), (i = 1), (x = 0), (b = 0), (p = 1), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            obcode = hexValue + hexDisp;
          } else {
            (n = 1), (i = 1), (x = 0), (b = 1), (p = 0), (e = 0);
            let flagbits =
              n.toString() +
              i.toString() +
              x.toString() +
              b.toString() +
              p.toString() +
              e.toString();
            let opcodeAndFlagBits = binaryOpcode + flagbits;
            let hexValue = parseInt(opcodeAndFlagBits, 2)
              .toString(16)
              .toUpperCase()
              .padStart(3, "0");
            let decimalBaseRegister = parseInt(baseRegister, 16).toString();
            let decimalDisp = decimalTargetAddress - decimalBaseRegister;
            let hexDisp = ((decimalDisp + 4096) % 4096)
              .toString(16)
              .toUpperCase();
            hexDisp = hexDisp.replace("-", "");
            hexDisp = hexDisp.padStart(3, "0");
            obcode = hexValue + hexDisp;
          }
        }
      }
    } else {
      if (currentInst.startsWith("+")) {
        let currentInst = instruction[index].slice(1);
        let instructionData = OPTAB.find((op) => op[0] === currentInst);
        let opcode = instructionData[2];
        let firstDigit = parseInt(opcode[0], 16);
        let secondDigit = parseInt(opcode[1], 16);
        let binaryFirst = firstDigit.toString(2).padStart(4, "0");
        let binarySecond = secondDigit.toString(2).padStart(4, "0");
        let modifiedBinarySecond = binarySecond.slice(0, 2);
        let binaryOpcode = binaryFirst + modifiedBinarySecond;
        if (currentRef.startsWith("#")) {
          (n = 0), (i = 1), (x = 0), (b = 0), (p = 0), (e = 1);
          let flagbits =
            n.toString() +
            i.toString() +
            x.toString() +
            b.toString() +
            p.toString() +
            e.toString();
          let opcodeAndFlagBits = binaryOpcode + flagbits;
          let hexValue = parseInt(opcodeAndFlagBits, 2)
            .toString(16)
            .toUpperCase()
            .padStart(3, "0");
          let targetValue = reference[index].slice(1);
          if (/^\d+$/.test(targetValue)) {
            let decimalAddress = reference[index].slice(1);
            let decimalValue = parseInt(decimalAddress, 10);
            let hexAddress = decimalValue
              .toString(16)
              .toUpperCase()
              .padStart(5, "0");
            obcode = hexValue + hexAddress;
          } else {
            let hexAddress = symbolTable[targetValue];
            hexAddress = hexAddress.padStart(5, "0");
            obcode = hexValue + hexAddress;
          }
        } else {
          (n = 1), (i = 1), (x = 0), (b = 0), (p = 0), (e = 1);
          let flagbits =
            n.toString() +
            i.toString() +
            x.toString() +
            b.toString() +
            p.toString() +
            e.toString();
          let opcodeAndFlagBits = binaryOpcode + flagbits;
          let hexValue = parseInt(opcodeAndFlagBits, 2)
            .toString(16)
            .toUpperCase()
            .padStart(3, "0");
          let address = symbolTable[reference[index]]; // Assume this is a hexadecimal value as a string, e.g., "1A3"
          // Convert the address to a number (parse it as a hexadecimal)
          let decimalAddress = parseInt(address, 16);
          // Convert the number back to hexadecimal with padding to ensure it is 5 digits
          let paddedAddress = decimalAddress
            .toString(16)
            .toUpperCase()
            .padStart(5, "0");
          obcode = hexValue + paddedAddress;
        }
      } else if (currentInst === "BASE") {
        obcode = "No Object code";
      } else if (currentInst === "WORD") {
        obcode = reference[index];
        objectCode.push(opcode)
      } else if (currentInst === "BYTE") {
        let opcode = "";
        if (reference[index].startsWith("X")) {
          obcode = reference[index].substring(2, reference[index].length - 1);
        } else if (reference[index].startsWith("C")) {
          let string = reference[index].substring(
            2,
            reference[index].length - 1
          );
          let asciiString = "";
          for (let i = 0; i < string.length; i++) {
            let asciiCode = string.charCodeAt(i).toString(16).toUpperCase();
            asciiString += asciiCode;
          }
          obcode = asciiString;
        }
      } else {
        console.log(`Instruction ${currentInst} not found in OPTAB.`);
      }
    }
    if (obcode == null) {
      objectCode.push(`No Object code`);
    } else {
      objectCode.push(obcode);
    }
  }
  // HTE record
  

  return {
    label,
    instruction,
    reference,
    locationCounter,
    symbolTable,
    programLength,
    objectCode,
  };
};

// Endpoint to handle assembly of SIC code
app.post("/assemble", upload.single("file"), (req, res) => {
  let code = req.body.code;

  if (req.file) {
    fs.readFile(req.file.path, "utf-8", (err, data) => {
      if (err) {
        return res.status(500).json({ message: "Error reading file." });
      }

      code = data; // Read code from file
      const assemblyResult = assemble(code);

      res.json(assemblyResult); // Send result back to client
    });
  } else {
    const assemblyResult = assemble(code);

    res.json(assemblyResult); // Send result back to client
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
