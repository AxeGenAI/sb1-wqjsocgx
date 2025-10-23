import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  PenTool, 
  FileText, 
  Shield, 
  CheckCircle2, 
  ExternalLink,
  User,
  Mail,
  Calendar,
  Building2,
  Download,
  Loader2,
  AlertCircle,
  Lock,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SignatureRequestData {
  id: string;
  client_id: string;
  sow_document_id?: string;
  nda_document_id?: string;
  recipient_name: string;
  recipient_email: string;
  status: string;
  created_at: string;
  client: {
    name: string;
    logo_url?: string;
  };
  sow_document?: {
    id: string;
    file_name: string;
    file_size: number;
    document_path: string;
  };
  nda_document?: {
    id: string;
    file_name: string;
    file_size: number;
    document_path: string;
  };
}

interface SignDocumentPageProps {
  requestId: string;
}

export function SignDocumentPage({ requestId }: SignDocumentPageProps) {
  const [signatureRequest, setSignatureRequest] = useState<SignatureRequestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [typedSignature, setTypedSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [entityName, setEntityName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [sowUrl, setSowUrl] = useState<string | null>(null);
  const [ndaUrl, setNdaUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchSignatureRequest();
  }, [requestId]);

  const fetchSignatureRequest = async () => {
    setIsLoading(true);
    try {
      // Fetch signature request with related data
      const { data: request, error: requestError } = await supabase
        .from('signature_requests')
        .select(`
          *,
          client:clients(name, logo_url)
        `)
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        throw new Error('Signature request not found');
      }

      // Fetch SOW document if exists
      let sowDocument = null;
      if (request.sow_document_id) {
        const { data: sow, error: sowError } = await supabase
          .from('client_documents')
          .select('*')
          .eq('id', request.sow_document_id)
          .single();

        if (!sowError && sow) {
          sowDocument = sow;
          // Get signed URL for SOW
          const { data: sowUrlData, error: sowUrlError } = await supabase.storage
            .from('sow-documents')
            .createSignedUrl(sow.document_path, 3600); // 1 hour expiry
          
          if (sowUrlError) {
            console.error('Error creating SOW signed URL:', sowUrlError);
            toast({
              title: "Document Access Error",
              description: "Could not generate access URL for SOW document.",
              variant: "destructive",
            });
          } else {
            setSowUrl(sowUrlData?.signedUrl || null);
          }
        }
      }

      // Fetch NDA document if exists
      let ndaDocument = null;
      if (request.nda_document_id) {
        const { data: nda, error: ndaError } = await supabase
          .from('universal_documents')
          .select('*')
          .eq('id', request.nda_document_id)
          .single();

        if (!ndaError && nda) {
          ndaDocument = nda;
          // Get signed URL for NDA
          const { data: ndaUrlData, error: ndaUrlError } = await supabase.storage
            .from('kickoff-materials')
            .createSignedUrl(nda.document_path, 3600); // 1 hour expiry
          
          if (ndaUrlError) {
            console.error('Error creating NDA signed URL:', ndaUrlError);
            toast({
              title: "Document Access Error", 
              description: "Could not generate access URL for NDA document.",
              variant: "destructive",
            });
          } else {
            setNdaUrl(ndaUrlData?.signedUrl || null);
          }
        }
      }

      setSignatureRequest({
        ...request,
        sow_document: sowDocument,
        nda_document: ndaDocument
      });

      // Mark as viewed if not already
      if (request.status === 'sent') {
        await supabase
          .from('signature_requests')
          .update({ status: 'viewed' })
          .eq('id', requestId);
      }

    } catch (error) {
      console.error('Error fetching signature request:', error);
      toast({
        title: "Failed to Load Signature Request",
        description: "Could not retrieve the signature request details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    if (!typedSignature.trim() || !agreedToTerms || !entityName.trim() || !signerTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and agree to the terms.",
        variant: "destructive",
      });
      return;
    }

    setIsSigning(true);
    try {
      // Call the Edge Function to process the signed document
      const { data, error } = await supabase.functions.invoke('process-signed-document', {
        body: {
          requestId,
          signerName: typedSignature.trim(),
          entityName: entityName.trim(),
          signerTitle: signerTitle.trim(),
          signedAt: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw error;
      }

      if (data && data.error) {
        console.error('Document processing error:', data.error);
        throw new Error(`Document processing failed: ${data.error}`);
      }

      toast({
        title: "Document Signed Successfully!",
        description: "Your signature has been recorded and the signed document is being prepared for download.",
      });

      // Refresh the data to show the signed status
      await fetchSignatureRequest();

    } catch (error) {
      console.error('Error signing document:', error);
      toast({
        title: "Signing Failed",
        description: "Could not complete the signature process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleDecline = async () => {
    setIsSigning(true);
    try {
      const { error } = await supabase
        .from('signature_requests')
        .update({
          status: 'declined',
          signed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      toast({
        title: "Document Declined",
        description: "You have declined to sign this document. The sender has been notified.",
      });

      // Refresh the data to show the declined status
      await fetchSignatureRequest();

    } catch (error) {
      console.error('Error declining document:', error);
      toast({
        title: "Decline Failed",
        description: "Could not process the decline. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xl font-medium text-slate-600">Loading signature request...</span>
        </div>
      </div>
    );
  }

  if (!signatureRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <Card className="max-w-md border-2 border-red-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Request Not Found</h2>
            <p className="text-red-700">
              The signature request you're looking for could not be found or may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAlreadySigned = signatureRequest.status === 'signed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <CardHeader className="text-center pb-8">
            <div className="flex items-center justify-center space-x-4 mb-6">
              {signatureRequest.client.logo_url ? (
                <img 
                  src={signatureRequest.client.logo_url} 
                  alt={`${signatureRequest.client.name} logo`}
                  className="w-16 h-16 object-contain rounded-xl bg-white border-2 border-slate-200 shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                <PenTool className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold text-slate-900 mb-4">
              {isAlreadySigned ? 'Document Signed' : 'Document Signature Request'}
            </CardTitle>
            <CardDescription className="text-xl font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {isAlreadySigned 
                ? `This document has been successfully signed by ${signatureRequest.recipient_name}`
                : `${signatureRequest.client.name} has requested your signature on the following document(s)`
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Recipient Information */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <User className="w-6 h-6 text-blue-600" />
              <span>Recipient Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <User className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Recipient</p>
                  <p className="text-lg font-bold text-slate-900">{signatureRequest.recipient_name}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                <Mail className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Email</p>
                  <p className="text-lg font-bold text-slate-900">{signatureRequest.recipient_email}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents to Sign - Only show before signing */}
        {['draft', 'sent', 'viewed'].includes(signatureRequest.status) && (
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <span>Documents for Signature</span>
              </CardTitle>
              <CardDescription className="text-base font-medium text-slate-600">
                Please review the following document(s) before signing
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="space-y-6">
                {signatureRequest.sow_document && (
                  <div className="p-6 border-2 border-emerald-200 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-emerald-900">Statement of Work</h3>
                          <p className="text-emerald-700 font-medium">
                            {signatureRequest.sow_document.file_name} • {formatFileSize(signatureRequest.sow_document.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!sowUrl && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Access Error
                          </Badge>
                        )}
                        <Button
                          onClick={() => sowUrl ? window.open(sowUrl, '_blank') : toast({
                            title: "Document Unavailable",
                            description: "Could not access the SOW document. Please contact support.",
                            variant: "destructive",
                          })}
                          disabled={!sowUrl}
                          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Document</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {signatureRequest.nda_document && (
                  <div className="p-6 border-2 border-purple-200 rounded-2xl bg-gradient-to-r from-purple-50 to-purple-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-purple-900">Non-Disclosure Agreement</h3>
                          <p className="text-purple-700 font-medium">
                            {signatureRequest.nda_document.file_name} • {formatFileSize(signatureRequest.nda_document.file_size)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!ndaUrl && (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Access Error
                          </Badge>
                        )}
                        <Button
                          onClick={() => ndaUrl ? window.open(ndaUrl, '_blank') : toast({
                            title: "Document Unavailable",
                            description: "Could not access the NDA document. Please contact support.",
                            variant: "destructive",
                          })}
                          disabled={!ndaUrl}
                          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Document</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        {/* Signature Section */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <PenTool className="w-6 h-6 text-blue-600" />
              <span>{isAlreadySigned ? 'Signature Complete' : 'Electronic Signature'}</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600">
              {isAlreadySigned 
                ? 'This document has been successfully signed'
                : 'Please provide your electronic signature to complete the process'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            {isAlreadySigned ? (
              <div className="space-y-6">
                <div className="p-8 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-emerald-900 mb-4">Document Successfully Executed</h3>
                  <div className="space-y-4 mb-6">
                    <p className="text-emerald-800 text-lg font-medium leading-relaxed">
                      Your electronic signature has been successfully captured and recorded. By providing your digital signature through the typed execution of your legal name, you have authorized this document with the full legal weight and binding authority equivalent to a handwritten signature.
                    </p>
                    <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl">
                      <p className="text-emerald-900 text-base font-semibold leading-relaxed">
                        This electronically signed document constitutes a legally binding agreement and carries the same enforceability as traditional ink-and-paper execution under applicable electronic signature legislation.
                      </p>
                    </div>
                  </div>
                  <p className="text-emerald-700 text-lg font-medium">
                    Signed by: <strong>{signatureRequest.signer_typed_signature}</strong>
                  </p>
                  <p className="text-emerald-600 text-base mt-2">
                    Executed on: {formatDate(signatureRequest.signed_at || signatureRequest.updated_at)}
                  </p>
                  
                  {/* Download Signed Document Button */}
                  {signatureRequest.signed_document_url && (
                    <div className="mt-6">
                      <Button
                        onClick={() => window.open(signatureRequest.signed_document_url, '_blank')}
                        className="flex items-center space-x-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Signed Document</span>
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-lg font-semibold px-6 py-3">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Signature Complete
                  </Badge>
                </div>
              </div>
            ) : signatureRequest.status === 'declined' ? (
              <div className="space-y-6">
                <div className="p-8 bg-gradient-to-r from-red-50 to-red-50 rounded-2xl border-2 border-red-200 text-center">
                  <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-red-900 mb-2">Document Declined</h3>
                  <p className="text-red-700 text-lg font-medium">
                    You have declined to execute this document.
                  </p>
                  <p className="text-red-600 text-base mt-2">
                    Declined on: {formatDate(signatureRequest.signed_at || signatureRequest.updated_at)}
                  </p>
                </div>
                
                <div className="text-center">
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-lg font-semibold px-6 py-3">
                    <XCircle className="w-5 h-5 mr-2" />
                    Document Declined
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Important Notice */}
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <Lock className="w-6 h-6 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 mb-2">Electronic Signature Authorization Notice</p>
                      <p className="text-amber-800 text-sm leading-relaxed">
                        By providing your electronic signature below, you acknowledge that you have thoroughly reviewed, understood, and agree to be legally bound by all terms, conditions, and obligations outlined in the document(s) above. You are hereby authorized to use your digital signature as a legally binding execution method. Your electronic signature, executed through the typed entry of your legal name, carries the full legal authority, validity, and binding effect of a traditional handwritten signature under applicable electronic signature legislation, including but not limited to the Electronic Signatures in Global and National Commerce Act (E-SIGN) and the Uniform Electronic Transactions Act (UETA).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Entity and Signer Information */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="entityName" className="text-lg font-bold text-slate-900">
                        Entity/Company Name *
                      </Label>
                      <Input
                        id="entityName"
                        value={entityName}
                        onChange={(e) => setEntityName(e.target.value)}
                        placeholder="Your Company Name, LLC"
                        className="h-14 text-lg font-medium border-2 focus:border-blue-500 bg-white shadow-sm"
                        disabled={isSigning}
                      />
                      <p className="text-sm text-slate-500">
                        This will be inserted into the NDA as the contracting entity
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="signerTitle" className="text-lg font-bold text-slate-900">
                        Your Title *
                      </Label>
                      <Input
                        id="signerTitle"
                        value={signerTitle}
                        onChange={(e) => setSignerTitle(e.target.value)}
                        placeholder="Chief Executive Officer"
                        className="h-14 text-lg font-medium border-2 focus:border-blue-500 bg-white shadow-sm"
                        disabled={isSigning}
                      />
                      <p className="text-sm text-slate-500">
                        Your official title within the organization
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="signature" className="text-lg font-bold text-slate-900">
                      Your Full Legal Name *
                    </Label>
                    <Input
                      id="signature"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Your Full Legal Name"
                      className="h-14 text-lg font-medium border-2 focus:border-blue-500 bg-white shadow-sm"
                      disabled={isSigning}
                    />
                    <p className="text-sm text-slate-500">
                      This will serve as your binding electronic signature
                    </p>
                  </div>

                  {/* Agreement Checkbox */}
                  <div className="flex items-start space-x-3 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                      disabled={isSigning}
                      className="mt-1"
                    />
                    <Label htmlFor="terms" className="text-base text-slate-700 leading-relaxed cursor-pointer">
                      I hereby acknowledge that I have thoroughly reviewed and comprehensively understood all provisions within the document(s) referenced above, and I voluntarily agree to be legally bound by all terms, conditions, and obligations contained therein. I understand and confirm that my typed legal name constitutes my electronic signature and carries the full legal authority, validity, and enforceability of a traditional handwritten signature under applicable law. I am authorized to execute this document on behalf of the entity specified above, and I acknowledge that this electronic signature will be legally sufficient and enforceable in all jurisdictions where this agreement may be subject to legal proceedings.
                    </Label>
                  </div>
                </div>

                {/* Sign Button */}
                <div className="text-center space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={handleDecline}
                      disabled={isSigning}
                      variant="outline"
                      className="flex items-center justify-center space-x-3 h-16 px-12 text-lg font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
                    >
                      {isSigning ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6" />
                          <span>Decline Document</span>
                        </>
                      )}
                    </Button>
                    
                  <Button
                    onClick={handleSign}
                    disabled={isSigning || !typedSignature.trim() || !entityName.trim() || !signerTitle.trim() || !agreedToTerms}
                    className="flex items-center justify-center space-x-3 h-16 px-12 text-xl font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
                  >
                    {isSigning ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Processing Document...</span>
                      </>
                    ) : (
                      <>
                        <PenTool className="w-6 h-6" />
                        <span>Sign Document</span>
                      </>
                    )}
                  </Button>
                  </div>
                  
                  <p className="text-sm text-slate-500 max-w-2xl mx-auto">
                    By clicking "Sign Document", you confirm your agreement to all terms and authorize 
                    the creation of a legally binding electronic signature. The document will be automatically 
                    filled with your information and made available for download.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Details */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Request Sent</p>
                  <p className="text-sm text-slate-600">{formatDate(signatureRequest.created_at)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">From</p>
                  <p className="text-sm text-slate-600">{signatureRequest.client.name}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">
            Powered by AxeGen AI • Secure Electronic Signature Platform
          </p>
        </div>
      </div>
    </div>
  );
}