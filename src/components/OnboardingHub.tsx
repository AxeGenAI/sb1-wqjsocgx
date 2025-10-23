import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Eye, 
  Upload, 
  Sparkles, 
  Edit3, 
  Mail, 
  CheckCircle, 
  Home,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  MessageSquare,
  Send,
  Settings
} from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import { ClientOverviewPanel } from './ClientOverviewPanel';
import { SOWSelector } from './SOWSelector';
import { MessageEditor } from './MessageEditor';
import { NextStepsEditor } from './NextStepsEditor';
import { DocumentLibrary } from './DocumentLibrary';
import { EmailClientForm } from './EmailClientForm';
import { ReviewPanel } from './ReviewPanel';
import { generateWelcomeContent, extractTextFromFile } from '@/lib/openai';
import { 
  uploadFile, 
  associateDocumentWithClient, 
  createOnboardingStep,
  deleteAllOnboardingSteps,
  createUniversalDocument,
  type Client, 
  type OnboardingStep,
  type UploadedFile 
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type OnboardingStep = 'selectClient' | 'clientOverview' | 'uploadSOW' | 'generateContent' | 'editMessage' | 'sendEmail' | 'reviewFinalize';

interface OnboardingHubProps {
  onBackToHome: () => void;
  onGoToProjectDashboard: () => void;
}

const navigationItems = [
  { id: 'selectClient', icon: Building2, label: 'Select Client', description: 'Choose or create a client' },
  { id: 'clientOverview', icon: Eye, label: 'Client Overview', description: 'Review client details' },
  { id: 'uploadSOW', icon: Upload, label: 'Upload SOW', description: 'Statement of Work' },
  { id: 'generateContent', icon: Sparkles, label: 'Generate Content', description: 'AI-powered content creation' },
  { id: 'editMessage', icon: Edit3, label: 'Edit Content', description: 'Customize message & steps' },
  { id: 'sendEmail', icon: Mail, label: 'Send Email', description: 'Deliver to client' },
  { id: 'reviewFinalize', icon: CheckCircle, label: 'Review & Finalize', description: 'Complete onboarding' }
];

export function OnboardingHub({ onBackToHome, onGoToProjectDashboard }: OnboardingHubProps) {
  // Onboarding state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('selectClient');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sowFile, setSowFile] = useState<UploadedFile | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [nextSteps, setNextSteps] = useState<OnboardingStep[]>([]);
  const [kickoffFiles, setKickoffFiles] = useState<UploadedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toast } = useToast();

  // Reset function for all onboarding state
  const handleResetOnboarding = () => {
    setSelectedClient(null);
    setSowFile(null);
    setWelcomeMessage('');
    setNextSteps([]);
    setKickoffFiles([]);
    setCurrentStep('selectClient');
  };

  const handleStartNewOnboarding = () => {
    handleResetOnboarding();
  };

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setCurrentStep('clientOverview');
    }
  };

  const handleProceedToUpload = () => {
    setCurrentStep('uploadSOW');
  };

  const handleSOWUpload = async (file: File) => {
    if (!selectedClient) {
      toast({
        title: "No Client Selected",
        description: "Please select a client first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `${selectedClient.id}/${Date.now()}-${file.name}`;
      const uploadResult = await uploadFile(file, 'sow-documents', fileName);
      
      const documentRecord = await associateDocumentWithClient(
        selectedClient.id,
        fileName,
        'sow',
        file.name,
        file.size,
        file.type
      );

      const uploadedFile: UploadedFile = {
        id: documentRecord.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: uploadResult.publicUrl,
        path: fileName,
        created_at: new Date().toISOString()
      };

      setSowFile(uploadedFile);
      setCurrentStep('generateContent');

      toast({
        title: "SOW Uploaded Successfully",
        description: "Your Statement of Work has been uploaded and is ready for analysis.",
      });
    } catch (error) {
      console.error('Error uploading SOW:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload the SOW. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectExistingSOW = (file: UploadedFile) => {
    setSowFile(file);
    setCurrentStep('generateContent');
    
    toast({
      title: "SOW Selected",
      description: "Existing SOW has been selected for analysis.",
    });
  };

  const handleGenerateContent = async () => {
    if (!sowFile || !selectedClient) {
      toast({
        title: "Missing Information",
        description: "Please ensure a client is selected and SOW is uploaded.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const fileContent = await extractTextFromFile(new File([], sowFile.name));
      const generatedContent = await generateWelcomeContent(fileContent);
      
      setWelcomeMessage(generatedContent.welcomeMessage);
      
      // Clear existing steps before creating new ones
      await deleteAllOnboardingSteps(selectedClient.id);
      
      // Create new onboarding steps
      const createdSteps = await Promise.all(
        generatedContent.nextSteps.map(async (step, index) => {
          return await createOnboardingStep({
            client_id: selectedClient.id,
            title: step.title,
            description: step.description,
            status: 'not_started',
            order_index: index,
            client_visible: true
          });
        })
      );
      
      setNextSteps(createdSteps);
      setCurrentStep('editMessage');

      toast({
        title: "Content Generated Successfully",
        description: "AI has generated personalized welcome content for your client.",
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMessageChange = (message: string) => {
    setWelcomeMessage(message);
  };

  const handleNextStepsChange = (steps: OnboardingStep[]) => {
    setNextSteps(steps);
  };

  const handleProceedToEmail = () => {
    setCurrentStep('sendEmail');
  };

  const handleEmailSent = () => {
    setCurrentStep('reviewFinalize');
  };

  const handleKickoffFileUpload = async (file: File) => {
    if (!selectedClient) {
      toast({
        title: "No Client Selected",
        description: "Please select a client first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const newUniversalDoc = await createUniversalDocument(file, 'kickoff-materials', fileName);
      
      const uploadedFile: UploadedFile = {
        id: newUniversalDoc.id,
        name: newUniversalDoc.file_name,
        size: newUniversalDoc.file_size,
        type: newUniversalDoc.file_type,
        url: newUniversalDoc.url || '',
        path: newUniversalDoc.document_path,
        created_at: newUniversalDoc.created_at
      };

      setKickoffFiles(prev => [...prev, uploadedFile]);

      toast({
        title: "File Uploaded Successfully",
        description: `${file.name} has been added to your universal resource library.`,
      });
    } catch (error) {
      console.error('Error uploading kickoff file:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKickoffFileRemove = (fileId: string) => {
    setKickoffFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleKickoffFileSelect = (file: UploadedFile) => {
    setKickoffFiles(prev => {
      const exists = prev.some(f => f.id === file.id);
      if (exists) return prev;
      return [...prev, file];
    });
  };

  const getStepNumber = (step: OnboardingStep): number => {
    const stepOrder: OnboardingStep[] = ['selectClient', 'clientOverview', 'uploadSOW', 'generateContent', 'editMessage', 'sendEmail', 'reviewFinalize'];
    return stepOrder.indexOf(step) + 1;
  };

  const getProgressPercentage = (): number => {
    const totalSteps = 7;
    const currentStepNumber = getStepNumber(currentStep);
    return Math.round((currentStepNumber / totalSteps) * 100);
  };

  const getStepStatus = (stepId: string) => {
    const currentStepNumber = getStepNumber(currentStep);
    const stepNumber = getStepNumber(stepId as OnboardingStep);
    
    if (stepNumber < currentStepNumber) return 'completed';
    if (stepNumber === currentStepNumber) return 'current';
    return 'upcoming';
  };

  const canAccessStep = (stepId: string): boolean => {
    switch (stepId) {
      case 'selectClient':
        return true;
      case 'clientOverview':
        return !!selectedClient;
      case 'uploadSOW':
        return !!selectedClient;
      case 'generateContent':
        return !!selectedClient && !!sowFile;
      case 'editMessage':
        return !!selectedClient && !!sowFile && !!welcomeMessage;
      case 'sendEmail':
        return !!selectedClient && !!sowFile && !!welcomeMessage && nextSteps.length > 0;
      case 'reviewFinalize':
        return !!selectedClient && !!sowFile && !!welcomeMessage && nextSteps.length > 0;
      default:
        return false;
    }
  };

  const handleNavigationClick = (stepId: string) => {
    if (canAccessStep(stepId)) {
      setCurrentStep(stepId as OnboardingStep);
    } else {
      toast({
        title: "Step Not Available",
        description: "Please complete the previous steps first.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex">
        {/* Left Navigation Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Client Onboarding</h2>
                <p className="text-sm font-medium text-slate-600">Intelligent client integration</p>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Progress</span>
                <Badge variant="secondary" className="text-xs font-bold">
                  {getProgressPercentage()}%
                </Badge>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const status = getStepStatus(item.id);
              const canAccess = canAccessStep(item.id);
              const Icon = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigationClick(item.id)}
                  disabled={!canAccess}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                    status === 'current'
                      ? 'bg-blue-100 border-2 border-blue-300 shadow-lg'
                      : status === 'completed'
                      ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                      : canAccess
                      ? 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                      : 'opacity-50 cursor-not-allowed border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      status === 'current'
                        ? 'bg-blue-200'
                        : status === 'completed'
                        ? 'bg-emerald-200'
                        : canAccess
                        ? 'bg-slate-100'
                        : 'bg-slate-50'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        status === 'current'
                          ? 'text-blue-700'
                          : status === 'completed'
                          ? 'text-emerald-700'
                          : canAccess
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${
                        status === 'current'
                          ? 'text-blue-900'
                          : status === 'completed'
                          ? 'text-emerald-900'
                          : canAccess
                          ? 'text-slate-900'
                          : 'text-slate-500'
                      }`}>
                        {item.label}
                      </p>
                      <p className={`text-xs ${
                        status === 'current'
                          ? 'text-blue-700'
                          : status === 'completed'
                          ? 'text-emerald-700'
                          : canAccess
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                    {status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-slate-200 space-y-3">
            <Button
              variant="outline"
              onClick={onBackToHome}
              className="w-full flex items-center justify-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleResetOnboarding}
              className="w-full flex items-center justify-center space-x-2 text-orange-600 border-orange-300 hover:text-orange-700 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Process</span>
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 space-y-8">
          {/* Header */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold text-slate-900">
                    {navigationItems.find(item => item.id === currentStep)?.label || 'Client Onboarding'}
                  </CardTitle>
                  <CardDescription className="text-lg font-medium text-slate-600 mt-2">
                    {navigationItems.find(item => item.id === currentStep)?.description || 'Intelligent client integration workflow'}
                    {selectedClient && (
                      <span className="block mt-2 text-blue-600 font-semibold">
                        Client: {selectedClient.name}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg font-bold px-4 py-2">
                  Step {getStepNumber(currentStep)} of 7
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Step Content */}
          <div className="space-y-8">
            {currentStep === 'selectClient' && (
              <ClientSelector 
                selectedClient={selectedClient} 
                onClientSelect={handleClientSelect} 
              />
            )}

            {currentStep === 'clientOverview' && selectedClient && (
              <div className="space-y-8">
                {/* Ready to Begin Onboarding Section */}
                <div className="p-12 bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-2xl shadow-xl">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto shadow-lg">
                      {selectedClient.logo_url ? (
                        <img 
                          src={selectedClient.logo_url} 
                          alt={`${selectedClient.name} logo`}
                          className="w-20 h-20 object-contain rounded-2xl bg-white border-2 border-slate-200"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
                          <Building2 className="w-10 h-10 text-blue-600" />
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleProceedToUpload}
                      className="flex items-center justify-center space-x-3 h-16 px-12 text-xl font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                      size="lg"
                    >
                      <span>Upload Statement of Work</span>
                      <ArrowRight className="w-6 h-6" />
                    </Button>
                  </div>
                </div>

                <ClientOverviewPanel 
                  selectedClient={selectedClient} 
                  onProceed={handleProceedToUpload} 
                  onClientUpdate={(updatedClient) => setSelectedClient(updatedClient)}
                />
              </div>
            )}

            {currentStep === 'uploadSOW' && (
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                    <Upload className="w-6 h-6 text-blue-600" />
                    <span>Statement of Work Management</span>
                  </CardTitle>
                  <CardDescription className="text-base font-medium text-slate-600 mt-2">
                    Select an existing SOW or upload a new Statement of Work for AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                  <SOWSelector
                    selectedClient={selectedClient}
                    sowFile={sowFile}
                    onSOWUpload={handleSOWUpload}
                    onSelectExistingSOW={handleSelectExistingSOW}
                  />
                </CardContent>
              </Card>
            )}

            {currentStep === 'generateContent' && (
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <span>AI Content Generation</span>
                  </CardTitle>
                  <CardDescription className="text-base font-medium text-slate-600 mt-2">
                    Let AI analyze your SOW and generate personalized welcome content
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                  <div className="text-center space-y-8">
                    {sowFile && (
                      <div className="p-8 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200">
                        <div className="flex items-center justify-center space-x-4 mb-4">
                          <CheckCircle className="w-8 h-8 text-emerald-600" />
                          <span className="text-xl font-bold text-emerald-900">SOW Ready for Analysis</span>
                        </div>
                        <p className="text-base font-medium text-emerald-700">
                          {sowFile.name} • {(sowFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleGenerateContent}
                      disabled={isGenerating || !sowFile}
                      className="flex items-center justify-center space-x-3 h-16 px-12 text-xl font-bold bg-purple-600 hover:bg-purple-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating Content...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          <span>Generate Welcome Content</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStep === 'editMessage' && (
              <div className="space-y-8">
                <MessageEditor 
                  message={welcomeMessage} 
                  onMessageChange={handleMessageChange} 
                />
                
                <NextStepsEditor 
                  nextSteps={nextSteps} 
                  onNextStepsChange={handleNextStepsChange}
                  selectedClient={selectedClient}
                />
                
                <DocumentLibrary 
                  files={kickoffFiles}
                  onFilesUpload={handleKickoffFileUpload}
                  onFileRemove={handleKickoffFileRemove}
                  onFileSelect={handleKickoffFileSelect}
                  onUniversalFileUpload={handleKickoffFileUpload}
                  selectedClient={selectedClient}
                />
                
                <div className="text-center">
                  <Button
                    onClick={handleProceedToEmail}
                    disabled={!welcomeMessage || nextSteps.length === 0}
                    className="flex items-center justify-center space-x-3 h-16 px-12 text-xl font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
                    size="lg"
                  >
                    <Mail className="w-6 h-6" />
                    <span>Proceed to Email</span>
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'sendEmail' && (
              <EmailClientForm
                selectedClient={selectedClient}
                welcomeMessage={welcomeMessage}
                nextSteps={nextSteps}
                kickoffFiles={kickoffFiles}
                onEmailSent={handleEmailSent}
              />
            )}

            {currentStep === 'reviewFinalize' && (
              <ReviewPanel
                welcomeMessage={welcomeMessage}
                nextSteps={nextSteps}
                kickoffFiles={kickoffFiles}
                sowFile={sowFile}
                selectedClient={selectedClient}
                onStartNewOnboarding={handleStartNewOnboarding}
                onGoToProjectDashboard={onGoToProjectDashboard}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}