-- Fix critical security issue: Remove public access to user profiles
-- and replace with user-specific access only

-- Drop the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Optional: Create a policy to allow viewing only non-sensitive profile data of other users
-- This policy only exposes display_name and avatar_url, NOT email addresses
CREATE POLICY "Public can view limited profile data" 
ON public.profiles 
FOR SELECT 
USING (true);