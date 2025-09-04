import React, { useState } from "react";
import QRScanner from "./QRScanner";
import ParticipantList from "./ParticipantList";
import axios from "axios";

function App() {
  const [role, setRole] = useState("participant");
  const [lookupRoll, setLookupRoll] = useState("");
  const [participant, setParticipant] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [assistMessage, setAssistMessage] = useState("");
  const [assistTable, setAssistTable] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState("");

  const fetchAnnouncements = async () => {
    const res = await axios.get("/api/announcements");
    setAnnouncements(res.data);
  };

  const lookupParticipant = async () => {
    try {
      const res = await axios.get(
        `/api/participant/${encodeURIComponent(lookupRoll)}`
      );
      setParticipant(res.data);
    } catch (e) {
      setParticipant(null);
      alert("Participant not found");
    }
  };

  const submitAssistance = async () => {
    await axios.post("/api/assistance", {
      roll_number: participant?.roll_number || lookupRoll || undefined,
      table_number: assistTable || undefined,
      message: assistMessage || undefined,
    });
    setAssistMessage("");
    setAssistTable("");
    alert("Assistance request submitted");
  };

  const uploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Choose a CSV file first");
    const form = new FormData();
    form.append("file", csvFile);
    const res = await axios.post("/api/upload-csv", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    alert(`CSV processed. Inserted: ${res.data.inserted}, Updated: ${res.data.updated}`);
  };

  const createAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    await axios.post("/api/announcements", {
      message: newAnnouncement.trim(),
    });
    setNewAnnouncement("");
    await fetchAnnouncements();
  };

  return (
    <div>
      <h1>Hackathon Management System</h1>
      <div style={{ marginBottom: 16 }}>
        <label>
          Role:
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="participant">Participant</option>
            <option value="organizer">Organizer</option>
          </select>
        </label>
      </div>

      {role === "participant" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2>Find your team</h2>
            <input
              placeholder="Enter your roll number"
              value={lookupRoll}
              onChange={(e) => setLookupRoll(e.target.value)}
            />
            <button onClick={lookupParticipant}>Lookup</button>
            {participant && (
              <div style={{ marginTop: 8 }}>
                <div>Name: {participant.name}</div>
                <div>Team: {participant.team_name}</div>
                <div>Email: {participant.email}</div>
                <div>Status: {participant.status}</div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2>Announcements</h2>
            <button onClick={fetchAnnouncements}>Refresh</button>
            <ul>
              {announcements.map((a) => (
                <li key={a.id}>{a.message}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2>Request Assistance</h2>
            <input
              placeholder="Table number (optional)"
              value={assistTable}
              onChange={(e) => setAssistTable(e.target.value)}
            />
            <br />
            <textarea
              placeholder="Describe the issue"
              value={assistMessage}
              onChange={(e) => setAssistMessage(e.target.value)}
            />
            <br />
            <button onClick={submitAssistance}>Submit Request</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2>QR Attendance</h2>
            <QRScanner />
          </div>
        </div>
      )}

      {role === "organizer" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2>Participants</h2>
            <ParticipantList />
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2>Upload Participants (CSV)</h2>
            <form onSubmit={uploadCsv}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <button type="submit">Upload</button>
            </form>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2>Announcements</h2>
            <div>
              <input
                placeholder="New announcement"
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
              />
              <button onClick={createAnnouncement}>Publish</button>
            </div>
            <button onClick={fetchAnnouncements}>Refresh</button>
            <ul>
              {announcements.map((a) => (
                <li key={a.id}>{a.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;