import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PenTool, 
  FileText, 
  Send, 
  Loader2, 
  CheckCircle, 
  Building2, 
  Mail,
  User,
  Shield,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { 
  listClients,
  listClientDocuments,
  listUniversalDocuments,
  createSignatureRequest,
  type Client,
  type UploadedFile,
  type UniversalDocument
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SignatureRequestFormProps {
  onRequestSent?: () => void;
  onBack?: () => void;
}

export function SignatureRequestForm({ onRequestSent, onBack }: SignatureRequestFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [sowDocuments, setSowDocuments] = useState<UploadedFile[]>([]);
  const [ndaDocuments, setNdaDocuments] = useState<UniversalDocument[]>([]);
  const [selectedSOW, setSelectedSOW] = useState<string>('');
  const [selectedNDA, setSelectedNDA] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
    fetchNDADocuments();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchSOWDocuments();
    } else {
      setSowDocuments([]);
      setSelectedSOW('');
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const clientList = await listClients();
      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Failed to Load Clients",
        description: "Could not retrieve client list from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchSOWDocuments = async () => {
    if (!selectedClient) return;
    
    setIsLoadingDocuments(true);
    try {
      const clientSOWs = await listClientDocuments(selectedClient, 'sow');
      setSowDocuments(clientSOWs);
    } catch (error) {
      console.error('Error fetching SOW documents:', error);
      toast({
        title: "Failed to Load SOW Documents",
        description: "Could not retrieve SOW documents for this client.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const fetchNDADocuments = async () => {
    try {
      const universalDocs = await listUniversalDocuments();
      // Filter for NDA documents (you might want to add a document_type field to universal_documents)
      // For now, we'll assume NDAs are identified by filename or you can filter by file type
      const ndaDocs = universalDocs.filter(doc => 
        doc.file_name.toLowerCase().includes('nda') || 
        doc.file_name.toLowerCase().includes('agreement') ||
        doc.file_name.toLowerCase().includes('confidentiality')
      );
      setNdaDocuments(ndaDocs);
    } catch (error) {
      console.error('Error fetching NDA documents:', error);
      toast({
        title: "Failed to Load NDA Documents",
        description: "Could not retrieve NDA templates from database.",
        variant: "destructive",
      });
    }
  };

  const handleSendSignatureRequest = async () => {
    if (!selectedClient || !recipientName.trim() || !recipientEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSOW && !selectedNDA) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document (SOW or NDA) for signature.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await createSignatureRequest(
        selectedClient,
        recipientName.trim(),
        recipientEmail.trim(),
        selectedSOW || undefined,
        selectedNDA || undefined
      );

      toast({
        title: "Signature Request Sent!",
        description: `Signature request has been sent to ${recipientEmail} successfully.`,
      });

      // Reset form
      setSelectedClient('');
      setSelectedSOW('');
      setSelectedNDA('');
      setRecipientName('');
      setRecipientEmail('');

      if (onRequestSent) {
        onRequestSent();
      }
    } catch (error) {
      console.error('Error sending signature request:', error);
      toast({
        title: "Failed to Send Request",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedSOWData = sowDocuments.find(d => d.id === selectedSOW);
  const selectedNDAData = ndaDocuments.find(d => d.id === selectedNDA);

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <PenTool className="w-8 h-8 text-blue-600" />
            <span>Send Documents for E-Signature</span>
          </CardTitle>
          <CardDescription className="text-lg font-medium text-slate-600 mt-3">
            Send SOW and/or NDA documents to clients for electronic signature
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Form */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8 space-y-8">
          {/* Client Selection */}
          <div className="space-y-4">
            <Label className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Select Client</span>
            </Label>
            {isLoadingClients ? (
              <div className="flex items-center space-x-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-slate-600">Loading clients...</span>
              </div>
            ) : (
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-12 text-base border-2 focus:border-blue-500">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center space-x-3">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>{client.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* Document Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SOW Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Statement of Work (Optional)</span>
              </Label>
              
              {selectedClient ? (
                isLoadingDocuments ? (
                  <div className="flex items-center space-x-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-slate-600">Loading SOW documents...</span>
                  </div>
                ) : sowDocuments.length > 0 ? (
                  <Select value={selectedSOW} onValueChange={setSelectedSOW}>
                    <SelectTrigger className="h-12 text-base border-2 focus:border-emerald-500">
                      <SelectValue placeholder="Select SOW document..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sowDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              <span>{doc.name}</span>
                            </div>
                            <span className="text-xs text-slate-500 ml-4">
                              {formatFileSize(doc.size)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                    <p className="text-amber-800 font-medium">No SOW documents found for this client</p>
                    <p className="text-amber-700 text-sm mt-1">Upload a SOW first in the main onboarding flow</p>
                  </div>
                )
              ) : (
                <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-xl text-center">
                  <p className="text-slate-600 font-medium">Select a client first to view available SOW documents</p>
                </div>
              )}

              {selectedSOWData && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-900">{selectedSOWData.name}</p>
                      <p className="text-sm text-emerald-700">{formatFileSize(selectedSOWData.size)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NDA Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span>Non-Disclosure Agreement (Optional)</span>
              </Label>
              
              {ndaDocuments.length > 0 ? (
                <Select value={selectedNDA} onValueChange={setSelectedNDA}>
                  <SelectTrigger className="h-12 text-base border-2 focus:border-purple-500">
                    <SelectValue placeholder="Select NDA template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ndaDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-4 h-4 text-purple-600" />
                            <span>{doc.file_name}</span>
                          </div>
                          <span className="text-xs text-slate-500 ml-4">
                            {formatFileSize(doc.file_size)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl text-center">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
                  <p className="text-amber-800 font-medium">No NDA templates found</p>
                  <p className="text-amber-700 text-sm mt-1">Upload NDA templates in the Document Library first</p>
                </div>
              )}

              {selectedNDAData && (
                <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-semibold text-purple-900">{selectedNDAData.file_name}</p>
                      <p className="text-sm text-purple-700">{formatFileSize(selectedNDAData.file_size)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recipient Information */}
          <div className="space-y-6">
            <Label className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <User className="w-5 h-5 text-blue-600" />
              <span>Recipient Information</span>
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="recipientName" className="text-base font-semibold text-slate-700">
                  Recipient Name *
                </Label>
                <Input
                  id="recipientName"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="John Doe"
                  className="h-12 text-base border-2 focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="recipientEmail" className="text-base font-semibold text-slate-700">
                  Recipient Email *
                </Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="h-12 text-base border-2 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Request Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
                <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <div className="text-lg font-bold text-blue-900">
                  {selectedClientData?.name || 'No client selected'}
                </div>
                <div className="text-sm font-medium text-blue-700">Client</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200">
                <FileText className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                <div className="text-lg font-bold text-emerald-900">
                  {selectedSOW ? '1' : '0'}
                </div>
                <div className="text-sm font-medium text-emerald-700">SOW Document</div>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
                <Shield className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <div className="text-lg font-bold text-purple-900">
                  {selectedNDA ? '1' : '0'}
                </div>
                <div className="text-sm font-medium text-purple-700">NDA Document</div>
              </div>
            </div>

            {/* Selected Documents Preview */}
            {(selectedSOWData || selectedNDAData) && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-900">Documents to be Signed:</h4>
                <div className="space-y-3">
                  {selectedSOWData && (
                    <div className="flex items-center space-x-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <FileText className="w-6 h-6 text-emerald-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-emerald-900">{selectedSOWData.name}</p>
                        <p className="text-sm text-emerald-700">SOW • {formatFileSize(selectedSOWData.size)}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">SOW</Badge>
                    </div>
                  )}
                  
                  {selectedNDAData && (
                    <div className="flex items-center space-x-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <Shield className="w-6 h-6 text-purple-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-purple-900">{selectedNDAData.file_name}</p>
                        <p className="text-sm text-purple-700">NDA • {formatFileSize(selectedNDAData.file_size)}</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">NDA</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recipient Preview */}
            {recipientName && recipientEmail && (
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="text-lg font-semibold text-slate-900 mb-3">Recipient:</h4>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">{recipientName}</p>
                    <p className="text-blue-700 flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{recipientEmail}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="flex items-center space-x-2 h-14 px-8 text-lg font-semibold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300"
              >
                <span>Back</span>
              </Button>
            )}
            
            <Button
              onClick={handleSendSignatureRequest}
              disabled={
                isSending || 
                !selectedClient || 
                !recipientName.trim() || 
                !recipientEmail.trim() || 
                (!selectedSOW && !selectedNDA)
              }
              className="flex items-center justify-center space-x-3 h-14 px-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Sending Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  <span>Send for Signature</span>
                </>
              )}
            </Button>
          </div>

          {/* Important Note */}
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-2">Development Note</p>
                <p className="text-amber-800 text-sm leading-relaxed">
                  This feature is currently in development mode with placeholder e-signature integration. 
                  To enable full functionality, you'll need to integrate with a real e-signature service 
                  like DocuSign, HelloSign, or PandaDoc by updating the Edge Function with their API credentials.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}