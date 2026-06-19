import { Routes, Route } from "react-router-dom";
import { ParlayProvider } from "./context/ParlayContext";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <ParlayProvider>
      <div className="app-bg" />
      <div className="app-bg-glow" />
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </ParlayProvider>
  );
}
