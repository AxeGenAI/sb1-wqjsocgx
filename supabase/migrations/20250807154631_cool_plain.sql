/*
  # Add app_url column to clients table

  1. Schema Changes
    - Add `app_url` column to `clients` table (nullable text field)
    - This allows storing the URL of the client's app for easy access from the client dashboard

  2. Notes
    - Column is nullable as not all clients will have an associated app URL
    - No RLS changes needed as existing policies will cover the new column
*/

-- Add app_url column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'app_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN app_url text;
  END IF;
END $$;