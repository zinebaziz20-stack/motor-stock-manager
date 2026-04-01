import { useState, useCallback, useEffect } from "react";
import { FileUploader } from "@/components/FileUploader";
import { FileHistory } from "@/components/FileHistory";
import { StockTable } from "@/components/StockTable";
import { UserManagement } from "@/components/UserManagement";
import AdminLoginModal from "@/components/AdminLoginModal";
import {
  parseStockExcel,
  updateExcelCell,
  exportWorkbook,
  encodeCellRef,
  type ParsedStock,
} from "@/lib/excelParser";
import {
  uploadStockFile,
  uploadUpdatedFile,
  getFileHistory,
  downloadStockFile,
  type StockFileRecord,
} from "@/lib/stockStorage";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Zap, Loader2, UserPlus, Settings } from "lucide-react";
import { toast } from "sonner";

export default function Index() {
  const [role, setRole] = useState<"admin" | "user">("user");
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStock | null>(null);
  const [cellChanges] = useState<Map<string, string>>(new Map());
  const [history, setHistory] = useState<StockFileRecord[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [showHistory, setShowHistory] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Erreur session:", error);
      }

      if (session?.user) {
        setRole("admin");
        setAdminEmail(session.user.email ?? null);
      } else {
        setRole("user");
        setAdminEmail(null);
      }

      setAuthChecking(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setRole("admin");
        setAdminEmail(session.user.email ?? null);
      } else {
        setRole("user");
        setAdminEmail(null);
        setShowUserMgmt(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadLatestFile();
  }, []);

  const loadLatestFile = async () => {
    setLoading(true);
    try {
      const historyData = await getFileHistory();
      setHistory(historyData);

      if (historyData.length > 0) {
        const latest = historyData[0];
        const data = await downloadStockFile(latest.file_path);
        const result = parseStockExcel(data);
        setParsedData(result);
        setFileName(latest.file_name);
        setCurrentFilePath(latest.file_path);
      } else {
        setParsedData(null);
        setFileName(null);
        setCurrentFilePath(null);
      }
    } catch (err) {
      console.error("Erreur chargement:", err);
      toast.error("Erreur lors du chargement du fichier");
    } finally {
      setLoading(false);
    }
  };

  const handleFileLoad = useCallback(
    async (data: ArrayBuffer, name: string) => {
      try {
        const result = parseStockExcel(data);
        setParsedData(result);
        setFileName(name);
        cellChanges.clear();

        if (role === "admin") {
          const file = new File([data], name, {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          const record = await uploadStockFile(file);
          setCurrentFilePath(record.file_path);

          const historyData = await getFileHistory();
          setHistory(historyData);

          toast.success("Fichier uploadé et disponible pour les utilisateurs");
        }
      } catch (err) {
        console.error("Erreur lors du chargement:", err);
        toast.error("Erreur lors du chargement du fichier");
      }
    },
    [role, cellChanges]
  );

  const handleSelectHistoryFile = useCallback(
    async (record: StockFileRecord) => {
      setLoading(true);
      try {
        const data = await downloadStockFile(record.file_path);
        const result = parseStockExcel(data);
        setParsedData(result);
        setFileName(record.file_name);
        setCurrentFilePath(record.file_path);
        cellChanges.clear();
        toast.success(`Fichier "${record.file_name}" chargé`);
      } catch (err) {
        console.error("Erreur:", err);
        toast.error("Erreur lors du chargement du fichier");
      } finally {
        setLoading(false);
      }
    },
    [cellChanges]
  );

  const handleUpdateQuantity = useCallback(
    (id: string, newQty: string) => {
      if (!parsedData) return;
      const motor = parsedData.motors.find((m) => m.id === id);
      if (!motor) return;

      const cellRef = encodeCellRef(motor.rawRow, motor.rawCol);
      cellChanges.set(cellRef, newQty);

      updateExcelCell(parsedData.workbook, motor.rawRow, motor.rawCol, newQty);

      const updatedMotors = parsedData.motors.map((m) =>
        m.id === id ? { ...m, quantity: newQty } : m
      );

      setParsedData({ ...parsedData, motors: updatedMotors });
    },
    [parsedData, cellChanges]
  );

  const handleExport = useCallback(async () => {
    if (!parsedData) return;

    try {
      const buffer = await exportWorkbook(parsedData.originalData, cellChanges);

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "Stock_Moteur.xlsx";
      a.click();
      URL.revokeObjectURL(url);

      if (cellChanges.size > 0) {
        const record = await uploadUpdatedFile(fileName || "Stock_Moteur.xlsx", buffer);
        setCurrentFilePath(record.file_path);

        const result = parseStockExcel(buffer);
        setParsedData(result);

        cellChanges.clear();

        const historyData = await getFileHistory();
        setHistory(historyData);

        toast.success("Fichier exporté et mis à jour dans le cloud");
      } else {
        toast.success("Fichier exporté");
      }
    } catch (err) {
      console.error("Erreur export:", err);
      toast.error("Erreur lors de l'export");
    }
  }, [parsedData, fileName, cellChanges]);

  const handleAdminLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Erreur lors de la déconnexion");
      return;
    }

    setRole("user");
    setAdminEmail(null);
    setShowUserMgmt(false);
    toast.success("Déconnexion administrateur réussie");
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Stock Moteurs
              </h1>
              <p className="text-xs text-muted-foreground">
                {role === "admin"
                  ? `Administrateur${adminEmail ? ` — ${adminEmail}` : ""}`
                  : "Consultation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {role === "admin" && parsedData && (
              <FileUploader onFileLoad={handleFileLoad} fileName={fileName} />
            )}

            

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showHistory
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Historique
            </button>

            {role === "admin" ? (
              <button
                onClick={handleAdminLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Déconnexion</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden md:inline">Paramètres</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Chargement du fichier...</span>
          </div>
        )}

        {showHistory && (
          <FileHistory
            history={history}
            currentFilePath={currentFilePath}
            onSelect={handleSelectHistoryFile}
          />
        )}

        {!loading && !parsedData && role === "admin" && (
          <FileUploader onFileLoad={handleFileLoad} fileName={null} />
        )}

        {!loading && !parsedData && role === "user" && (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Aucun fichier de stock disponible.</p>
            <p className="text-sm text-muted-foreground mt-1">
              L'administrateur n'a pas encore chargé de fichier.
            </p>
          </div>
        )}

        {!loading && parsedData && (
          <StockTable
            motors={parsedData.motors}
            role={role}
            onUpdateQuantity={handleUpdateQuantity}
            onExport={handleExport}
          />
        )}
      </main>

      {role === "admin" && (
        <UserManagement open={showUserMgmt} onClose={() => setShowUserMgmt(false)} />
      )}

      <AdminLoginModal
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
      />
    </div>
  );
}