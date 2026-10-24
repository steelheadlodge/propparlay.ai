import { useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Onboarding, { useOnboarding } from "./components/Onboarding";
import { ParlayProvider } from "./context/ParlayContext";
import { FuturesParlayProvider, useFuturesParlay } from "./context/FuturesParlayContext";
import { pathFromIncomingUrl } from "./lib/deepLink";
import { decodeParlay } from "./lib/shareParlay";
import Dashboard from "./pages/Dashboard";
import Futures from "./pages/Futures";
import Matrix from "./pages/Matrix";

function SharedParlayLoader() {
  const { hydrate } = useFuturesParlay();
  const [params] = useSearchParams();
  const p = params.get("p");
  const loaded = useRef<string | null>(null);

  useEffect(() => {
    if (!p || loaded.current === p) return;
    const legs = decodeParlay(p);
    if (!legs) return;
    loaded.current = p;
    hydrate(legs);
  }, [p, hydrate]);

  return null;
}

function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove = () => {};
    const open = (raw: string) => {
      const dest = pathFromIncomingUrl(raw);
      if (dest) navigate(dest, { replace: true });
    };
    void CapApp.addListener("appUrlOpen", (event) => open(event.url)).then((handle) => {
      remove = () => void handle.remove();
    });
    void CapApp.getLaunchUrl().then((launch) => {
      if (launch?.url) open(launch.url);
    });
    return () => remove();
  }, [navigate]);

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
      <DeepLinkListener />
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
