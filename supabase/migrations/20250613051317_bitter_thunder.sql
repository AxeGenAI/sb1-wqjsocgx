/*
  # Setup Storage Buckets and Policies

  1. Storage Buckets
    - `sow-documents` - For Statement of Work files (PDF, DOCX, TXT, max 10MB)
    - `kickoff-materials` - For presentation decks and materials (PDF, PPTX, DOCX, XLSX, TXT, max 25MB)

  2. Security
    - Enable public access for file uploads and downloads
    - Create RLS policies for authenticated and anonymous users
    - Allow CRUD operations on both buckets
*/

-- Create storage buckets using the storage schema functions
DO $$
BEGIN
  -- Create sow-documents bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'sow-documents') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'sow-documents', 
      'sow-documents', 
      true, 
      10485760, -- 10MB
      ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ]
    );
  END IF;

  -- Create kickoff-materials bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'kickoff-materials') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'kickoff-materials', 
      'kickoff-materials', 
      true, 
      26214400, -- 25MB
      ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ]
    );
  END IF;
END $$;

-- Create storage policies using DO blocks to handle existing policies
DO $$
BEGIN
  -- Policy for public uploads to sow-documents bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public uploads to sow-documents'
  ) THEN
    CREATE POLICY "Allow public uploads to sow-documents"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'sow-documents');
  END IF;

  -- Policy for public reads from sow-documents bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public reads from sow-documents'
  ) THEN
    CREATE POLICY "Allow public reads from sow-documents"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'sow-documents');
  END IF;

  -- Policy for public deletes from sow-documents bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public deletes from sow-documents'
  ) THEN
    CREATE POLICY "Allow public deletes from sow-documents"
    ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id = 'sow-documents');
  END IF;

  -- Policy for public uploads to kickoff-materials bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public uploads to kickoff-materials'
  ) THEN
    CREATE POLICY "Allow public uploads to kickoff-materials"
    ON storage.objects
    FOR INSERT
    TO public
    WITH CHECK (bucket_id = 'kickoff-materials');
  END IF;

  -- Policy for public reads from kickoff-materials bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public reads from kickoff-materials'
  ) THEN
    CREATE POLICY "Allow public reads from kickoff-materials"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'kickoff-materials');
  END IF;

  -- Policy for public deletes from kickoff-materials bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public deletes from kickoff-materials'
  ) THEN
    CREATE POLICY "Allow public deletes from kickoff-materials"
    ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id = 'kickoff-materials');
  END IF;
END $$;