const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const databaseFile = path.join(__dirname, "scholarships.json");

function getDatabase() {
    return JSON.parse(
        fs.readFileSync(databaseFile, "utf8")
    );
}

// Update scholarship status based on deadline
function updateScholarshipStatus() {
    const database = getDatabase();
    const today = new Date();

    database.scholarships.forEach((scholarship) => {
        if (scholarship.deadline) {
            const deadline = new Date(
                scholarship.deadline + "T23:59:59"
            );

            scholarship.status =
                deadline >= today ? "Open" : "Closed";
        }
    });

    database.lastUpdated = new Date().toISOString();

    fs.writeFileSync(
        databaseFile,
        JSON.stringify(database, null, 2)
    );

    return database;
}

// Get all scholarships
app.get("/api/scholarships", (req, res) => {
    const database = updateScholarshipStatus();

    res.json(database);
});

// Find scholarships for a student
app.post("/api/match", (req, res) => {
    try {
        const {
            income,
            category,
            percentage,
            education
        } = req.body;

        const database = updateScholarshipStatus();

        const studentIncome = Number(income);
        const studentPercentage = Number(percentage);

        const studentCategory =
            String(category || "").trim().toLowerCase();

        const studentEducation =
            String(education || "").trim().toLowerCase();

        const matches = database.scholarships.filter((scholarship) => {

            const categories = scholarship.category.map(
                item => String(item).trim().toLowerCase()
            );

            const educationLevels = scholarship.education.map(
                item => String(item).trim().toLowerCase()
            );

            const incomeMatch =
                !Number.isNaN(studentIncome) &&
                studentIncome <= Number(scholarship.incomeLimit);

            const percentageMatch =
                !Number.isNaN(studentPercentage) &&
                studentPercentage >= Number(scholarship.minPercentage);

            const categoryMatch =
                categories.includes(studentCategory);

            const educationMatch =
                educationLevels.includes(studentEducation);

            const statusMatch =
                scholarship.status === "Open";

            return (
                incomeMatch &&
                percentageMatch &&
                categoryMatch &&
                educationMatch &&
                statusMatch
            );
        });

        res.json({
            success: true,
            count: matches.length,
            scholarships: matches,
            lastUpdated: database.lastUpdated
        });

    } catch (error) {
        console.error("Matching error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to find scholarships."
        });
    }
});

// Manually update scholarship database
app.post("/api/update", (req, res) => {
    const database = updateScholarshipStatus();

    res.json({
        success: true,
        message: "Scholarship database checked.",
        lastUpdated: database.lastUpdated
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