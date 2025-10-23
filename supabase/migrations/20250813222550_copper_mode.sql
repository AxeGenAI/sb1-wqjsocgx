/*
  # Create signature_requests table for e-signature functionality

  1. New Tables
    - `signature_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `sow_document_id` (uuid, optional foreign key to client_documents)
      - `nda_document_id` (uuid, optional foreign key to universal_documents)
      - `recipient_name` (text, required)
      - `recipient_email` (text, required)
      - `status` (text, with check constraint for valid values)
      - `external_request_id` (text, optional for third-party integration)
      - `signed_document_url` (text, optional URL to signed document)
      - `signing_url` (text, unique signing link)
      - `signer_typed_signature` (text, stores typed signature)
      - `signed_at` (timestamp, when document was signed)
      - `created_at` (timestamp, auto-generated)
      - `updated_at` (timestamp, auto-updated)

  2. Security
    - Enable RLS on `signature_requests` table
    - Add policy for public access (development mode)

  3. Indexes
    - Index on client_id for performance
    - Index on status for filtering
    - Index on recipient_email for lookups
*/

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
  signing_url text,
  signer_typed_signature text,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT signature_requests_status_check 
    CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'voided'))
);

-- Enable RLS
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signature_requests_client_id 
  ON signature_requests(client_id);

CREATE INDEX IF NOT EXISTS idx_signature_requests_status 
  ON signature_requests(status);

CREATE INDEX IF NOT EXISTS idx_signature_requests_recipient_email 
  ON signature_requests(recipient_email);

CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at 
  ON signature_requests(created_at DESC);

-- Create RLS policy using DO block to handle IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'signature_requests' 
    AND policyname = 'Allow public access to signature_requests'
  ) THEN
    CREATE POLICY "Allow public access to signature_requests"
      ON signature_requests
      FOR ALL
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_signature_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_signature_requests_updated_at
      BEFORE UPDATE ON signature_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;