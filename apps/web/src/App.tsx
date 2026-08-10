import { Link, NavLink, Route, Routes } from "react-router-dom";
import { ClipboardList, Info, Plus, ShieldCheck } from "lucide-react";
import AuthGate from "./components/AuthGate";
import Dashboard from "./pages/Dashboard";
import NewScan from "./pages/NewScan";
import ScanDetail from "./pages/ScanDetail";

export default function App() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-canvas text-ink">
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            Interactive Preview Mode — Exploring WCAG accessibility scans and AI fix generation with sample data.
          </span>
        </div>
        <header className="border-b border-hairline bg-surface">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink">
              <ShieldCheck className="h-5 w-5 text-signal" aria-hidden="true" />
              A11yFix
            </Link>
            <nav className="flex items-center gap-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-ink text-white" : "text-slate hover:bg-hairline/50 hover:text-ink"
                  }`
                }
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </NavLink>
              <NavLink
                to="/scan/new"
                className={({ isActive }) =>
                  `inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-white transition-colors ${
                    isActive ? "bg-teal-800" : "bg-signal hover:bg-teal-800"
                  }`
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Scan
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan/new" element={<NewScan />} />
            <Route path="/scans/:scanId" element={<ScanDetail />} />
          </Routes>
        </main>
      </div>
    </AuthGate>
  );
}
