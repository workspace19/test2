import React, { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import axios from "axios";

export default function QRScanner() {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });

    scanner.render(async (decodedText) => {
      alert(`Scanned: ${decodedText}`);
      try {
        await axios.post(`http://localhost:5000/api/attendance/${decodedText}`);
        alert("Attendance marked ✅");
      } catch (err) {
        alert("Error marking attendance");
      }
    });

    return () => scanner.clear();
  }, []);

  return <div id="reader" style={{ width: "300px" }}></div>;
}