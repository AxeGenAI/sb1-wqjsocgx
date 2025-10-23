import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from './FileUpload';
import { 
  PenTool, 
  FileText, 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  User,
  Mail,
  Calendar,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Upload,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  listSignatureRequests,
  updateSignatureRequestStatus,
  createUniversalDocument,
  removeNDAFromSignatureRequest,
  removeSOWFromSignatureRequest,
  type SignatureRequest,
  type Client
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SignatureRequestsPanelProps {
  selectedClient: Client | null;
  onSendNewRequest?: () => void;
}

const statusConfig = {
  draft: {
    icon: Clock,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Draft'
  },
  sent: {
    icon: Mail,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Sent'
  },
  viewed: {
    icon: Eye,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    label: 'Viewed'
  },
  signed: {
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Signed'
  },
  declined: {
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
    label: 'Declined'
  },
  voided: {
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: 'Voided'
  }
};

export function SignatureRequestsPanel({ selectedClient, onSendNewRequest }: SignatureRequestsPanelProps) {
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNdaUploadForm, setShowNdaUploadForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const requestsPerPage = 8; // 2 rows of 4 cards each
  const { toast } = useToast();

  useEffect(() => {
    fetchSignatureRequests();
  }, [selectedClient]);

  const fetchSignatureRequests = async () => {
    setIsLoading(true);
    try {
      const requests = await listSignatureRequests(selectedClient?.id);
      setSignatureRequests(requests);
    } catch (error) {
      console.error('Error fetching signature requests:', error);
      // Check if the error is due to missing table
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('relation "public.signature_requests" does not exist')) {
        console.warn('Signature requests table does not exist yet. Skipping fetch.');
        setSignatureRequests([]);
      } else {
        toast({
          title: "Failed to Load Signature Requests",
          description: "Could not retrieve signature requests from database.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: SignatureRequest['status']) => {
    try {
      await updateSignatureRequestStatus(requestId, newStatus);
      setSignatureRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: newStatus } : req
      ));

      toast({
        title: "Status Updated",
        description: `Signature request status updated to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the signature request status.",
        variant: "destructive",
      });
    }
  };

  const handleNdaUpload = async (file: File) => {
    try {
      const fileName = `nda-templates/${Date.now()}-${file.name}`;
      await createUniversalDocument(file, 'kickoff-materials', fileName);
      
      setShowNdaUploadForm(false);
      
      toast({
        title: "NDA Template Uploaded Successfully",
        description: `${file.name} has been added to your NDA template library.`,
      });
    } catch (error) {
      console.error('Error uploading NDA:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload the NDA template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveNDA = async (requestId: string) => {
    try {
      await removeNDAFromSignatureRequest(requestId);
      setSignatureRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, nda_document_id: undefined } : req
      ));

      toast({
        title: "NDA Removed",
        description: "NDA has been removed from this signature request.",
      });
    } catch (error) {
      console.error('Error removing NDA:', error);
      toast({
        title: "Remove Failed",
        description: "Could not remove the NDA from this request.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSOW = async (requestId: string) => {
    try {
      await removeSOWFromSignatureRequest(requestId);
      setSignatureRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, sow_document_id: undefined } : req
      ));

      toast({
        title: "SOW Removed",
        description: "SOW has been removed from this signature request.",
      });
    } catch (error) {
      console.error('Error removing SOW:', error);
      toast({
        title: "Remove Failed",
        description: "Could not remove the SOW from this request.",
        variant: "destructive",
      });
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(signatureRequests.filter(request => request.sow_document_id || request.nda_document_id).length / requestsPerPage);
  const startIndex = (currentPage - 1) * requestsPerPage;
  const endIndex = startIndex + requestsPerPage;
  const filteredRequests = signatureRequests.filter(request => request.sow_document_id || request.nda_document_id);
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusStats = () => {
    const stats = {
      sent: signatureRequests.filter(r => r.status === 'sent').length,
      viewed: signatureRequests.filter(r => r.status === 'viewed').length,
      signed: signatureRequests.filter(r => r.status === 'signed').length,
      declined: signatureRequests.filter(r => r.status === 'declined').length,
      total: signatureRequests.length
    };
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="space-y-8">
      {/* NDA Upload Form */}
      {showNdaUploadForm && (
        <Card className="border-2 border-purple-200 bg-purple-50/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>Upload NDA Template</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNdaUploadForm(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <FileUpload
              onFileUpload={handleNdaUpload}
              acceptedTypes={['.pdf', '.docx', '.txt']}
              maxSize={10 * 1024 * 1024} // 10MB
              bucket="kickoff-materials"
            />
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowNdaUploadForm(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {signatureRequests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.sent}</p>
                  <p className="text-sm font-medium text-slate-600">Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.viewed}</p>
                  <p className="text-sm font-medium text-slate-600">Viewed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.signed}</p>
                  <p className="text-sm font-medium text-slate-600">Signed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.declined}</p>
                  <p className="text-sm font-medium text-slate-600">Declined</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signature Requests List */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">E-Signature Requests</CardTitle>
              <CardDescription className="text-base font-medium text-slate-600 mt-2">
                Track and manage document signature requests
                {selectedClient && (
                  <span className="block mt-2 text-blue-600 font-semibold">
                    Client: {selectedClient.name}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowNdaUploadForm(true)}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                <span>Upload NDA Template</span>
              </Button>
              {onSendNewRequest && (
                <Button
                  onClick={onSendNewRequest}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Send New Request</span>
                </Button>
              )}
              {filteredRequests.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="text-sm font-semibold px-4 py-2">
                    {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
                  </Badge>
                  {totalPages > 1 && (
                    <Badge variant="outline" className="text-sm font-semibold px-4 py-2">
                      Page {currentPage} of {totalPages}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-slate-600">Loading signature requests...</span>
              </div>
            </div>
          ) : signatureRequests.filter(request => request.sow_document_id || request.nda_document_id).length === 0 ? (
            <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <PenTool className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="font-semibold text-lg text-slate-700">No signature requests yet</p>
              <p className="text-sm mt-1">Send your first document for e-signature to get started</p>
              {onSendNewRequest && (
                <Button
                  onClick={onSendNewRequest}
                  className="mt-6 flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Send First Request</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Signature Request Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentRequests.map((request) => {
                const config = statusConfig[request.status];
                const StatusIcon = config.icon;
                
                return (
                  <Card
                    key={request.id}
                    className="border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-slate-50 hover:scale-[1.02] group"
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                              <PenTool className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors duration-300">
                                {request.recipient_name}
                              </h3>
                              <p className="text-sm text-slate-600 truncate flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{request.recipient_email}</span>
                              </p>
                            </div>
                          </div>
                          <Badge className={config.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        {/* Documents */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {request.sow_document_id && (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-semibold text-emerald-700">
                                <FileText className="w-3 h-3" />
                                <span>SOW</span>
                              </div>
                            )}
                            {request.nda_document_id && (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-md text-xs font-semibold text-purple-700">
                                <Shield className="w-3 h-3" />
                                <span>NDA</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Date */}
                        <div className="text-xs text-slate-500 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Sent: {formatDate(request.created_at)}</span>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          {request.signed_document_url && (
                            <Button
                              onClick={() => window.open(request.signed_document_url, '_blank')}
                              variant="outline"
                              size="sm"
                              className="w-full text-emerald-600 border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download Signed
                            </Button>
                          )}
                          
                          {/* Status Update Buttons (for development/testing) */}
                          {request.status === 'sent' && (
                            <div className="flex space-x-1">
                              <Button
                                onClick={() => handleStatusUpdate(request.id, 'viewed')}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-purple-600 border-purple-300 hover:text-purple-700 hover:bg-purple-50 text-xs font-semibold"
                              >
                                Mark Viewed
                              </Button>
                              <Button
                                onClick={() => handleStatusUpdate(request.id, 'signed')}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-emerald-600 border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                              >
                                Mark Signed
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-2 h-10 px-4 font-semibold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => handlePageChange(page)}
                        className={`h-10 w-10 p-0 font-bold rounded-xl transition-all duration-300 ${
                          currentPage === page 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                            : 'border-2 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-2 h-10 px-4 font-semibold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}