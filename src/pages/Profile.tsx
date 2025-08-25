import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ProfileService, type Profile } from '@/utils/profileService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Camera, Trash2, Save, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const profileData = await ProfileService.getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    // Auth is now handled by ProtectedRoute wrapper
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    setHasChanges(e.target.value !== (profile?.display_name || ''));
  };

  const handleSaveProfile = async () => {
    if (!user || !hasChanges) return;

    setIsSaving(true);
    try {
      const result = await ProfileService.updateProfile(user.id, {
        display_name: displayName.trim() || null
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully'
        });
        setHasChanges(false);
        await loadProfile();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update profile',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      const result = await ProfileService.uploadAvatar(user.id, file);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Avatar uploaded successfully'
        });
        await loadProfile();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to upload avatar',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload avatar',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    const confirmed = window.confirm('Are you sure you want to remove your avatar?');
    if (!confirmed) return;

    setIsUploading(true);
    try {
      const result = await ProfileService.deleteAvatar(user.id, profile.avatar_url);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Avatar removed successfully'
        });
        await loadProfile();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove avatar',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove avatar',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Show loading while auth is being checked
  if (authLoading || isLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your account settings and personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      <Camera className="mr-2 h-4 w-4" />
                      {isUploading ? 'Uploading...' : 'Upload Avatar'}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                
                {profile?.avatar_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAvatar}
                    disabled={isUploading}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPEG, PNG, WebP (max 5MB)
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              type="text"
              value={displayName}
              onChange={handleDisplayNameChange}
              placeholder="Enter your display name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This is how your name will appear across the app
            </p>
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          {/* Account Info */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="text-sm font-medium">Account Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Account Type</p>
                <p className="font-medium">
                  {user?.app_metadata?.provider === 'email' ? 'Email' : 
                   user?.app_metadata?.provider ? user.app_metadata.provider.charAt(0).toUpperCase() + user.app_metadata.provider.slice(1) : 'Standard'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {profile ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={!hasChanges || isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}