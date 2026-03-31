-- Fix stock_file_history INSERT policy to require authentication
DROP POLICY IF EXISTS "Anyone can insert file history" ON public.stock_file_history;
CREATE POLICY "Authenticated users can insert file history"
ON public.stock_file_history FOR INSERT TO authenticated
WITH CHECK (true);