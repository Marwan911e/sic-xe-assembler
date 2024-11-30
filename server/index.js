const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const assembleSIC = (code) => {
    const lines = code.split("\n"); 
    return lines.map((line, index) => `Line ${index + 1}: ${line.toUpperCase()}`).join("\n");
};

app.post("/assemble", (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: "code is required!"});
        }

    const assembledOutput = assembleSIC(code);
    res.json({ assembledOutput })
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

