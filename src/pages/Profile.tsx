import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProfileService, type Profile } from "@/utils/profileService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Trash2, Save, User, Download, Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const profileData = await ProfileService.getProfile(user.id);
      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
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

  useEffect(() => {
    // Check if PWA is installed
    const checkPWAStatus = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsPWAInstalled(isStandalone);
    };

    checkPWAStatus();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstallPWA(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setCanInstallPWA(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    setHasChanges(e.target.value !== (profile?.display_name || ""));
  };

  const handleSaveProfile = async () => {
    if (!user || !hasChanges) return;

    setIsSaving(true);
    try {
      const result = await ProfileService.updateProfile(user.id, {
        display_name: displayName.trim() || null,
      });

      if (result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        setHasChanges(false);
        await loadProfile();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
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
          title: "Success",
          description: "Avatar uploaded successfully",
        });
        await loadProfile();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to upload avatar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInstallPWA = async () => {
    if (!deferredPromptRef.current) {
      // If no deferred prompt, show instructions
      toast({
        title: "Installation Instructions",
        description: "To install: Chrome menu (⋮) → 'Add to Home screen' or 'Install app'",
        duration: 5000,
      });
      return;
    }

    try {
      // Show the install prompt
      const promptEvent = deferredPromptRef.current;
      promptEvent.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await promptEvent.userChoice;
      
      if (outcome === 'accepted') {
        toast({
          title: "Success",
          description: "App installed successfully!",
        });
        setIsPWAInstalled(true);
        setCanInstallPWA(false);
      } else {
        toast({
          title: "Installation Cancelled",
          description: "You can install the app anytime from your browser menu",
        });
      }
      
      // Clear the deferred prompt
      deferredPromptRef.current = null;
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast({
        title: "Installation Error",
        description: "Failed to install the app. Try from your browser menu instead.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your avatar?",
    );
    if (!confirmed) return;

    setIsUploading(true);
    try {
      const result = await ProfileService.deleteAvatar(
        user.id,
        profile.avatar_url,
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Avatar removed successfully",
        });
        await loadProfile();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to remove avatar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast({
        title: "Error",
        description: "Failed to remove avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (displayName) {
      return displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
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
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-4 sm:py-8">
        <Button
          variant="ghost"
          className="mb-4 sm:mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Manage your account settings and personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Avatar Section - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xl sm:text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      asChild
                      className="w-full sm:w-auto"
                    >
                      <span>
                        <Camera className="mr-2 h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload Avatar"}
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
                      className="w-full sm:w-auto"
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
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* PWA Installation Section */}
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-sm font-medium">App Installation</h3>
              <div className="space-y-3">
                {isPWAInstalled ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Smartphone className="h-4 w-4" />
                    <span>App is installed</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Install the app for a better experience:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li>• Share images directly from other apps</li>
                      <li>• Quick access from home screen</li>
                      <li>• Works offline</li>
                      <li>• Full screen experience</li>
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleInstallPWA}
                      className="w-full sm:w-auto"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Install App
                    </Button>
                    {!canInstallPWA && (
                      <p className="text-xs text-muted-foreground">
                        To install: Use Chrome menu (⋮) → 'Add to Home screen'
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="space-y-2 pt-4 border-t">
              <h3 className="text-sm font-medium">Account Information</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Account Type
                  </p>
                  <p className="font-medium">
                    {user?.app_metadata?.provider === "email"
                      ? "Email"
                      : user?.app_metadata?.provider
                        ? user.app_metadata.provider.charAt(0).toUpperCase() +
                          user.app_metadata.provider.slice(1)
                        : "Standard"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    Member Since
                  </p>
                  <p className="font-medium">
                    {profile
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button - Fixed for mobile */}
            <div className="flex justify-end pt-4 pb-2">
              <Button
                onClick={handleSaveProfile}
                disabled={!hasChanges || isSaving}
                className="w-full sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
