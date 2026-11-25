import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@/hooks/auth-context";
import { ScanProvider } from "@/hooks/scan-context";
import { SidebarProvider } from "@/hooks/use-sidebar";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScanProvider>
          <SidebarProvider>
            <App />
          </SidebarProvider>
        </ScanProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
