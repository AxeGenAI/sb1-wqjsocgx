/*
  # Create client deliverables system

  1. New Tables
    - `client_deliverables`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `milestone_name` (text, milestone identifier)
      - `title` (text, deliverable title)
      - `description` (text, optional description)
      - `document_path` (text, storage path)
      - `file_name` (text, original filename)
      - `file_size` (bigint, file size in bytes)
      - `file_type` (text, MIME type)
      - `version` (text, version number)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `client_deliverables` table
    - Add policy for public access (matching existing pattern)

  3. Indexes
    - Index on client_id for efficient queries
    - Index on milestone_name for grouping
    - Index on created_at for ordering
*/

CREATE TABLE IF NOT EXISTS client_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone_name text NOT NULL,
  title text NOT NULL,
  description text,
  document_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  version text NOT NULL DEFAULT '1.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_deliverables ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching existing pattern)
CREATE POLICY "Allow public access to client_deliverables"
  ON client_deliverables
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_deliverables_client_id 
  ON client_deliverables(client_id);

CREATE INDEX IF NOT EXISTS idx_client_deliverables_milestone 
  ON client_deliverables(client_id, milestone_name);

CREATE INDEX IF NOT EXISTS idx_client_deliverables_created_at 
  ON client_deliverables(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_client_deliverables_updated_at
  BEFORE UPDATE ON client_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();