import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from './FileUpload';
import { FileText, Download, Trash2, Plus, ExternalLink, Check, Clock, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { listUniversalDocuments, removeUniversalDocument, createUniversalDocument, type Client } from '@/lib/supabase';
import { type UploadedFile } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DocumentLibraryProps {
  files: UploadedFile[];
  onFilesUpload: (file: UploadedFile) => void; // For adding to current client's package
  onFileRemove: (fileId: string) => void; // For removing from current client's package
  onUniversalFileUpload: (file: UploadedFile) => void; // For uploading new universal docs
  onFileSelect?: (file: UploadedFile) => void;
  selectedClient: Client | null;
}

export function DocumentLibrary({ 
  files, 
  onFilesUpload, 
  onFileRemove, 
  onFileSelect, // This is for selecting an existing universal file to add to the current package
  onUniversalFileUpload, // This is for uploading a brand new universal file
  selectedClient 
}: DocumentLibraryProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [existingFiles, setExistingFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      fetchExistingFiles();
    } else {
      setExistingFiles([]);
    }
  }, [selectedClient]);

  const fetchExistingFiles = async () => {
    if (!selectedClient) return;
    
    setIsLoadingFiles(true);
    try { // Now fetching universal documents, not client-specific kickoff materials
      const universalFiles = await listUniversalDocuments();
      // Convert UniversalDocument to UploadedFile format
      const convertedFiles = universalFiles.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        size: doc.file_size,
        type: doc.file_type,
        url: doc.url || '',
        path: doc.document_path,
        created_at: doc.created_at
      }));
      setExistingFiles(convertedFiles);
    } catch (error) {
      console.error('Error fetching existing kickoff materials:', error);
      toast({
        title: "Failed to Load Existing Files",
        description: "Could not retrieve existing kickoff materials from storage.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileUpload = async (file: UploadedFile) => {
    // This is for uploading a new universal document
    await onUniversalFileUpload(file);
    // Refresh existing files list
    fetchExistingFiles();
  };

  const handleFileSelect = (file: UploadedFile) => {
    if (onFileSelect) {
      onFileSelect(file);
      toast({
        title: "File Selected",
        description: `Selected "${file.name}" from existing kickoff materials.`,
      });
    }
  };

  const handleRemoveUniversalFile = async (fileId: string) => {
    try {
      // This is for permanently deleting a universal document
      await removeUniversalDocument(fileId);
      setExistingFiles(prev => prev.filter(f => f.id !== fileId)); // Remove from universal list
      onFileRemove(fileId); // Also remove from current client's selection if present
      toast({
        title: "Universal File Deleted",
        description: "The universal kickoff material has been permanently removed.",
      });
    } catch (error) {
      console.error('Error deleting universal file:', error);
      toast({
        title: "Delete Failed",
        description: "Could not permanently delete the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromClientPackage = (fileId: string) => {
    // This is for removing a file from the current client's package (not deleting universally)
    onFileRemove(fileId);
  };

  const handleDownload = (file: UploadedFile) => {
    window.open(file.url, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isFileSelectedForClient = (fileId: string) => {
    return files.some(f => f.id === fileId);
  };

  // Combine universal files and currently selected files for display
  // Ensure no duplicates if a universal file is also in the current selection
  const allDisplayFiles = existingFiles.map(file => ({
    ...file,
    isSelected: isFileSelectedForClient(file.id)
  }));

  const hasFiles = allDisplayFiles.length > 0;

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Client Resources</CardTitle>
            <CardDescription className="text-lg font-medium text-slate-600 mt-3">
              Manage your universal library of presentation decks, templates, and strategic resources.
              Select files to include in the current client's package.
              {selectedClient && (
                <span className="block mt-3 text-blue-600 font-semibold">
                  Client: {selectedClient.name}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            {hasFiles && (
              <Badge variant="secondary" className="text-sm font-semibold px-4 py-2 whitespace-nowrap">
                {allDisplayFiles.length} resource{allDisplayFiles.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button 
              onClick={() => setShowUpload(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              size="sm"
              disabled={!selectedClient}
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedClient && (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-amber-800 font-medium">
              Please select a client first to manage kickoff materials.
            </p>
          </div>
        )}

        {showUpload && selectedClient && (
          <div className="p-4 border rounded-lg bg-slate-50">
            <FileUpload
              onFileUpload={handleFileUpload} // This now handles universal file uploads
              acceptedTypes={['.pdf', '.pptx', '.docx', '.xlsx', '.txt']}
              maxSize={25 * 1024 * 1024} // 25MB
              multiple={false}
              bucket="kickoff-materials" // Use the existing bucket
            />
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowUpload(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Universal Files List */}
        {selectedClient && allDisplayFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-slate-900 flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <span>Available Client Resources</span>
              </h4>
              <Badge variant="secondary" className="text-sm font-semibold px-4 py-2 whitespace-nowrap">
                {allDisplayFiles.length} resource{allDisplayFiles.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {isLoadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-slate-600">Loading universal files...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {allDisplayFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200 hover:shadow-sm group ${
                      file.isSelected 
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-lg shadow-emerald-500/10' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        file.isSelected ? 'bg-emerald-100' : 'bg-blue-100'
                      }`}>
                        {file.isSelected ? (
                          <Check className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-3 text-sm text-slate-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(file.created_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {file.isSelected ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFromClientPackage(file.id)}
                          className="rounded-xl text-orange-600 border-orange-300 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-400 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          Remove from Package
                        </Button>
                      ) : (
                        onFileSelect && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileSelect(file)}
                            className="rounded-xl text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-300"
                          >
                            Add to Package
                          </Button>
                        )
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="rounded-xl text-slate-600 border-slate-300 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm hover:shadow-md transition-all duration-300"
                        title="View/Download file"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUniversalFile(file.id)} // This is for permanent deletion
                        className="rounded-xl text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400 shadow-sm hover:shadow-md transition-all duration-300"
                        title="Permanently delete universal file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedClient && allDisplayFiles.length === 0 && !isLoadingFiles && (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="font-semibold text-lg text-slate-700">No client resources available</p>
            <p className="text-base mt-2 font-medium">Add your first strategic resource to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}