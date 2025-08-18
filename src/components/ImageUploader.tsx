import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  initialImage: string;
  onImageChange: (image: string) => void;
}

export function ImageUploader({ initialImage, onImageChange }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(initialImage);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's an image file
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreviewUrl(result);
      onImageChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setPreviewUrl(url);
    onImageChange(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        {previewUrl ? (
          <div className="relative w-40 h-60 mb-4">
            <img 
              src={previewUrl} 
              alt="Cover preview" 
              className="w-full h-full object-cover rounded-md shadow-md"
            />
          </div>
        ) : (
          <div className="w-40 h-60 mb-4 flex items-center justify-center border border-dashed rounded-md bg-muted">
            <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}

        <div className="space-y-2 w-full">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Button>

          <p className="text-xs text-center text-muted-foreground">or</p>

          <Input
            type="url"
            placeholder="Enter image URL"
            value={previewUrl || ''}
            onChange={handleImageUrlInput}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
