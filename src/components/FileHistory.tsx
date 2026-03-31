import { StockFileRecord } from "@/lib/stockStorage";
import { History, FileSpreadsheet, Clock } from "lucide-react";

interface FileHistoryProps {
  history: StockFileRecord[];
  currentFilePath: string | null;
  onSelect: (record: StockFileRecord) => void;
}

export function FileHistory({ history, currentFilePath, onSelect }: FileHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun fichier dans l'historique</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Historique des fichiers</h3>
        <span className="ml-auto text-xs text-muted-foreground">{history.length} fichier{history.length > 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-border max-h-64 overflow-y-auto">
        {history.map((record) => {
          const isCurrent = record.file_path === currentFilePath;
          const date = new Date(record.created_at);
          const formattedDate = date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
          const sizeKb = record.file_size ? Math.round(record.file_size / 1024) : null;

          return (
            <button
              key={record.id}
              onClick={() => onSelect(record)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                isCurrent ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <FileSpreadsheet className={`w-5 h-5 shrink-0 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCurrent ? "text-primary" : "text-foreground"}`}>
                  {record.file_name}
                  {isCurrent && <span className="ml-2 text-xs text-primary">(actuel)</span>}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{formattedDate}</span>
                  {sizeKb && <span>· {sizeKb} Ko</span>}
                  <span>· {record.uploaded_by}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
