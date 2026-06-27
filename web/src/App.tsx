import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Onboarding, { useOnboarding } from "./components/Onboarding";
import { ParlayProvider } from "./context/ParlayContext";
import { FuturesParlayProvider, useFuturesParlay } from "./context/FuturesParlayContext";
import { decodeParlay } from "./lib/shareParlay";
import Dashboard from "./pages/Dashboard";
import Futures from "./pages/Futures";
import Matrix from "./pages/Matrix";

function SharedParlayLoader() {
  const { hydrate } = useFuturesParlay();
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    const p = new URLSearchParams(window.location.search).get("p");
    if (!p) return;
    const legs = decodeParlay(p);
    if (legs) {
      loaded.current = true;
      hydrate(legs);
    }
  }, [hydrate]);

  return null;
}

function HomeRedirect() {
  const location = useLocation();
  return <Navigate to={`/grid${location.search}`} replace />;
}

function AppShell() {
  const { show, dismiss } = useOnboarding();

  return (
    <>
      <SharedParlayLoader />
      <Onboarding open={show} onDone={dismiss} />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/futures" element={<Futures />} />
        <Route path="/grid" element={<Matrix />} />
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

export default function App() {
  return (
    <>
      <div className="app-bg" />
      <div className="app-bg-glow" />
      <FuturesParlayProvider>
        <AppShell />
      </FuturesParlayProvider>
    </>
  );
}
