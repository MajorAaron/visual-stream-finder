import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  isLoading?: boolean;
}

export const ImageUpload = ({ onImageUpload, isLoading }: ImageUploadProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  return (
    <Card className="p-8">
      <div className="text-center space-y-6">
        <div className="space-y-2">
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

        <div className="text-xs text-muted-foreground">
          Supported formats: JPEG, PNG, WebP • Max size: 10MB
        </div>
      </div>
    </Card>
  );
};