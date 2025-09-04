import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Configure axios baseURL for Codespaces and local dev
// If running in Codespaces, window.location.host looks like <name>-3000.app.github.dev
// Replace the 3000 port with 5000 for the backend
try {
  const { protocol, host } = window.location;
  const backendHost = host.replace('-3000.', '-5000.');
  if (backendHost !== host) {
    axios.defaults.baseURL = `${protocol}//${backendHost}`;
  } else {
    axios.defaults.baseURL = 'http://localhost:5000';
  }
} catch (_) {
  axios.defaults.baseURL = 'http://localhost:5000';
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
