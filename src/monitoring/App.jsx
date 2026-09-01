import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import PanelDaya from "./pages/PanelDaya";
import Ketinggian from "./pages/Ketinggian";
import Stasiun from "./pages/KualitasAir";

function Shell({ children }) {
  const tab = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition ${
      isActive ? "bg-yellow-400 text-slate-900" : "text-slate-300 hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <a href="https://pt-adytia.com" className="font-bold text-yellow-400 whitespace-nowrap">
            PT. Adytia Putra Teknik
          </a>
          <nav className="flex gap-1">
            <NavLink to="/stasiun" className={tab}>Stasiun</NavLink>
            <NavLink to="/panel-daya" className={tab}>Panel Daya</NavLink>
            <NavLink to="/ketinggian" className={tab}>Ketinggian</NavLink>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Navigate to="/stasiun" replace />} />
          <Route path="/stasiun" element={<Stasiun />} />
          <Route path="/kualitas-air" element={<Navigate to="/stasiun" replace />} />
          <Route path="/panel-daya" element={<PanelDaya />} />
          <Route path="/ketinggian" element={<Ketinggian />} />
          <Route path="*" element={<Navigate to="/stasiun" replace />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
