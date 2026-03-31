import { Upload, FileSpreadsheet } from "lucide-react";
import { useRef } from "react";

interface FileUploaderProps {
  onFileLoad: (data: ArrayBuffer, fileName: string) => void;
  fileName: string | null;
}

export function FileUploader({ onFileLoad, fileName }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as ArrayBuffer;
      onFileLoad(data, file.name);
    };
    reader.readAsArrayBuffer(file);
  };

  if (fileName) {
    return (
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-secondary transition-colors text-sm"
      >
        <FileSpreadsheet className="w-4 h-4 text-success" />
        <span className="font-medium text-foreground">{fileName}</span>
        <span className="text-muted-foreground">— Changer</span>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-2xl bg-card hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}>
      <Upload className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="font-semibold text-lg text-foreground">Charger le fichier Excel de stock</p>
      <p className="text-sm text-muted-foreground mt-1">Glissez ou cliquez pour sélectionner (.xlsx)</p>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
    </div>
  );
}
