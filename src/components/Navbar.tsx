import { Settings, LogOut } from "lucide-react";

interface NavbarProps {
  role: "admin" | "user";
  onOpenAdminLogin: () => void;
  onLogout: () => void;
}

export default function Navbar({ role, onOpenAdminLogin, onLogout }: NavbarProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Stock Moteurs</h1>
          <p className="text-sm text-muted-foreground">
            {role === "admin" ? "Mode administrateur" : "Mode consultation"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === "admin" ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion admin
            </button>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </button>
          )}
        </div>
      </div>
    </header>
  );
}