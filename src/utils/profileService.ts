import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export class ProfileService {
  static async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getProfile:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: { display_name?: string; avatar_url?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  static async uploadAvatar(userId: string, file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        return { success: false, error: 'Please upload a valid image file (JPEG, PNG, or WebP)' };
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return { success: false, error: 'Image size must be less than 5MB' };
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Don't include 'avatars/' prefix since we're already in the avatars bucket

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        return { success: false, error: 'Failed to upload image' };
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const updateResult = await this.updateProfile(userId, { avatar_url: publicUrl });
      
      if (!updateResult.success) {
        // Try to delete uploaded file if profile update fails
        await supabase.storage.from('avatars').remove([filePath]);
        return updateResult;
      }

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      return { success: false, error: 'Failed to upload avatar' };
    }
  }

  static async deleteAvatar(userId: string, currentAvatarUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Only delete from Supabase storage if the URL points to the public avatars bucket
      const storagePathMarker = '/storage/v1/object/public/avatars/';
      if (currentAvatarUrl && currentAvatarUrl.startsWith('http') && currentAvatarUrl.includes(storagePathMarker)) {
        const filePath = currentAvatarUrl.substring(currentAvatarUrl.indexOf(storagePathMarker) + storagePathMarker.length);

        if (filePath && !filePath.includes('/')) {
          // Delete from storage
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([filePath]);

          if (deleteError) {
            console.error('Error deleting avatar file:', deleteError);
          }
        }
      }

      // Update profile to remove avatar URL
      return await this.updateProfile(userId, { avatar_url: null });
    } catch (error) {
      console.error('Error in deleteAvatar:', error);
      return { success: false, error: 'Failed to delete avatar' };
    }
  }
}