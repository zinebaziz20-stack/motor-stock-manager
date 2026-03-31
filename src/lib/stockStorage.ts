import { supabase } from "@/integrations/supabase/client";

export interface StockFileRecord {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export async function uploadStockFile(file: File): Promise<StockFileRecord> {
  const timestamp = Date.now();
  const filePath = `stock_${timestamp}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("stock-files")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error: insertError } = await supabase
    .from("stock_file_history")
    .insert({
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: "admin",
    })
    .select()
    .single();

  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
  return data as StockFileRecord;
}

export async function uploadUpdatedFile(originalName: string, buffer: ArrayBuffer): Promise<StockFileRecord> {
  const timestamp = Date.now();
  const filePath = `stock_${timestamp}_${originalName}`;
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const { error: uploadError } = await supabase.storage
    .from("stock-files")
    .upload(filePath, blob, { upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error: insertError } = await supabase
    .from("stock_file_history")
    .insert({
      file_name: originalName,
      file_path: filePath,
      file_size: buffer.byteLength,
      uploaded_by: "admin",
    })
    .select()
    .single();

  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
  return data as StockFileRecord;
}

export async function getFileHistory(): Promise<StockFileRecord[]> {
  const { data, error } = await supabase
    .from("stock_file_history")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Fetch history failed: ${error.message}`);
  return (data || []) as StockFileRecord[];
}

export async function downloadStockFile(filePath: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from("stock-files")
    .download(filePath);

  if (error) throw new Error(`Download failed: ${error.message}`);
  return data.arrayBuffer();
}

export async function getLatestFile(): Promise<{ record: StockFileRecord; data: ArrayBuffer } | null> {
  const history = await getFileHistory();
  if (history.length === 0) return null;
  const latest = history[0];
  const data = await downloadStockFile(latest.file_path);
  return { record: latest, data };
}
