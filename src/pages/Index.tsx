import { useState, useCallback } from "react";
import { RoleSelector } from "@/components/RoleSelector";
import { FileUploader } from "@/components/FileUploader";
import { StockTable } from "@/components/StockTable";
import { parseStockExcel, updateExcelCell, exportWorkbook, type MotorEntry, type ParsedStock } from "@/lib/excelParser";
import { LogOut, Zap } from "lucide-react";

export default function Index() {
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStock | null>(null);

  const handleFileLoad = useCallback((data: ArrayBuffer, name: string) => {
    try {
      const result = parseStockExcel(data);
      setParsedData(result);
      setFileName(name);
    } catch (err) {
      console.error("Erreur lors du parsing:", err);
    }
  }, []);

  const handleUpdateQuantity = useCallback((id: string, newQty: string) => {
    if (!parsedData) return;
    const motor = parsedData.motors.find((m) => m.id === id);
    if (!motor) return;

    updateExcelCell(parsedData.workbook, motor.rawRow, motor.rawCol, newQty);

    const updatedMotors = parsedData.motors.map((m) =>
      m.id === id ? { ...m, quantity: newQty } : m
    );
    setParsedData({ ...parsedData, motors: updatedMotors });
  }, [parsedData]);

  const handleExport = useCallback(() => {
    if (!parsedData) return;
    const buffer = exportWorkbook(parsedData.workbook);
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "Stock_Moteur.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedData, fileName]);

  if (!role) {
    return <RoleSelector role={role} onSelect={setRole} />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Stock Moteurs</h1>
              <p className="text-xs text-muted-foreground capitalize">
                Mode {role === "admin" ? "Administrateur" : "Consultation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {parsedData && <FileUploader onFileLoad={handleFileLoad} fileName={fileName} />}
            <button
              onClick={() => { setRole(null); setParsedData(null); setFileName(null); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Changer de rôle
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {!parsedData ? (
          <FileUploader onFileLoad={handleFileLoad} fileName={null} />
        ) : (
          <StockTable
            motors={parsedData.motors}
            role={role}
            onUpdateQuantity={handleUpdateQuantity}
            onExport={handleExport}
          />
        )}
      </main>
    </div>
  );
}
