const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint to upload Excel file
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // Parse the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Process the data (e.g., count due days)
    // TODO: Implement logic to count due days and send emails

    res.send('File uploaded and processed successfully.');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});