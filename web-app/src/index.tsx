import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles/bootstrap.scss';
import './styles/global.scss';


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

