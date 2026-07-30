import "./storageShim.js";
import React from "react";
import ReactDOM from "react-dom/client";
import EmirateFulfilApp from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EmirateFulfilApp />
  </React.StrictMode>
);
