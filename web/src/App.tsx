import { Routes, Route } from "react-router-dom";
import { ParlayProvider } from "./context/ParlayContext";
import { FuturesParlayProvider } from "./context/FuturesParlayContext";
import Dashboard from "./pages/Dashboard";
import Futures from "./pages/Futures";

export default function App() {
  return (
    <>
      <div className="app-bg" />
      <div className="app-bg-glow" />
      <Routes>
        <Route
          path="/"
          element={
            <FuturesParlayProvider>
              <Futures />
            </FuturesParlayProvider>
          }
        />
        <Route
          path="/tonight"
          element={
            <ParlayProvider>
              <Dashboard />
            </ParlayProvider>
          }
        />
      </Routes>
    </>
  );
}
