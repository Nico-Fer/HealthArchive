import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './pages/App/App';

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Element with id 'root' not found");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

