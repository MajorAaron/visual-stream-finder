-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Create new policies that handle UUID format properly
-- Files are stored as: uuid-timestamp.extension where uuid contains hyphens
-- We need to extract the first 36 characters which is the standard UUID length

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = left(name, 36)  -- UUID is always 36 characters
);

CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = left(name, 36)
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = left(name, 36)
);

CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = left(name, 36)
);

-- Policy to allow anyone to view avatars (since bucket is public)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');