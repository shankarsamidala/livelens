import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

// Set platform attribute synchronously — before React renders — so CSS selectors
// like html[data-platform="win32"] work immediately without a flash on first paint.
document.documentElement.setAttribute(
  'data-platform',
  window.electronAPI?.platform ?? process?.platform ?? ''
);

// Force dark theme — Natively uses full black premium UI exclusively.
document.documentElement.setAttribute('data-theme', 'dark');

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
