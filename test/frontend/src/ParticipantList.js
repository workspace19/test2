import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ParticipantList() {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/api/participants").then((res) => {
      setParticipants(res.data);
    });
  }, []);

  return (
    <div>
      <h2>Participants</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Name</th>
            <th>Team</th>
            <th>Email</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.id}>
              <td>{p.roll_number}</td>
              <td>{p.name}</td>
              <td>{p.team_name}</td>
              <td>{p.email}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
