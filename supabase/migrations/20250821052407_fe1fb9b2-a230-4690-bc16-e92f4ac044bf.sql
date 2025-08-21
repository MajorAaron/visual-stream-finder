-- Fix the conflicting policies by removing the public access policy
-- and implementing a proper security model

-- Drop the conflicting public policy
DROP POLICY IF EXISTS "Public can view limited profile data" ON public.profiles;

-- Create a function to get safe profile data (no email exposure)
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(profile_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    -- Only return display_name if it's not an email address
    CASE 
      WHEN p.display_name ~ '^[^@]+@[^@]+\.[^@]+$' THEN 'User'
      ELSE COALESCE(p.display_name, 'User')
    END as display_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

-- Update the trigger function to never store email addresses in display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Never store email addresses in display_name
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'full_name' IS NOT NULL AND NEW.raw_user_meta_data ->> 'full_name' != '' 
        THEN NEW.raw_user_meta_data ->> 'full_name'
      WHEN NEW.raw_user_meta_data ->> 'name' IS NOT NULL AND NEW.raw_user_meta_data ->> 'name' != ''
        THEN NEW.raw_user_meta_data ->> 'name'
      ELSE 'User'
    END,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;