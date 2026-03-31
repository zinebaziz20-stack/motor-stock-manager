import { useState, useMemo } from "react";
import { MotorEntry, extractKw } from "@/lib/excelParser";
import { Download, Pencil, Check, X, Gauge, Layers, Zap } from "lucide-react";

interface StockTableProps {
  motors: MotorEntry[];
  role: "admin" | "user";
  onUpdateQuantity: (id: string, newQty: string) => void;
  onExport: () => void;
}

const SPEED_OPTIONS = [
  { value: 0, label: "Toutes" },
  { value: 3000, label: "3000" },
  { value: 1500, label: "1500" },
  { value: 1000, label: "1000" },
  { value: 750, label: "750" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "fonte", label: "Fonte" },
  { value: "aluminium", label: "Aluminium" },
];

function getSpeedClass(speed: number) {
  switch (speed) {
    case 3000: return "speed-3000";
    case 1500: return "speed-1500";
    case 1000: return "speed-1000";
    case 750: return "speed-750";
    default: return "";
  }
}

export function StockTable({ motors, role, onUpdateQuantity, onExport }: StockTableProps) {
  const [speedFilter, setSpeedFilter] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [kwFilter, setKwFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Extract unique puissance values sorted by kW
  const puissanceOptions = useMemo(() => {
    const unique = [...new Set(motors.map((m) => m.puissance))];
    unique.sort((a, b) => extractKw(a) - extractKw(b));
    return unique;
  }, [motors]);

  const filtered = motors.filter((m) => {
    if (speedFilter && m.speed !== speedFilter) return false;
    if (typeFilter && m.type !== typeFilter) return false;
    if (kwFilter && m.puissance !== kwFilter) return false;
    return true;
  });

  const startEdit = (m: MotorEntry) => {
    setEditingId(m.id);
    setEditValue(m.quantity);
  };

  const confirmEdit = (id: string) => {
    onUpdateQuantity(id, editValue);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  return (
    <div className="space-y-6">
      {/* 3 Filter Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vitesse */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gauge className="w-4 h-4 text-primary" />
            Vitesse (tr/min)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSpeedFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  speedFilter === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layers className="w-4 h-4 text-accent" />
            Type de moteur
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === opt.value
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Puissance */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Zap className="w-4 h-4 text-success" />
            Puissance (kW)
          </div>
          <select
            value={kwFilter}
            onChange={(e) => setKwFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Toutes les puissances</option>
            {puissanceOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count + export */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </p>
        {role === "admin" && (
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success text-success-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Download className="w-4 h-4" />
            Exporter Excel
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vitesse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Puissance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fournisseur</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quantité</th>
                {role === "admin" && (
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => {
                const isZero = m.quantity === "0" || m.quantity === "";
                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm capitalize">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                        m.type === "fonte" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`speed-badge ${getSpeedClass(m.speed)}`}>
                        {m.speed} tr/min
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{m.puissance}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{m.supplier}</td>
                    <td className="px-4 py-3">
                      {editingId === m.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmEdit(m.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-20 mx-auto block text-center px-2 py-1 rounded-lg border border-primary bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      ) : (
                        <span className={`stock-cell block ${isZero ? "stock-zero" : "stock-available"}`}>
                          {m.quantity || "—"}
                        </span>
                      )}
                    </td>
                    {role === "admin" && (
                      <td className="px-4 py-3 text-center">
                        {editingId === m.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => confirmEdit(m.id)} className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun moteur trouvé avec ces critères
          </div>
        )}
      </div>
    </div>
  );
}
