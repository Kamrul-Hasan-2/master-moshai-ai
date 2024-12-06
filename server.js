const express = require("express");
const multer = require("multer");
const csv = require("fast-csv");
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const app = express();
const upload = multer({ dest: 'uploads/' });

const GEMINI_API_KEY = "AIzaSyALalRk61ya5VoZcUZOJccSZS-ka0ojdmg";

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Endpoint to upload CSV
app.post("/upload-csv", upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const results = [];
    
    // Read the CSV file
    fs.createReadStream(req.file.path)
        .pipe(csv.parse({ headers: true }))
        .on("data", async (row) => {
            // Prepare data for Gemini API
            const studentData = {
                id: row['Student Id'],
                subjects: {
                    Bangla: row['Bangla'],
                    English: row['English'],
                    Math: row['Math'],
                    Religion: row['Religion'],
                    Science: row['Science']
                }
            };
            results.push(studentData);
        })
        .on("end", async () => {
            // Call Gemini API with the collected data
            try {
                const response = await axios.post('https://gemini.api.endpoint', results, {
                    headers: {
                        'Authorization': `Bearer ${GEMINI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Process the response from Gemini API
                const processedResults = results.map((student, index) => ({
                    ...student,
                    weakSubjects: response.data[index].weakSubjects,
                    recommendations: response.data[index].recommendations,
                    needAttention: response.data[index].needAttention ? 1 : 0
                }));

                res.json(processedResults);
            } catch (error) {
                console.error('Error calling Gemini API:', error);
                res.status(500).send('Error processing data.');
            } finally {
                // Clean up the uploaded file
                fs.unlinkSync(req.file.path);
            }
        });
});

// Start the server
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});