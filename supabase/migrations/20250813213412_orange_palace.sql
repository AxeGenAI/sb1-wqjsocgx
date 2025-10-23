/*
  # Create signature requests table for e-signature functionality

  1. New Tables
    - `signature_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `sow_document_id` (uuid, foreign key to client_documents, nullable)
      - `nda_document_id` (uuid, foreign key to universal_documents, nullable)
      - `recipient_name` (text)
      - `recipient_email` (text)
      - `status` (text, with check constraint)
      - `external_request_id` (text, nullable)
      - `signed_document_url` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `signature_requests` table
    - Add policy for public access (development mode)

  3. Indexes
    - Index on client_id for faster lookups
    - Index on status for filtering
    - Index on external_request_id for webhook lookups

  4. Triggers
    - Auto-update updated_at timestamp on row updates
*/

-- Create the signature_requests table
CREATE TABLE IF NOT EXISTS signature_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sow_document_id uuid REFERENCES client_documents(id) ON DELETE SET NULL,
    nda_document_id uuid REFERENCES universal_documents(id) ON DELETE SET NULL,
    recipient_name text NOT NULL,
    recipient_email text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    external_request_id text,
    signed_document_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'signature_requests' AND constraint_name = 'signature_requests_status_check'
  ) THEN
    ALTER TABLE signature_requests ADD CONSTRAINT signature_requests_status_check 
    CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'voided'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signature_requests_client_id ON signature_requests USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_external_id ON signature_requests USING btree (external_request_id) WHERE external_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at ON signature_requests USING btree (created_at DESC);

-- Enable Row Level Security
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public access (development mode)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'signature_requests' AND policyname = 'Allow public access to signature_requests'
  ) THEN
    CREATE POLICY "Allow public access to signature_requests"
    ON signature_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Create or update the trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_signature_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_signature_requests_updated_at
    BEFORE UPDATE ON signature_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;