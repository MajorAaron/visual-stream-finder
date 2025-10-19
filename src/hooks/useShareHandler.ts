import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSharedImage, clearSharedImages } from '@/utils/serviceWorkerRegistration';
import { useToast } from '@/hooks/use-toast';

interface SharedContent {
  type: 'image' | 'text' | 'url';
  imageBase64?: string;
  mimeType?: string;
  text?: string;
  url?: string;
  title?: string;
}

export function useShareHandler() {
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleSharedContent = async () => {
      const params = new URLSearchParams(location.search);
      const action = params.get('action');

      if (action === 'shared-image') {
        // Handle shared image from service worker
        setIsProcessing(true);
        
        try {
          const sharedImage = await getSharedImage();
          
          if (sharedImage) {
            setSharedContent({
              type: 'image',
              imageBase64: sharedImage.base64,
              mimeType: sharedImage.mimeType,
              title: sharedImage.metadata.title,
              text: sharedImage.metadata.text,
              url: sharedImage.metadata.url
            });
            
            // Clear the shared image from storage
            await clearSharedImages();
            
            toast({
              title: "Image received",
              description: "Processing shared image...",
            });
          }
        } catch (error) {
          console.error('Error retrieving shared image:', error);
          toast({
            title: "Error",
            description: "Failed to process shared image",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
        
        // Clean up URL and navigate to search page
        navigate('/search', { replace: true });
        
      } else if (action === 'shared-text') {
        // Handle shared text/URL
        const sharedUrl = params.get('url');
        const sharedText = params.get('text');
        const sharedTitle = params.get('title');
        
        if (sharedUrl || sharedText) {
          setSharedContent({
            type: sharedUrl ? 'url' : 'text',
            url: sharedUrl || undefined,
            text: sharedText || undefined,
            title: sharedTitle || undefined
          });
          
          toast({
            title: "Content received",
            description: "Processing shared content...",
          });
        }
        
        // Clean up URL and navigate to search page
        navigate('/search', { replace: true });
        
      } else if (action === 'share-error') {
        toast({
          title: "Share failed",
          description: "Unable to process shared content",
          variant: "destructive",
        });
        
        // Clean up URL and navigate to search page
        navigate('/search', { replace: true });
      }
    };

    handleSharedContent();
  }, [location, navigate, toast]);

  const clearSharedContent = () => {
    setSharedContent(null);
  };

  return {
    sharedContent,
    isProcessing,
    clearSharedContent
  };
}