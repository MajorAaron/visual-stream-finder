-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Simplified policy to allow authenticated users to upload avatars
-- Files are stored as: userId-timestamp.extension (no folder structure)
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(name, '-', 1)
);

-- Policy to allow authenticated users to update their own avatars
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(name, '-', 1)
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(name, '-', 1)
);

-- Policy to allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(name, '-', 1)
);

-- Policy to allow anyone to view avatars (since bucket is public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');