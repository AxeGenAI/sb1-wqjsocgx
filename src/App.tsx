import { useState, useEffect } from 'react';
import { ClientSelector } from './components/ClientSelector';
import { ClientOverviewPanel } from './components/ClientOverviewPanel';
import { SOWSelector } from './components/SOWSelector';
import { MessageEditor } from './components/MessageEditor';
import { NextStepsEditor } from './components/NextStepsEditor';
import { DocumentLibrary } from './components/DocumentLibrary';
import { EmailClientForm } from './components/EmailClientForm';
import { ReviewPanel } from './components/ReviewPanel';
import { ProjectManagementDashboard } from './components/ProjectManagementDashboard';
import { SimplifiedEngagementDashboard } from './components/SimplifiedEngagementDashboard';
import { ReportingDashboard } from './components/ReportingDashboard';
import { ClientDashboardView } from './components/ClientDashboardView';
import { EmbeddedProjectInsightChat } from './components/EmbeddedProjectInsightChat';
import { SignDocumentPage } from './components/SignDocumentPage';
import { SignatureRequestForm } from './components/SignatureRequestForm';
import { SignatureRequestsPanel } from './components/SignatureRequestsPanel';
import { DashboardKPIs } from './components/DashboardKPIs';
import { OnboardingHub } from './components/OnboardingHub';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Progress } from './components/ui/progress';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
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
  Settings,
  ArrowLeft,
  BarChart3,
  User,
  MessageCircle,
  PenTool,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { generateWelcomeContent, extractTextFromFile } from './lib/openai';
import { 
  uploadFile, 
  associateDocumentWithClient, 
  listClientDocuments,
  createOnboardingStep,
  deleteAllOnboardingSteps,
  createUniversalDocument,
  listUniversalDocuments,
  type Client, 
  type OnboardingStep,
  type UploadedFile 
} from './lib/supabase';
import { useToast } from './hooks/use-toast';

type Step = 'home' | 'onboardingHub' | 'projectDashboard' | 'reporting' | 'signatureRequests' | 'sendSignatureRequest';

