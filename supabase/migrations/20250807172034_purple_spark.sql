/*
  # Fix client-logos storage bucket access

  1. Storage Policies
    - Create comprehensive RLS policies for client-logos bucket
    - Allow public access for upload, select, update, and delete operations
    - Ensure bucket exists and is configured properly

  2. Security
    - Enable RLS on storage.objects table for client-logos bucket
    - Add policies for all CRUD operations on the bucket
*/

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];

-- Create policy for uploading files to client-logos bucket
CREATE POLICY "Allow public uploads to client-logos bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'client-logos');

-- Create policy for viewing files in client-logos bucket
CREATE POLICY "Allow public access to client-logos bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Create policy for updating files in client-logos bucket
CREATE POLICY "Allow public updates to client-logos bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'client-logos')
WITH CHECK (bucket_id = 'client-logos');

-- Create policy for deleting files in client-logos bucket
CREATE POLICY "Allow public deletes from client-logos bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'client-logos');