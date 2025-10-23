/*
  # Create client deliverables table and security policies

  1. New Tables
    - `client_deliverables`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `milestone_name` (text, milestone identifier)
      - `title` (text, deliverable title)
      - `description` (text, optional description)
      - `document_path` (text, unique storage path)
      - `file_name` (text, original filename)
      - `file_size` (bigint, file size in bytes)
      - `file_type` (text, MIME type)
      - `version` (text, version number)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `client_deliverables` table
    - Add policies for authenticated users to manage deliverables
    - Add storage policies for client-deliverables bucket

  3. Performance
    - Add indexes for efficient queries
    - Add trigger for auto-updating timestamps
*/

-- Create client_deliverables table
CREATE TABLE IF NOT EXISTS client_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone_name text NOT NULL,
  title text NOT NULL,
  description text,
  document_path text UNIQUE NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0 NOT NULL,
  file_type text DEFAULT 'application/octet-stream' NOT NULL,
  version text DEFAULT '1.0' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_deliverables_client_id ON client_deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_milestone ON client_deliverables(client_id, milestone_name);
CREATE INDEX IF NOT EXISTS idx_client_deliverables_created_at ON client_deliverables(created_at DESC);

-- Enable RLS
ALTER TABLE client_deliverables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$
BEGIN
  -- Drop existing table policies
  DROP POLICY IF EXISTS "Allow authenticated users to view all client deliverables" ON client_deliverables;
  DROP POLICY IF EXISTS "Allow authenticated users to create client deliverables" ON client_deliverables;
  DROP POLICY IF EXISTS "Allow authenticated users to update client deliverables" ON client_deliverables;
  DROP POLICY IF EXISTS "Allow authenticated users to delete client deliverables" ON client_deliverables;
  
  -- Create new table policies
  CREATE POLICY "Allow authenticated users to view all client deliverables"
    ON client_deliverables
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Allow authenticated users to create client deliverables"
    ON client_deliverables
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  CREATE POLICY "Allow authenticated users to update client deliverables"
    ON client_deliverables
    FOR UPDATE
    TO authenticated
    USING (true);

  CREATE POLICY "Allow authenticated users to delete client deliverables"
    ON client_deliverables
    FOR DELETE
    TO authenticated
    USING (true);
END $$;

-- Handle storage policies
DO $$
BEGIN
  -- Drop existing storage policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to view client deliverable files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to upload client deliverable files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to update client deliverable files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated users to delete client deliverable files" ON storage.objects;
  
  -- Create new storage policies
  CREATE POLICY "Allow authenticated users to view client deliverable files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'client-deliverables');

  CREATE POLICY "Allow authenticated users to upload client deliverable files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'client-deliverables');

  CREATE POLICY "Allow authenticated users to update client deliverable files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'client-deliverables');

  CREATE POLICY "Allow authenticated users to delete client deliverable files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'client-deliverables');
END $$;

-- Handle trigger creation safely
DO $$
BEGIN
  -- Drop existing trigger if it exists
  DROP TRIGGER IF EXISTS update_client_deliverables_updated_at ON client_deliverables;
  
  -- Create the trigger
  CREATE TRIGGER update_client_deliverables_updated_at
    BEFORE UPDATE ON client_deliverables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN
    -- Trigger already exists, ignore
    NULL;
END $$;