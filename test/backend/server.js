const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Connect DB
const db = new sqlite3.Database("./db.sqlite");

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS hackathons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    rules TEXT,
    prizes TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    roll_number TEXT UNIQUE,
    team_name TEXT,
    email TEXT,
    hackathon_id INTEGER,
    status TEXT DEFAULT 'Absent',
    FOREIGN KEY(hackathon_id) REFERENCES hackathons(id)
  )`);
});

// Add participant manually
app.post("/api/participants", (req, res) => {
  const { name, roll_number, team_name, email, hackathon_id } = req.body;
  db.run(
    `INSERT INTO participants (name, roll_number, team_name, email, hackathon_id) VALUES (?, ?, ?, ?, ?)`,
    [name, roll_number, team_name, email, hackathon_id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get all participants
app.get("/api/participants", (req, res) => {
  db.all("SELECT * FROM participants", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Mark attendance
app.post("/api/attendance/:roll_number", (req, res) => {
  const roll = req.params.roll_number;
  db.run(
    `UPDATE participants SET status = 'Present' WHERE roll_number = ?`,
    [roll],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));