function App() {
  // Extract signing request ID from URL hash (e.g., #/sign/request-id)
  const getSigningRequestId = (): string | null => {
    const hash = window.location.hash;
    const signMatch = hash.match(/^#\/sign\/(.+)$/);
    return signMatch ? signMatch[1] : null;
  };

  const signingRequestId = getSigningRequestId();

  // Navigation state
  const [currentStep, setCurrentStep] = useState<Step>('home');
  const [isClientView, setIsClientView] = useState(false);
  const { toast } = useToast();

  // If we're on a signing page, render the SignDocumentPage
  if (signingRequestId) {
    return <SignDocumentPage requestId={signingRequestId} />;
  }

  // Navigation handlers with proper state reset
  const handleBackToHome = () => {
    setCurrentStep('home');
  };

  const handleStartNewOnboarding = () => {
    setCurrentStep('onboardingHub');
  };

  const handleGoToProjectDashboard = () => {
    setCurrentStep('projectDashboard');
  };

  const handleGoToReporting = () => {
    setCurrentStep('reporting');
  };

  const handleGoToSignatureRequests = () => {
    setCurrentStep('signatureRequests');
  };

  const handleGoToSendSignatureRequest = () => {
    setCurrentStep('sendSignatureRequest');
  };

  const handleGoToClientView = () => {
    setIsClientView(true);
  };

  const handleBackToAdmin = () => {
    setIsClientView(false);
    setCurrentStep('home');
  };

  // Client Dashboard View
  if (isClientView) {
    return <ClientDashboardView onBackToAdmin={handleBackToAdmin} />;
  }

  if (currentStep === 'onboardingHub') {
    return (
      <OnboardingHub 
        onBackToHome={handleBackToHome}
        onGoToProjectDashboard={handleGoToProjectDashboard}
      />
    );
  }

  if (currentStep === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Executive Header */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-5xl font-bold mb-6 tracking-tight">
                AxeGen AI Client Success Hub
              </CardTitle>
              <CardDescription className="text-2xl font-medium text-blue-100 max-w-4xl mx-auto leading-relaxed">
                Unified platform for intelligent client onboarding, financial management, and strategic relationship optimization
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Platform Performance KPIs */}
          <DashboardKPIs />

          {/* Quick Access Modules */}
          <div className="space-y-8">
            {/* Core Business Modules */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 via-white to-slate-100">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-slate-900 text-center">Core Business Modules</CardTitle>
                <CardDescription className="text-lg font-medium text-slate-600 mt-3 text-center">
                  Access your primary business management platforms and AI assistance
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-10">
                <Tabs defaultValue="core-modules" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="core-modules" className="flex items-center space-x-2 text-base font-semibold">
                      <Building2 className="w-4 h-4" />
                      <span>Core Business Modules</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai-assistant" className="flex items-center space-x-2 text-base font-semibold">
                      <MessageCircle className="w-4 h-4" />
                      <span>Executive AI Project Assistant</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="core-modules" className="space-y-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Client Onboarding Module */}
                      <Card 
                        className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                        onClick={handleStartNewOnboarding}
                      >
                        <CardContent className="p-12">
                          <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-blue-200 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-blue-300 transition-colors duration-300 shadow-xl">
                              <Building2 className="w-12 h-12 text-blue-700" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">Client Onboarding</h3>
                              <p className="text-base font-medium text-slate-600 leading-relaxed">
                                Intelligent client integration platform with AI-powered content generation, 
                                document management, and automated workflow orchestration
                              </p>
                            </div>
                            <Button
                              className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              Enter Onboarding Hub
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Financial Management Module */}
                      <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer">
                        <CardContent className="p-12">
                          <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-emerald-200 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-emerald-300 transition-colors duration-300 shadow-xl">
                              <span className="text-3xl">💰</span>
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-slate-900 mb-3">Financial Management</h3>
                              <p className="text-base font-medium text-slate-600 leading-relaxed">
                                Comprehensive financial operations including invoicing, payment tracking, 
                                revenue forecasting, and client profitability analysis
                              </p>
                            </div>
                            <Button 
                              disabled
                              className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:bg-slate-400 disabled:shadow-none"
                            >
                              Coming Soon
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="ai-assistant" className="space-y-0">
                    <EmbeddedProjectInsightChat />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Additional Tools */}
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                <Settings className="w-6 h-6 text-slate-600" />
                <span>Additional Tools</span>
              </CardTitle>
              <CardDescription className="text-lg font-medium text-slate-600 mt-3">
                Quick access to specialized features and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-emerald-200 transition-colors duration-300">
                        <Settings className="w-8 h-8 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Project Management</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Detailed project tracking and coordination</p>
                      </div>
                      <Button 
                        onClick={() => setCurrentStep('projectDashboard')}
                        className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Manage Projects
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-purple-200 transition-colors duration-300">
                        <BarChart3 className="w-8 h-8 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Analytics & Reports</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Performance metrics and insights</p>
                      </div>
                      <Button 
                        onClick={handleGoToReporting}
                        className="w-full h-10 text-sm font-bold bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        View Reports
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-indigo-200 transition-colors duration-300">
                        <PenTool className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">E-Signatures</h4>
                        <p className="text-sm text-slate-600 leading-relaxed">Document signing workflow</p>
                      </div>
                      <Button 
                        onClick={handleGoToSignatureRequests}
                        className="w-full h-10 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Manage Signatures
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
            </Card>
          </div>

          {/* Client Portal Access */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 via-white to-green-50 border-2 border-green-200">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                <User className="w-6 h-6 text-green-600" />
                <span>Client Portal Preview</span>
              </CardTitle>
              <CardDescription className="text-lg font-medium text-slate-600 mt-3">
                Experience the client-facing view of your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="text-center space-y-6">
                <p className="text-base font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Preview how your clients see their onboarding progress, project timelines, and deliverables 
                  through their dedicated portal interface.
                </p>
                <Button 
                  onClick={handleGoToClientView}
                  className="flex items-center justify-center space-x-3 h-14 px-12 text-lg font-bold bg-green-600 hover:bg-green-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <User className="w-6 h-6" />
                  <span>Preview Client Portal</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'projectDashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToHome}
              className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>

          <ProjectManagementDashboard />
        </div>
      </div>
    );
  }

  if (currentStep === 'reporting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-100">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToHome}
              className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>

          <ReportingDashboard />
        </div>
      </div>
    );
  }

  if (currentStep === 'signatureRequests') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToHome}
              className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>

          <SignatureRequestsPanel onSendNewRequest={handleGoToSendSignatureRequest} />
        </div>
      </div>
    );
  }

  if (currentStep === 'sendSignatureRequest') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('signatureRequests')}
              className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Requests</span>
            </Button>
          </div>

          <SignatureRequestForm 
            onRequestSent={() => setCurrentStep('signatureRequests')}
            onBack={() => setCurrentStep('signatureRequests')}
          />
        </div>
      </div>
    );
  }

}

export default App;