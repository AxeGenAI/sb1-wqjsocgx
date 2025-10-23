import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Calendar, Clock, ArrowRight, FileText, Users, Briefcase, Upload, Image, X } from 'lucide-react';
import { type Client, updateClient, uploadFile } from '@/lib/supabase';
import { FileUpload } from './FileUpload';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ClientOverviewPanelProps {
  selectedClient: Client;
  onProceed: () => void;
  onClientUpdate?: (updatedClient: Client) => void;
}

export function ClientOverviewPanel({ selectedClient, onProceed, onClientUpdate }: ClientOverviewPanelProps) {
  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const { toast } = useToast();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const fileName = `${selectedClient.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
      const uploadResult = await uploadFile(file, 'client-logos', fileName);
      
      const updatedClient = await updateClient(selectedClient.id, {
        logo_url: uploadResult.publicUrl
      });
      
      if (onClientUpdate) {
        onClientUpdate(updatedClient);
      }
      
      setShowLogoUpload(false);
      
      toast({
        title: "Logo Uploaded Successfully",
        description: "Client logo has been updated and will appear in their dashboard.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload the logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const updatedClient = await updateClient(selectedClient.id, {
        logo_url: undefined
      });
      
      if (onClientUpdate) {
        onClientUpdate(updatedClient);
      }
      
      toast({
        title: "Logo Removed",
        description: "Client logo has been removed from their dashboard.",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Remove Failed",
        description: "Failed to remove the logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Client Information */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <Briefcase className="w-6 h-6 text-blue-600" />
              <span>Client Information</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600 mt-2">
              Key details and engagement overview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pb-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                    {selectedClient.logo_url ? (
                      <img 
                        src={selectedClient.logo_url} 
                        alt={`${selectedClient.name} logo`}
                        className="w-12 h-12 object-contain rounded-xl bg-white border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Client Name</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">{selectedClient.name}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold px-4 py-2">
                  Active
                </Badge>
              </div>

              {/* Logo Management Section */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <Image className="w-5 h-5 text-blue-600" />
                    <span>Client Logo</span>
                  </h4>
                  {selectedClient.logo_url && !showLogoUpload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove Logo
                    </Button>
                  )}
                </div>
                
                {selectedClient.logo_url && !showLogoUpload ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-blue-200">
                      <img 
                        src={selectedClient.logo_url} 
                        alt={`${selectedClient.name} logo`}
                        className="w-16 h-16 object-contain rounded-lg bg-slate-50 border border-slate-200"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">Logo uploaded</p>
                        <p className="text-sm text-slate-600">This logo will appear in the client dashboard</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowLogoUpload(true)}
                      className="w-full text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Replace Logo
                    </Button>
                  </div>
                ) : showLogoUpload ? (
                  <div className="space-y-4">
                    <FileUpload
                      onFileUpload={handleLogoUpload}
                      acceptedTypes={['.png', '.jpg', '.jpeg', '.svg']}
                      maxSize={2 * 1024 * 1024} // 2MB
                      bucket="client-logos"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setShowLogoUpload(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Image className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 mb-4">No logo uploaded yet</p>
                    <Button
                      onClick={() => setShowLogoUpload(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Client Logo
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Client Since</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{formatDate(selectedClient.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide">Last Updated</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">{getTimeAgo(selectedClient.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Overview */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Engagement Overview</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600 mt-2">
              Your dedicated team and next steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pb-10">
            <div className="space-y-6">
              {/* Team Section */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Internal Team Status</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">PM</span>
                    </div>
                    <span className="text-base font-semibold text-slate-800">Project Manager ready to assign</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-600">SA</span>
                    </div>
                    <span className="text-base font-semibold text-slate-800">Senior Analyst available for assignment</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">SME</span>
                    </div>
                    <span className="text-base font-semibold text-slate-800">Subject Matter Expert pool accessible</span>
                  </div>
                </div>
              </div>

              {/* Next Steps Preview */}
              <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span>Onboarding Process</span>
                </h4>
                <div className="space-y-3 text-base font-medium text-slate-700">
                  <p>• Upload client's Statement of Work for AI analysis</p>
                  <p>• AI-powered content generation and personalization</p>
                  <p>• Review and customize generated onboarding materials</p>
                  <p>• Finalize and deliver comprehensive client package</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}