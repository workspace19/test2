import React from "react";
import QRScanner from "./components/QRScanner";
import ParticipantList from "./components/ParticipantList";

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