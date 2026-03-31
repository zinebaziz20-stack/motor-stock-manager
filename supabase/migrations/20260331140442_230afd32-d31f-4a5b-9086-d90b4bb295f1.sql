
-- Create storage bucket for stock files
INSERT INTO storage.buckets (id, name, public) VALUES ('stock-files', 'stock-files', true);

-- Allow anyone to read stock files (users need to download)
CREATE POLICY "Stock files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'stock-files');

-- Only allow uploads (no auth needed since we use role-based UI, not auth)
CREATE POLICY "Anyone can upload stock files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stock-files');

CREATE POLICY "Anyone can update stock files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stock-files');

CREATE POLICY "Anyone can delete stock files"
ON storage.objects FOR DELETE
USING (bucket_id = 'stock-files');

-- Create table to track file upload history
CREATE TABLE public.stock_file_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_file_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read history
CREATE POLICY "Anyone can view file history"
ON public.stock_file_history FOR SELECT
USING (true);

-- Anyone can insert (admin role in UI)
CREATE POLICY "Anyone can insert file history"
ON public.stock_file_history FOR INSERT
WITH CHECK (true);
