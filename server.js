const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const databaseFile = path.join(__dirname, "scholarships.json");

function getDatabase() {
    return JSON.parse(
        fs.readFileSync(databaseFile, "utf8")
    );
}

// Automatically close scholarships after deadline
function updateScholarshipStatus() {
    const database = getDatabase();
    const today = new Date();

    database.scholarships.forEach(scholarship => {
        if (scholarship.deadline) {
            const deadline = new Date(scholarship.deadline);

            scholarship.status =
                deadline < today ? "Closed" : "Open";
        }
    });

    database.lastUpdated = new Date().toISOString();

    fs.writeFileSync(
        databaseFile,
        JSON.stringify(database, null, 2)
    );
}

// Get all scholarships
app.get("/api/scholarships", (req, res) => {
    updateScholarshipStatus();
    res.json(getDatabase());
});

// Find scholarships for a student
app.post("/api/match", (req, res) => {

    const {
        income,
        category,
        percentage,
        education
    } = req.body;

    const database = getDatabase();

    const studentIncome = Number(income);
    const studentPercentage = Number(percentage);

    const matches = database.scholarships.filter(scholarship => {

        return (
            studentIncome <= scholarship.incomeLimit &&
            studentPercentage >= scholarship.minPercentage &&
            scholarship.category.includes(category) &&
            scholarship.education.includes(education) &&
            scholarship.status === "Open"
        );
    });

    res.json({
        success: true,
        count: matches.length,
        scholarships: matches,
        lastUpdated: database.lastUpdated
    });
});

// Manually check for updates
app.post("/api/update", (req, res) => {

    updateScholarshipStatus();

    res.json({
        success: true,
        message: "Scholarship database checked.",
        lastUpdated: new Date().toISOString()
    });
});

// Check every 6 hours
setInterval(() => {
    console.log("Checking scholarship database...");
    updateScholarshipStatus();
}, 6 * 60 * 60 * 1000);

app.listen(PORT, () => {
 console.log(
    `Scholar Match AI running at http://localhost:${PORT}`
);   

    updateScholarshipStatus();
});