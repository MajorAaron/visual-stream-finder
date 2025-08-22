-- Fix PII exposure: Update handle_new_user function to prevent email storage
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Never store email addresses in display_name
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'full_name' IS NOT NULL AND NEW.raw_user_meta_data ->> 'full_name' != '' 
        AND NOT (NEW.raw_user_meta_data ->> 'full_name' ~ '^[^@]+@[^@]+\.[^@]+$')
        THEN NEW.raw_user_meta_data ->> 'full_name'
      WHEN NEW.raw_user_meta_data ->> 'name' IS NOT NULL AND NEW.raw_user_meta_data ->> 'name' != ''
        AND NOT (NEW.raw_user_meta_data ->> 'name' ~ '^[^@]+@[^@]+\.[^@]+$')
        THEN NEW.raw_user_meta_data ->> 'name'
      ELSE 'User'
    END,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Update get_safe_profile_data function with stronger email protection
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(profile_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    -- Enhanced email detection and sanitization
    CASE 
      WHEN p.display_name IS NULL OR p.display_name = '' THEN 'User'
      WHEN p.display_name ~ '^[^@]+@[^@]+\.[^@]+$' THEN 'User'
      WHEN LENGTH(p.display_name) > 50 THEN 'User' -- Prevent potential data leaks
      ELSE p.display_name
    END as display_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

-- Clean existing email addresses from display_name column
UPDATE public.profiles 
SET display_name = 'User' 
WHERE display_name ~ '^[^@]+@[^@]+\.[^@]+$' OR display_name IS NULL OR display_name = '';

-- Add constraint to prevent future email storage (optional but recommended)
ALTER TABLE public.profiles 
ADD CONSTRAINT check_display_name_not_email 
CHECK (display_name !~ '^[^@]+@[^@]+\.[^@]+$' AND display_name IS NOT NULL AND display_name != '');

-- Add input validation function for additional security
CREATE OR REPLACE FUNCTION public.validate_profile_input()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent email addresses in display_name
  IF NEW.display_name ~ '^[^@]+@[^@]+\.[^@]+$' THEN
    NEW.display_name := 'User';
  END IF;
  
  -- Sanitize display_name length
  IF LENGTH(NEW.display_name) > 50 THEN
    NEW.display_name := LEFT(NEW.display_name, 50);
  END IF;
  
  -- Ensure display_name is not empty
  IF NEW.display_name IS NULL OR NEW.display_name = '' THEN
    NEW.display_name := 'User';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for input validation
CREATE TRIGGER validate_profile_data
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_input();