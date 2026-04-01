import { useState, useMemo } from "react";
import { MotorEntry, extractKw, CATEGORY_LABELS, type MotorCategory } from "@/lib/excelParser";
import { Download, Pencil, Check, X, Gauge, Layers, Zap, Search, RotateCcw } from "lucide-react";

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

function getSpeedClass(speed: number) {
  switch (speed) {
    case 3000:
      return "speed-3000";
    case 1500:
      return "speed-1500";
    case 1000:
      return "speed-1000";
    case 750:
      return "speed-750";
    default:
      return "";
  }
}

function getCategoryColor(cat: MotorCategory) {
  switch (cat) {
    case "fonte":
      return "bg-secondary text-secondary-foreground";
    case "aluminium":
      return "bg-primary/10 text-primary";
    case "bride_dm":
      return "bg-accent/20 text-accent-foreground";
    case "bride_omt4":
      return "bg-accent/20 text-accent-foreground";
    case "extra_dm1":
      return "bg-green-100 text-green-700";
    case "extra_omt2":
      return "bg-green-100 text-green-700";
    case "reserve":
      return "bg-orange-100 text-orange-700";
    case "reparer":
      return "bg-red-100 text-red-700";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function StockTable({ motors, role, onUpdateQuantity, onExport }: StockTableProps) {
  // États de saisie
  const [speedInput, setSpeedInput] = useState(0);
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [kwInput, setKwInput] = useState("");

  // États appliqués à la recherche
  const [speedFilter, setSpeedFilter] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [kwFilter, setKwFilter] = useState("");

  const [hasSearched, setHasSearched] = useState(role === "admin");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const categories = useMemo(() => {
    return [...new Set(motors.map((m) => m.category))];
  }, [motors]);

  const puissanceOptions = useMemo(() => {
    let filtered = motors;

    if (categoryInput) {
      filtered = filtered.filter((m) => m.category === categoryInput);
    }

    if (speedInput) {
      filtered = filtered.filter((m) => m.speed === speedInput);
    }

    const unique = [
      ...new Set(
        filtered
          .filter(
            (m) =>
              typeof m.puissance === "string" &&
              m.puissance.trim() !== "" &&
              m.category !== "reserve" &&
              m.category !== "reparer"
          )
          .map((m) => m.puissance.trim())
      ),
    ];

    unique.sort((a, b) => extractKw(a) - extractKw(b));
    return unique;
  }, [motors, categoryInput, speedInput]);

  const canSearch =
    role === "admin"
      ? true
      : Boolean(categoryInput && speedInput && kwInput);

  const filtered = useMemo(() => {
    if (role === "user") {
      if (!hasSearched || !speedFilter || !categoryFilter || !kwFilter) {
        return [];
      }
    }

    return motors.filter((m) => {
      if (speedFilter && m.speed !== speedFilter) return false;
      if (categoryFilter && m.category !== categoryFilter) return false;
      if (kwFilter && m.puissance !== kwFilter) return false;
      return true;
    });
  }, [motors, role, hasSearched, speedFilter, categoryFilter, kwFilter]);

  const startEdit = (m: MotorEntry) => {
    setEditingId(m.id);
    setEditValue(m.quantity);
  };

  const confirmEdit = (id: string) => {
    onUpdateQuantity(id, editValue);
    setEditingId(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSearch = () => {
    if (role === "user" && !canSearch) return;

    setCategoryFilter(categoryInput);
    setSpeedFilter(speedInput);
    setKwFilter(kwInput);
    setHasSearched(true);
  };

  const handleReset = () => {
    setCategoryInput("");
    setSpeedInput(0);
    setKwInput("");

    setCategoryFilter("");
    setSpeedFilter(0);
    setKwFilter("");

    setHasSearched(role === "admin");
    setEditingId(null);
    setEditValue("");
  };

  // Affichage du tableau basé sur les filtres appliqués
  const showingReserve = categoryFilter === "reserve";
  const showingReparer = categoryFilter === "reparer";
  const showingBride = categoryFilter === "bride_dm" || categoryFilter === "bride_omt4";

  return (
    <div className="space-y-6">
      {/* 3 Filter Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Catégorie */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layers className="w-4 h-4 text-accent" />
            Catégorie
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setCategoryInput("");
                setKwInput("");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !categoryInput
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              Tous
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryInput(cat);
                  setKwInput("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  categoryInput === cat
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

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
                onClick={() => {
                  setSpeedInput(opt.value);
                  setKwInput("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  speedInput === opt.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-secondary"
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
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            disabled={!categoryInput || !speedInput || puissanceOptions.length === 0}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {!categoryInput || !speedInput
                ? "Choisir d'abord catégorie et vitesse"
                : puissanceOptions.length === 0
                ? "Aucune puissance disponible"
                : "Choisir une puissance"}
            </option>

            {puissanceOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Boutons de recherche */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-muted text-muted-foreground font-medium text-sm hover:bg-secondary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Réinitialiser
        </button>

        <button
          onClick={handleSearch}
          disabled={!canSearch}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" />
          Rechercher
        </button>
      </div>

      {/* Message guide user */}
      {role === "user" && !hasSearched && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Veuillez sélectionner la catégorie, la vitesse et la puissance, puis cliquer sur
          <span className="font-medium text-foreground"> Rechercher</span>.
        </div>
      )}

      {role === "user" && hasSearched && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Aucun moteur trouvé avec ces critères.
        </div>
      )}

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Catégorie
                </th>

                {!showingReparer && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {showingBride ? "Taille" : "Vitesse"}
                  </th>
                )}

                {!showingReparer && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {showingReserve ? "Produit" : "Puissance"}
                  </th>
                )}

                {showingReparer && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Description
                  </th>
                )}

                {showingReserve && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Commercial
                  </th>
                )}

                {!showingReparer && (
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {showingReserve ? "Série" : "Fournisseur"}
                  </th>
                )}

                {!showingReparer && (
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quantité
                  </th>
                )}

                {role === "admin" && !showingReparer && (
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((m) => {
                const isZero = m.quantity === "0" || m.quantity === "";
                const isReparer = m.category === "reparer";
                const isReserve = m.category === "reserve";
                const isBride = m.category === "bride_dm" || m.category === "bride_omt4";

                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(
                          m.category
                        )}`}
                      >
                        {CATEGORY_LABELS[m.category]}
                      </span>
                    </td>

                    {!isReparer && (
                      <td className="px-4 py-3">
                        {isBride ? (
                          <span className="text-sm font-medium text-foreground">{m.taille}</span>
                        ) : m.speed > 0 ? (
                          <span className={`speed-badge ${getSpeedClass(m.speed)}`}>
                            {m.speed} tr/min
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {!isReparer && (
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {isReserve ? m.produit : m.puissance}
                      </td>
                    )}

                    {isReparer && (
                      <td className="px-4 py-3 text-sm text-foreground">{m.description}</td>
                    )}

                    {isReserve && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">{m.commercial}</td>
                    )}

                    {!isReparer && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {isReserve ? m.serie || "—" : m.supplier}
                      </td>
                    )}

                    {!isReparer && (
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
                    )}

                    {role === "admin" && !isReparer && (
                      <td className="px-4 py-3 text-center">
                        {editingId === m.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => confirmEdit(m.id)}
                              className="p-1.5 rounded-lg hover:bg-success/10 text-success transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          >
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

        {role === "admin" && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun moteur trouvé avec ces critères
          </div>
        )}
      </div>
    </div>
  );
}