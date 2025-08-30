import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Image as ImageIcon, X, Search, Type } from 'lucide-react';
import { toast } from 'sonner';

interface SearchInputProps {
  onImageUpload: (file: File) => void;
  onTextSearch: (text: string) => void;
  isLoading?: boolean;
}

export const SearchInput = ({ onImageUpload, onTextSearch, isLoading }: SearchInputProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('image');
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus text input when switching to text search tab
  useEffect(() => {
    if (activeTab === 'text') {
      // Longer delay to ensure the tab content is fully rendered
      const timer = setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          // Also try to select the text if there's any
          textInputRef.current.select();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Handle tab change with focus
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'text') {
      // Additional focus attempt when tab changes
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          textInputRef.current.select();
        }
      }, 100);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectedFile = rejectedFiles[0];
      const errors = rejectedFile.errors;
      
      if (errors.some((e: any) => e.code === 'file-too-large')) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }
      if (errors.some((e: any) => e.code === 'file-invalid-type')) {
        toast.error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
        return;
      }
      toast.error('File upload failed. Please try again.');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      // Additional client-side validation
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      // Validate file type more strictly
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload JPEG, PNG, or WebP images only.');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      onImageUpload(file);
      toast.success('Image uploaded successfully!');
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    multiple: false,
    disabled: isLoading,
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1
  });

  const clearImage = () => {
    setPreviewImage(null);
  };

  const handleTextSearch = () => {
    if (!searchText.trim()) {
      toast.error('Please enter a movie/TV show title or URL to search.');
      return;
    }
    
    // Check if input is a URL
    const isUrl = searchText.trim().match(/^https?:\/\/.+/);
    if (isUrl) {
      onTextSearch(searchText.trim());
      toast.success('Extracting content from URL...');
    } else {
      onTextSearch(searchText.trim());
      toast.success('Searching for content...');
    }
  };

  const handleTextInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTextSearch();
    }
  };

  return (
    <Card className="p-8">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 border border-border h-16">
          <TabsTrigger 
            value="image" 
            className="flex items-center gap-3 text-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
          >
            <ImageIcon className="h-6 w-6" />
            Image Upload
          </TabsTrigger>
          <TabsTrigger 
            value="text" 
            className="flex items-center gap-3 text-lg font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
          >
            <Type className="h-6 w-6" />
            Text Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="space-y-6">
          <div className="text-center space-y-2">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-bold">Upload Your Screen Image</h2>
            <p className="text-muted-foreground">
              Upload a photo of your TV screen or a screenshot from your phone
            </p>
          </div>

          {!previewImage ? (
            <div
              {...getRootProps()}
              className={`upload-zone rounded-lg p-12 cursor-pointer ${
                isDragActive ? 'drag-over' : ''
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-4">
                <Upload className="h-16 w-16 text-muted-foreground" />
                <div className="space-y-2 text-center">
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop your image here' : 'Drag & drop your image here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                <Button variant="glow" size="lg" disabled={isLoading}>
                  Choose Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Uploaded preview"
                  className="mx-auto rounded-lg max-h-64 object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Image uploaded successfully! AI analysis will begin automatically.
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Supported formats: JPEG, PNG, WebP • Max size: 10MB
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="text-center space-y-3">
            <Search className="mx-auto h-16 w-16 text-primary animate-pulse" />
            <h2 className="text-3xl font-bold text-primary">Search by Title</h2>
            <p className="text-muted-foreground text-lg">
              Enter the name of a movie or TV show to find streaming options
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-2">
              <Input
                placeholder="e.g. The Matrix, https://www.imdb.com/title/tt0133093/, Stranger Things..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={handleTextInputKeyPress}
                disabled={isLoading}
                className="w-full sm:flex-1 text-xl py-6 px-4 border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                ref={textInputRef}
              />
              <Button 
                onClick={handleTextSearch}
                disabled={isLoading || !searchText.trim()}
                size="default"
                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                <Search className="h-6 w-6 mr-3" />
                Search
              </Button>
            </div>
            
            <div className="text-base text-muted-foreground text-center bg-muted/30 p-4 rounded-lg border border-border/50">
              Perfect for titles, IMDb URLs, or any shared links about movies and shows
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};