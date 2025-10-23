import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, FileText, Settings, Download, RotateCcw, Building2, Mail, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type Client, type OnboardingStep } from '@/lib/supabase';
import { type UploadedFile } from '@/lib/supabase';

interface ReviewPanelProps {
  welcomeMessage: string;
  nextSteps: OnboardingStep[];
  kickoffFiles: UploadedFile[];
  sowFile: UploadedFile | null;
  selectedClient: Client | null;
  onStartNewOnboarding: () => void;
  onGoToProjectDashboard: () => void;
}

export function ReviewPanel({ 
  welcomeMessage, 
  nextSteps, 
  kickoffFiles, 
  sowFile, 
  selectedClient,
  onStartNewOnboarding,
  onGoToProjectDashboard
}: ReviewPanelProps) {
  const completedSteps = nextSteps.filter(step => step.status === 'completed').length;
  const { toast } = useToast();

  const handleSendToClient = () => {
    const documentsCount = kickoffFiles.length;
    
    toast({
      title: "Onboarding Package Sent!",
      description: `Your client onboarding package with ${documentsCount} resource${documentsCount !== 1 ? 's' : ''} has been successfully sent to ${selectedClient?.name}.`,
    });
  };

  const handleExportPackage = () => {
    toast({
      title: "Package Exported!",
      description: "Your onboarding package has been exported and is ready for download.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Email Sent Confirmation */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Successfully Sent!</h2>
              <p className="text-lg font-medium text-slate-600">
                Your client onboarding package has been delivered and engagement tracking is now active.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-900">Delivery Summary</CardTitle>
          <CardDescription className="text-lg font-medium text-slate-600 mt-3">
            Review what was delivered to your client and manage the ongoing project
            {selectedClient && (
              <span className="block mt-3 text-blue-600 font-semibold flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Client: {selectedClient.name}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 shadow-lg">
              <div className="text-4xl font-bold text-purple-600 mb-3">1</div>
              <div className="text-base font-semibold text-purple-800">Client Onboarded</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 shadow-lg">
              <div className="text-4xl font-bold text-blue-600 mb-3">1</div>
              <div className="text-base font-semibold text-blue-800">Email Delivered</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200 shadow-lg">
              <div className="text-4xl font-bold text-emerald-600 mb-3">{nextSteps.length}</div>
              <div className="text-base font-semibold text-emerald-800">Steps Created</div>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200 shadow-lg">
              <div className="text-4xl font-bold text-orange-600 mb-3">{kickoffFiles.length}</div>
              <div className="text-base font-semibold text-orange-800">Resources Shared</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Welcome Message Preview */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome Message</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200">
              <pre className="whitespace-pre-wrap text-base text-slate-900 font-sans leading-relaxed">
                {welcomeMessage || 'No message generated yet'}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps Preview */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-slate-900">Next Steps</CardTitle>
              <Badge variant="secondary" className="text-base font-semibold px-4 py-2">
                {completedSteps}/{nextSteps.length} Complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-5">
              {nextSteps.length > 0 ? (
                nextSteps.map((step) => (
                  <div key={step.id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                    )}
                    <span className={`text-base font-medium ${step.status === 'completed' ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                      {step.title}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-base font-medium text-center py-12">No onboarding steps defined yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">Attached Documents</CardTitle>
        </CardHeader>
        <CardContent className="pb-10">
          <div className="space-y-8">
            {/* Client Resources */}
            {kickoffFiles.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-4 text-lg">Client Resources</h4>
                <div className="space-y-4">
                  {kickoffFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-6 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200">
                      <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-lg">{file.name}</p>
                        <p className="text-base font-medium text-slate-500 mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {kickoffFiles.length === 0 && (
              <p className="text-slate-500 text-base font-medium text-center py-12">No documents attached</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardContent className="p-10">
          <div className="space-y-6">
            {/* What's Next Section */}
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-bold text-slate-900">What's Next?</h3>
              <p className="text-lg font-medium text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Your client has received their onboarding package and project tracking is now active. 
                You can manage the ongoing project, track progress, and coordinate with your team.
              </p>
            </div>

            {/* Primary Action */}
            <div className="flex flex-col sm:flex-row gap-6">
              <Button 
                onClick={onGoToProjectDashboard}
                className="flex-1 flex items-center justify-center space-x-3 h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                size="lg"
              >
                <Settings className="w-6 h-6" />
                <span>Manage Project</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportPackage} 
                className="flex-1 flex items-center justify-center space-x-3 h-16 text-xl font-bold border-2 rounded-2xl hover:bg-slate-50 transition-all duration-300 hover:scale-[1.02]"
                size="lg"
              >
                <Download className="w-6 h-6" />
                <span>Export Package</span>
              </Button>
            </div>
            
            <Separator className="my-8" />
            
            {/* Secondary Action */}
            <div className="text-center">
              <Button 
                variant="outline"
                onClick={onStartNewOnboarding}
                className="flex items-center space-x-3 text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm hover:shadow-md font-semibold text-base px-6 py-3 rounded-xl transition-all duration-300"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Start New Onboarding</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}