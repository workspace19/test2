import React from "react";
import QRScanner from "./QRScanner";
import ParticipantList from "./ParticipantList";

function App() {
  return (
    <div>
      <h1>Hackathon Management System</h1>
      <QRScanner />
      <ParticipantList />
    </div>
  );
}

export default App;