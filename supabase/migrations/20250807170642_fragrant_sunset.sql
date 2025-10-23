/*
  # Add client logo support

  1. Schema Changes
    - Add `logo_url` column to `clients` table to store the public URL of uploaded logos
  
  2. Security
    - No additional RLS policies needed as the existing policies cover the new column
*/

-- Add logo_url column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN logo_url text;
  END IF;
END $$;