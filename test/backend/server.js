const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const { Readable } = require("stream");

// Multer setup (memory storage for CSV uploads)
const upload = multer({ storage: multer.memoryStorage() });

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

  // Announcements table
  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hackathon_id INTEGER,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(hackathon_id) REFERENCES hackathons(id)
  )`);

  // Assistance requests table
  db.run(`CREATE TABLE IF NOT EXISTS assistance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER,
    team_name TEXT,
    table_number TEXT,
    message TEXT,
    status TEXT DEFAULT 'Open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(participant_id) REFERENCES participants(id)
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

// Lookup participant by roll number
app.get("/api/participant/:roll_number", (req, res) => {
  const roll = req.params.roll_number;
  db.get(
    `SELECT id, name, roll_number, team_name, email, hackathon_id, status FROM participants WHERE roll_number = ?`,
    [roll],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Participant not found" });
      res.json(row);
    }
  );
});

// CSV upload for participants (organizer)
// Accepts columns: name, roll_number, team_name, email, hackathon_id
app.post("/api/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "CSV file is required" });

  const results = [];
  const errors = [];

  const readable = Readable.from(req.file.buffer);
  readable
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", () => {
      let processed = 0;
      if (results.length === 0) return res.json({ inserted: 0, updated: 0 });

      let inserted = 0;
      let updated = 0;

      results.forEach((row) => {
        const name = row.name || row.Name;
        const roll = row.roll_number || row.Roll || row.RollNumber || row.Roll_Number;
        const team = row.team_name || row.Team || row.TeamName;
        const email = row.email || row.Email;
        const hackathonId = row.hackathon_id || row.HackathonId || row.Hackathon || null;

        if (!roll) {
          errors.push({ row, error: "Missing roll_number" });
          processed++;
          if (processed === results.length) {
            res.json({ inserted, updated, errors });
          }
          return;
        }

        // Try UPSERT using ON CONFLICT
        db.run(
          `INSERT INTO participants (name, roll_number, team_name, email, hackathon_id)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(roll_number) DO UPDATE SET
             name=excluded.name,
             team_name=excluded.team_name,
             email=excluded.email,
             hackathon_id=excluded.hackathon_id`,
          [name, roll, team, email, hackathonId],
          function (err) {
            if (err) {
              errors.push({ row, error: err.message });
            } else {
              if (this.changes === 1 && this.lastID) {
                inserted++;
              } else {
                // sqlite3 does not expose updated count here; do a best-effort increment
                updated++;
              }
            }
            processed++;
            if (processed === results.length) {
              res.json({ inserted, updated, errors });
            }
          }
        );
      });
    })
    .on("error", (e) => {
      res.status(400).json({ error: e.message });
    });
});

// Announcements: create
app.post("/api/announcements", (req, res) => {
  const { hackathon_id, message } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });
  db.run(
    `INSERT INTO announcements (hackathon_id, message) VALUES (?, ?)`,
    [hackathon_id || null, message],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Announcements: list (optionally filter by hackathon_id)
app.get("/api/announcements", (req, res) => {
  const { hackathon_id } = req.query;
  const sql = hackathon_id
    ? `SELECT * FROM announcements WHERE hackathon_id = ? ORDER BY datetime(created_at) DESC`
    : `SELECT * FROM announcements ORDER BY datetime(created_at) DESC`;
  const params = hackathon_id ? [hackathon_id] : [];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Assistance: create request (participant)
app.post("/api/assistance", (req, res) => {
  const { roll_number, team_name, table_number, message } = req.body;
  if (!roll_number && !team_name)
    return res.status(400).json({ error: "roll_number or team_name is required" });

  const insertWithParticipant = (participant) => {
    const resolvedTeam = team_name || (participant ? participant.team_name : null);
    const participantId = participant ? participant.id : null;

    db.run(
      `INSERT INTO assistance_requests (participant_id, team_name, table_number, message) VALUES (?, ?, ?, ?)`,
      [participantId, resolvedTeam || null, table_number || null, message || null],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  };

  if (roll_number) {
    db.get(
      `SELECT id, team_name FROM participants WHERE roll_number = ?`,
      [roll_number],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        insertWithParticipant(row || null);
      }
    );
  } else {
    insertWithParticipant(null);
  }
});

// Assistance: list (organizer). Optional filters: status, hackathon_id
app.get("/api/assistance", (req, res) => {
  const { status, hackathon_id } = req.query;
  let sql = `SELECT ar.id, ar.team_name, ar.table_number, ar.message, ar.status, ar.created_at,
                    p.name as participant_name, p.roll_number, p.team_name as participant_team,
                    p.email, p.hackathon_id
             FROM assistance_requests ar
             LEFT JOIN participants p ON p.id = ar.participant_id`;
  const params = [];
  const where = [];
  if (status) {
    where.push("ar.status = ?");
    params.push(status);
  }
  if (hackathon_id) {
    where.push("p.hackathon_id = ?");
    params.push(hackathon_id);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY datetime(ar.created_at) DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Assistance: update status (organizer)
app.patch("/api/assistance/:id", (req, res) => {
  const { status } = req.body;
  const allowed = new Set(["Open", "In Progress", "Resolved"]);
  if (!allowed.has(status)) return res.status(400).json({ error: "invalid status" });

  db.run(
    `UPDATE assistance_requests SET status = ? WHERE id = ?`,
    [status, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Health and root routes
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.type("text/plain").send(
    "Hackathon API is running.\n" +
      "Available endpoints:\n" +
      "GET  /health\n" +
      "GET  /api/participants\n" +
      "POST /api/participants\n" +
      "POST /api/attendance/:roll_number\n" +
      "GET  /api/participant/:roll_number\n" +
      "POST /api/upload-csv\n" +
      "GET  /api/announcements\n" +
      "POST /api/announcements\n" +
      "GET  /api/assistance\n" +
      "POST /api/assistance\n" +
      "PATCH /api/assistance/:id\n"
  );
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));