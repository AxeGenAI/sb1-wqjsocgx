/*
  # Allow anonymous access to client deliverables for development

  1. Security Changes
    - Drop existing authenticated-only policies for client_deliverables table
    - Create new policies allowing public (anonymous) access for development
    - Drop existing authenticated-only policies for client-deliverables storage bucket
    - Create new policies allowing public (anonymous) access to storage bucket

  Note: These changes are for DEVELOPMENT ONLY and should be reverted before production deployment
*/

-- Drop existing RLS policies for client_deliverables table
DROP POLICY IF EXISTS "Allow authenticated users to view all client deliverables" ON client_deliverables;
DROP POLICY IF EXISTS "Allow authenticated users to create client deliverables" ON client_deliverables;
DROP POLICY IF EXISTS "Allow authenticated users to update client deliverables" ON client_deliverables;
DROP POLICY IF EXISTS "Allow authenticated users to delete client deliverables" ON client_deliverables;

-- Create new RLS policies for client_deliverables table (allowing public access for development)
CREATE POLICY "Allow public access to view client deliverables (DEV)"
  ON client_deliverables
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public access to create client deliverables (DEV)"
  ON client_deliverables
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public access to update client deliverables (DEV)"
  ON client_deliverables
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public access to delete client deliverables (DEV)"
  ON client_deliverables
  FOR DELETE
  TO public
  USING (true);

-- Drop existing storage policies for client-deliverables bucket
DROP POLICY IF EXISTS "Allow authenticated users to view client deliverable files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload client deliverable files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update client deliverable files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete client deliverable files" ON storage.objects;

-- Create new storage policies for client-deliverables bucket (allowing public access for development)
CREATE POLICY "Allow public access to view client deliverable files (DEV)"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'client-deliverables');

CREATE POLICY "Allow public access to upload client deliverable files (DEV)"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'client-deliverables');

CREATE POLICY "Allow public access to update client deliverable files (DEV)"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'client-deliverables');

CREATE POLICY "Allow public access to delete client deliverable files (DEV)"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'client-deliverables');