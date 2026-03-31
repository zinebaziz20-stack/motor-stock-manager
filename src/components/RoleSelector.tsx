import { Shield, Eye } from "lucide-react";

interface RoleSelectorProps {
  role: "admin" | "user" | null;
  onSelect: (role: "admin" | "user") => void;
}

export function RoleSelector({ role, onSelect }: RoleSelectorProps) {
  if (role) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-lg">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Stock Moteurs
          </h1>
          <p className="text-muted-foreground text-lg">
            Gestion de stock de moteurs électriques
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onSelect("admin")}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-primary hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg text-foreground">Admin</p>
              <p className="text-sm text-muted-foreground">Chercher, modifier le stock et exporter</p>
            </div>
          </button>
          <button
            onClick={() => onSelect("user")}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border bg-card hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all duration-300"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Eye className="w-8 h-8 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg text-foreground">Utilisateur</p>
              <p className="text-sm text-muted-foreground">Chercher et consulter le stock</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
