import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileUpload } from './FileUpload';
import { FileText, Download, Trash2, Plus, ExternalLink, Check, Clock, Loader2, Upload } from 'lucide-react';
import { 
  listClientDocuments, 
  removeClientDocument, 
  type Client, 
  type UploadedFile 
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SOWSelectorProps {
  selectedClient: Client | null;
  sowFile: UploadedFile | null;
  onSOWUpload: (file: File) => void;
  onSelectExistingSOW: (file: UploadedFile) => void;
}

export function SOWSelector({ 
  selectedClient, 
  sowFile, 
  onSOWUpload, 
  onSelectExistingSOW 
}: SOWSelectorProps) {
  const [existingSOWs, setExistingSOWs] = useState<UploadedFile[]>([]);
  const [isLoadingSOWs, setIsLoadingSOWs] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      fetchExistingSOWs();
    } else {
      setExistingSOWs([]);
    }
  }, [selectedClient]);

  const fetchExistingSOWs = async () => {
    if (!selectedClient) return;
    
    setIsLoadingSOWs(true);
    try {
      const clientSOWs = await listClientDocuments(selectedClient.id, 'sow');
      setExistingSOWs(clientSOWs);
    } catch (error) {
      console.error('Error fetching existing SOWs:', error);
      toast({
        title: "Failed to Load Existing SOWs",
        description: "Could not retrieve existing SOW documents from storage.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSOWs(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    await onSOWUpload(file);
    setShowUpload(false);
    // Refresh the list of existing SOWs
    fetchExistingSOWs();
  };

  const handleSelectSOW = (sow: UploadedFile) => {
    onSelectExistingSOW(sow);
    toast({
      title: "SOW Selected",
      description: `Selected "${sow.name}" for analysis.`,
    });
  };

  const handleRemoveSOW = async (sowId: string) => {
    try {
      await removeClientDocument(sowId);
      setExistingSOWs(prev => prev.filter(s => s.id !== sowId));
      
      // If the removed SOW was currently selected, clear the selection
      if (sowFile && sowFile.id === sowId) {
        // Note: We can't directly call a reset function here, but the parent component
        // should handle this case by checking if the selected SOW still exists
      }
      
      toast({
        title: "SOW Deleted",
        description: "The SOW document has been permanently removed.",
      });
    } catch (error) {
      console.error('Error deleting SOW:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the SOW. Please try again.",
        variant: "destructive",
      });
    }
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

  const isSOWSelected = (sowId: string) => {
    return sowFile?.id === sowId;
  };

  if (!selectedClient) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-amber-800 font-medium">
          Please select a client first to manage SOW documents.
        </p>
      </div>
    );
  }

  // If a SOW is already selected, show confirmation
  if (sowFile) {
    return (
      <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 shadow-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-xl">{sowFile.name}</p>
                <p className="text-base font-medium text-emerald-700 mt-1">
                  {formatFileSize(sowFile.size)} • Selected for analysis
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => onSelectExistingSOW(null as any)} // This will clear the selection
              className="text-orange-600 border-orange-300 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-400"
            >
              Change SOW
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Existing SOWs Section */}
      {existingSOWs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-bold text-slate-900 flex items-center space-x-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <span>Existing SOW Documents</span>
            </h4>
            <Badge variant="secondary" className="text-sm font-semibold px-4 py-2">
              {existingSOWs.length} document{existingSOWs.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          {isLoadingSOWs ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-slate-600">Loading existing SOWs...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {existingSOWs.map((sow) => (
                <div
                  key={sow.id}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200 hover:shadow-sm group ${
                    isSOWSelected(sow.id) 
                      ? 'border-emerald-500 bg-emerald-50/80 shadow-lg shadow-emerald-500/10' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSOWSelected(sow.id) ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      {isSOWSelected(sow.id) ? (
                        <Check className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-base">
                        {sow.name}
                      </p>
                      <div className="flex items-center space-x-3 text-sm text-slate-500">
                        <span>{formatFileSize(sow.size)}</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(sow.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectSOW(sow)}
                      className="rounded-xl text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      Select for Analysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSOW(sow.id)}
                      className="rounded-xl text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400 shadow-sm hover:shadow-md transition-all duration-300"
                      title="Delete SOW"
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

      {/* Separator */}
      {existingSOWs.length > 0 && <Separator />}

      {/* Upload New SOW Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xl font-bold text-slate-900 flex items-center space-x-3">
            <Upload className="w-6 h-6 text-purple-600" />
            <span>Upload New SOW</span>
          </h4>
          {!showUpload && (
            <Button 
              onClick={() => setShowUpload(true)}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New</span>
            </Button>
          )}
        </div>

        {showUpload && (
          <div className="space-y-4">
            <FileUpload
              onFileUpload={handleFileUpload}
              acceptedTypes={['.pdf', '.docx', '.txt']}
              maxSize={10 * 1024 * 1024}
              bucket="sow-documents"
            />
            <div className="flex justify-end">
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

        {!showUpload && existingSOWs.length === 0 && (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="font-semibold text-lg text-slate-700">No SOW documents found</p>
            <p className="text-base mt-2 font-medium">Upload your first Statement of Work to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}