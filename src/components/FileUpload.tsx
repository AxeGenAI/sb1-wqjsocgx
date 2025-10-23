import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { uploadFile, type UploadedFile } from '@/lib/supabase';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  acceptedTypes: string[];
  maxSize: number;
  uploadedFile?: UploadedFile | null;
  multiple?: boolean;
  bucket?: string;
}

export function FileUpload({ 
  onFileUpload, 
  acceptedTypes, 
  maxSize, 
  uploadedFile,
  multiple = false,
  bucket = 'documents' // This prop is now unused but kept for backward compatibility
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type not supported. Please upload: ${acceptedTypes.join(', ')}`;
    }
    
    if (file.size > maxSize) {
      return `File size too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError(null);
    
    // Pass the raw File object to parent for handling
    onFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleClick = () => {
    if (true) { // Always allow clicking since we're not handling upload state here
      fileInputRef.current?.click();
    }
  };

  if (uploadedFile) {
    return (
      <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-xl">{uploadedFile.name}</p>
                <p className="text-base font-medium text-emerald-700 mt-1">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Uploaded successfully
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card 
        className={`border-2 border-dashed transition-all duration-300 ${
          false // Remove isUploading state
            ? 'border-blue-400 bg-blue-50/80 cursor-not-allowed shadow-lg' 
            : isDragOver 
              ? 'border-blue-400 bg-blue-50/80 cursor-pointer shadow-lg' 
              : 'border-slate-300 hover:border-blue-400 cursor-pointer hover:bg-slate-50/50 hover:shadow-md'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="p-12">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className="w-10 h-10 text-slate-600" />
            </div>
            
            <div>
              <p className="text-xl font-bold text-slate-900">
                <>Drop your file here, or <span className="text-blue-600 font-bold">browse</span></>
              </p>
              <p className="text-base font-medium text-slate-500 mt-3">
                Supports: {acceptedTypes.join(', ')} • Max {(maxSize / 1024 / 1024).toFixed(1)}MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        multiple={multiple}
        disabled={false}
      />

      {error && (
        <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-base font-medium text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}