import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'bulma/css/bulma.min.css';
import './main.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element to mount the React app.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
