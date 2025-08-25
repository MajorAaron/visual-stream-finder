-- ============================================
-- Avatar Storage Bucket RLS Policies
-- ============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mrkcgfsbdcukufgwvjap/sql/new
-- ============================================

-- Enable RLS on storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies to avoid conflicts
DO $$ 
BEGIN
    -- Drop policies if they exist
    DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create new policies

-- 1. Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars"
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 2. Allow authenticated users to update avatars
CREATE POLICY "Users can update avatars"
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- 3. Allow authenticated users to delete avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'avatars');

-- 4. Allow everyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'avatars');

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY policyname;