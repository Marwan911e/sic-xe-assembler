# SIC/XE Assembler — Web Interface

A browser-based frontend for the [SIC/XE Assembler API](../sic-assembler-api/README.md). Allows users to write or upload SIC/XE assembly source code and instantly view the assembled output, symbol table, and loader records — no command line required.

---

## Overview

This interface sits on top of the `POST /assemble` REST API and provides:

- A live code editor for writing SIC/XE assembly inline
- A file picker for uploading `.asm` source files
- A rendered view of the assembled instruction table
- A symbol table display showing all resolved label–address mappings

---

## Preview

![SIC/XE Assembler UI](./preview.png)

---

## Features

- **Dual input modes** — type assembly directly into the editor or browse and upload a source file
- **One-click assembly** — hit **Assemble** to dispatch the source to the API and render results immediately
- **Assembled Code table** — displays label, instruction, operand, location counter, and object code per line
- **Symbol Table** — lists every resolved symbol and its hex address
- **Dark theme** — low-eye-strain interface suitable for extended use

---

## Getting Started

### Prerequisites

- The [SIC/XE Assembler API](../sic-assembler-api/README.md) must be running locally on `http://localhost:5000`

### Running the Frontend

If the frontend is a static HTML/CSS/JS project, serve it with any static file server:

```bash
# Using Node.js http-server
npx http-server . -p 3000

# Using Python
python3 -m http.server 3000
```

Then open your browser at:

```
http://localhost:3000
```

> Make sure the backend API is already running on port `5000` before assembling any code.

---

## Usage

### Option A — Write Inline

1. Type or paste SIC/XE assembly code into the text editor
2. Click **Assemble**
3. View the assembled instruction table and symbol table below

### Option B — Upload a File

1. Click **Browse...** and select a `.asm` or plain-text source file
2. Click **Assemble**
3. View results

### Example Input

```
COPY   START  1000
FIRST  STL    RETADR
CLOOP  JSUB   RDREC
       LDA    LENGTH
       RSUB
RETADR RESW   1
LENGTH WORD   3
       END    FIRST
```

### Expected Output

**Assembled Code**

| Label | Instruction | Operand | Location Counter | Object Code |
|---|---|---|---|---|
| COPY | START | 1000 | 1000 | — |
| FIRST | STL | RETADR | 1000 | 172009 |
| CLOOP | JSUB | RDREC | 1003 | 4B2FFA |
| — | LDA | LENGTH | 1006 | 032006 |
| — | RSUB | — | 1009 | 4F0000 |
| RETADR | RESW | 1 | 100C | — |
| LENGTH | WORD | 3 | 100F | 000003 |

**Symbol Table**

| Symbol | Address |
|---|---|
| COPY | 1000 |
| FIRST | 1000 |
| CLOOP | 1003 |
| RETADR | 100C |
| LENGTH | 100F |

---

## Project Structure

```
sic-assembler-frontend/
├── index.html       ← Main UI layout
├── style.css        ← Stylesheet (dark theme)
├── app.js           ← API calls and DOM rendering logic
└── preview.png      ← Screenshot for documentation
```

---

## API Integration

The frontend communicates with the assembler backend via a single endpoint:

```
POST http://localhost:5000/assemble
```

**Inline code** is sent as a JSON body:

```json
{ "code": "COPY START 1000\n..." }
```

**File uploads** are sent as `multipart/form-data` with a `file` field.

The full API response schema is documented in the [API README](../sic-assembler-api/README.md#response-schema).

---

## Known Issues & Planned Improvements

| Issue | Status |
|---|---|
| Typo: "Assmbled Code" heading | Open |
| No inline error display when the API returns a failure | Open |
| No loading indicator during assembly | Open |
| API base URL is hardcoded | Open — should be configurable via environment or config file |
| No syntax highlighting in the editor | Planned |
| No copy-to-clipboard for object code / records output | Planned |

---

## Related

- [SIC/XE Assembler API](../sic-assembler-api/README.md) — the backend this interface depends on
- Leland Beck — *System Software: An Introduction to Systems Programming* — the reference architecture

---

## License

ISC — see the root `package.json` or the API repository for details.
