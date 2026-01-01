import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSharedContent, clearSharedContent, SharedContent } from '@/utils/serviceWorkerRegistration';
import { useToast } from '@/hooks/use-toast';

interface ProcessedSharedContent {
  type: 'image' | 'text' | 'url';
  imageBase64?: string;
  mimeType?: string;
  text?: string;
  url?: string;
  title?: string;
}

export function useShareHandler() {
  const [sharedContent, setSharedContent] = useState<ProcessedSharedContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const processShare = useCallback(async (shareType: string) => {
    console.log('[ShareHandler] Processing share type:', shareType);
    setIsProcessing(true);

    try {
      // Small delay to ensure IndexedDB write is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const content = await getSharedContent();
      console.log('[ShareHandler] Retrieved content:', content);

      if (!content) {
        console.log('[ShareHandler] No content found in storage');
        toast({
          title: "Share failed",
          description: "No shared content found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (content.type === 'image' && content.base64) {
        console.log('[ShareHandler] Processing image share');
        setSharedContent({
          type: 'image',
          imageBase64: content.base64,
          mimeType: content.mimeType || 'image/jpeg',
          title: content.title,
          text: content.text,
          url: content.url
        });

        toast({
          title: "Image received",
          description: "Processing shared image...",
        });
      } else if (content.type === 'url' || content.type === 'text') {
        console.log('[ShareHandler] Processing text/URL share:', content.url || content.text);
        setSharedContent({
          type: content.type,
          url: content.url,
          text: content.text,
          title: content.title
        });

        toast({
          title: "Content received",
          description: "Processing shared content...",
        });
      }

      // Clear the stored content after retrieval
      await clearSharedContent();

    } catch (error) {
      console.error('[ShareHandler] Error processing shared content:', error);
      toast({
        title: "Error",
        description: "Failed to process shared content",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  useEffect(() => {
    // Parse query params from the hash location (React Router's location.search)
    const params = new URLSearchParams(location.search);
    const shared = params.get('shared');

    console.log('[ShareHandler] Checking for shared content, param:', shared, 'path:', location.pathname);

    if (shared === 'image' || shared === 'text') {
      // Clean up the URL by removing the shared param
      const newSearch = new URLSearchParams(location.search);
      newSearch.delete('shared');
      const cleanSearch = newSearch.toString();
      const cleanPath = location.pathname + (cleanSearch ? `?${cleanSearch}` : '');

      // Replace the URL to remove the share indicator
      navigate(cleanPath, { replace: true });

      // Process the shared content
      processShare(shared);

    } else if (shared === 'error') {
      // Clean up URL
      navigate(location.pathname, { replace: true });

      toast({
        title: "Share failed",
        description: "Unable to process shared content",
        variant: "destructive",
      });
    }
  }, [location.search, location.pathname, navigate, processShare, toast]);

  const clearSharedContentState = useCallback(() => {
    setSharedContent(null);
  }, []);

  return {
    sharedContent,
    isProcessing,
    clearSharedContent: clearSharedContentState
  };
}
