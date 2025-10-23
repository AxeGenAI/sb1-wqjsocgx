import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileText,
  Package,
  Target,
  User,
  Calendar,
  ExternalLink,
  Loader2,
  BarChart3,
  Globe,
  Home
} from 'lucide-react';
import { 
  listClients,
  listOnboardingSteps,
  listClientDeliverables,
  type Client,
  type OnboardingStep,
  type ClientDeliverable
} from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { ProjectGanttChart } from './ProjectGanttChart';
import { useToast } from '@/hooks/use-toast';

type ClientSection = 'overview' | 'steps' | 'timeline' | 'deliverables';

const clientNavigationItems = [
  { id: 'overview', icon: Home, label: 'Project Overview', description: 'Progress and details' },
  { id: 'steps', icon: CheckCircle2, label: 'Onboarding Steps', description: 'Your journey checklist' },
  { id: 'timeline', icon: BarChart3, label: 'Project Timeline', description: 'Visual progress timeline' },
  { id: 'deliverables', icon: Package, label: 'Deliverables', description: 'Project documents' }
];

interface ClientDashboardViewProps {
  onBackToAdmin: () => void;
}

export function ClientDashboardView({ onBackToAdmin }: ClientDashboardViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [currentSection, setCurrentSection] = useState<ClientSection>('overview');
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const [deliverables, setDeliverables] = useState<ClientDeliverable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [isLoadingDeliverables, setIsLoadingDeliverables] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientData();
    } else {
      setOnboardingSteps([]);
      setDeliverables([]);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const fetchClientData = async () => {
    if (!selectedClient) return;

    setIsLoadingSteps(true);
    setIsLoadingDeliverables(true);

    try {
      // Fetch onboarding steps (client-visible only)
      const steps = await listOnboardingSteps(selectedClient.id);
      const clientVisibleSteps = steps.filter(step => step.client_visible);
      setOnboardingSteps(clientVisibleSteps);
    } catch (error) {
      console.error('Error fetching onboarding steps:', error);
      toast({
        title: "Failed to Load Steps",
        description: "Could not retrieve onboarding steps.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSteps(false);
    }

    try {
      // Fetch deliverables
      const clientDeliverables = await listClientDeliverables(selectedClient.id);
      setDeliverables(clientDeliverables);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      toast({
        title: "Failed to Load Deliverables",
        description: "Could not retrieve client deliverables.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDeliverables(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    if (client) {
      setCurrentSection('overview');
    }
  };

  const handleDownloadDeliverable = async (deliverable: ClientDeliverable) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-deliverables')
        .createSignedUrl(deliverable.document_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        toast({
          title: "Failed to Access File",
          description: "Could not generate access URL for the deliverable.",
          variant: "destructive",
        });
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error accessing deliverable:', error);
      toast({
        title: "Access Failed",
        description: "Could not access the deliverable file.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: OnboardingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-600" />;
      default:
        return <Circle className="w-6 h-6 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: OnboardingStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'on_hold':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">On Hold</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Not Started</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const groupDeliverablesByMilestone = () => {
    const grouped: Record<string, ClientDeliverable[]> = {};
    deliverables.forEach(deliverable => {
      if (!grouped[deliverable.milestone_name]) {
        grouped[deliverable.milestone_name] = [];
      }
      grouped[deliverable.milestone_name].push(deliverable);
    });
    return grouped;
  };

  const completedSteps = onboardingSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = onboardingSteps.length > 0 ? (completedSteps / onboardingSteps.length) * 100 : 0;
  const groupedDeliverables = groupDeliverablesByMilestone();

  // Client Selection View (when no client is selected)
  if (!selectedClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold text-slate-900 flex items-center space-x-4">
                    <User className="w-10 h-10 text-blue-600" />
                    <span>Client Dashboard</span>
                  </CardTitle>
                  <CardDescription className="text-xl font-medium text-slate-600 mt-4 leading-relaxed">
                    View your project progress, onboarding checklist, and deliverables
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={onBackToAdmin}
                  className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Admin</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Client Selection */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">Select Your Project</CardTitle>
              <CardDescription className="text-base font-medium text-slate-600">
                Choose your project to view progress and deliverables
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-slate-600">Loading clients...</span>
                  </div>
                </div>
              ) : (
                <Select onValueChange={handleClientSelect}>
                  <SelectTrigger className="w-full h-12 text-base border-2 focus:border-blue-500">
                    <SelectValue placeholder="Select your project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Client Portal View with Left Navigation
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="flex">
        {/* Left Navigation Sidebar */}
        <div className="w-80 bg-white border-r border-slate-200 shadow-xl">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
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
                <h2 className="text-xl font-bold text-slate-900">{selectedClient.name}</h2>
                <p className="text-sm font-medium text-slate-600">Client Portal</p>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
                <Badge variant="secondary" className="text-xs font-bold">
                  {Math.round(progressPercentage)}%
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="text-xs text-slate-500">
                {completedSteps} of {onboardingSteps.length} steps completed
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-2">
            {clientNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id as ClientSection)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-100 border-2 border-blue-300 shadow-lg'
                      : 'hover:bg-slate-50 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-blue-200' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isActive ? 'text-blue-700' : 'text-slate-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${
                        isActive ? 'text-blue-900' : 'text-slate-900'
                      }`}>
                        {item.label}
                      </p>
                      <p className={`text-xs ${
                        isActive ? 'text-blue-700' : 'text-slate-600'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-slate-200 space-y-3">
            <Button
              variant="outline"
              onClick={onBackToAdmin}
              className="w-full flex items-center justify-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 space-y-8">
          {/* Section Header */}
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold text-slate-900">
                    {clientNavigationItems.find(item => item.id === currentSection)?.label || 'Project Overview'}
                  </CardTitle>
                  <CardDescription className="text-lg font-medium text-slate-600 mt-2">
                    {clientNavigationItems.find(item => item.id === currentSection)?.description || 'View project details'}
                    <span className="block mt-2 text-blue-600 font-semibold">
                      Client: {selectedClient.name}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedClient(null)}
                  className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Change Project</span>
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Dynamic Content Based on Selected Section */}
          <div className="space-y-8">
            <Tabs value={currentSection} className="space-y-8">
              <TabsContent value="overview">
                {/* Project Overview */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center">
                            {selectedClient.logo_url ? (
                              <img 
                                src={selectedClient.logo_url} 
                                alt={`${selectedClient.name} logo`}
                                className="w-16 h-16 object-contain rounded-2xl bg-white border-2 border-slate-200 shadow-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-blue-600" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h2 className="text-3xl font-bold text-slate-900">{selectedClient.name}</h2>
                            <p className="text-lg font-medium text-slate-600 mt-1">
                              Project started {formatDate(selectedClient.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold text-blue-600 mb-1">
                            {Math.round(progressPercentage)}%
                          </div>
                          <div className="text-sm font-medium text-slate-500">Complete</div>
                        </div>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-slate-50 rounded-xl">
                          <div className="text-2xl font-bold text-slate-900">{onboardingSteps.length}</div>
                          <div className="text-sm font-medium text-slate-600">Total Steps</div>
                        </div>
                        <div className="text-center p-4 bg-emerald-50 rounded-xl">
                          <div className="text-2xl font-bold text-emerald-600">{completedSteps}</div>
                          <div className="text-sm font-medium text-slate-600">Completed</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                          <div className="text-2xl font-bold text-blue-600">{deliverables.length}</div>
                          <div className="text-sm font-medium text-slate-600">Deliverables</div>
                        </div>
                      </div>
                      
                      {/* App URL Section */}
                      {selectedClient.app_url && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Globe className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-slate-900">Your Application</h3>
                                <p className="text-base font-medium text-slate-600">Access your custom application</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => window.open(selectedClient.app_url, '_blank')}
                              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>Open App</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="steps">
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900">Your Onboarding Journey</CardTitle>
                    <CardDescription className="text-base font-medium text-slate-600">
                      Track your progress through the onboarding process
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-8">
                    {isLoadingSteps ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-slate-600">Loading steps...</span>
                        </div>
                      </div>
                    ) : onboardingSteps.length === 0 ? (
                      <div className="text-center py-16 text-slate-500">
                        <Circle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <p className="font-semibold text-lg">No steps available yet</p>
                        <p className="text-sm mt-1">Your onboarding steps will appear here once they're ready</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {onboardingSteps.map((step, index) => (
                          <div
                            key={step.id}
                            className={`flex items-start space-x-6 p-6 rounded-2xl border-2 transition-all duration-300 ${
                              step.status === 'completed'
                                ? 'bg-emerald-50 border-emerald-200'
                                : step.status === 'in_progress'
                                ? 'bg-blue-50 border-blue-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-slate-600 font-bold text-sm">
                                {index + 1}
                              </div>
                              {getStatusIcon(step.status)}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="text-xl font-bold text-slate-900 leading-tight">
                                  {step.title}
                                </h4>
                                {getStatusBadge(step.status)}
                              </div>

                              {step.description && (
                                <div className="mb-4">
                                  <p className="text-base text-slate-700 leading-relaxed">
                                    {step.description}
                                  </p>
                                </div>
                              )}

                              {(step.start_date || step.end_date) && (
                                <div className="flex items-center space-x-4 text-sm font-medium text-slate-600">
                                  {step.start_date && (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>Started {formatDate(step.start_date)}</span>
                                    </div>
                                  )}
                                  {step.end_date && (
                                    <div className="flex items-center space-x-1">
                                      <Clock className="w-4 h-4" />
                                      <span>Due {formatDate(step.end_date)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline">
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900">Project Timeline</CardTitle>
                    <CardDescription className="text-base font-medium text-slate-600">
                      Visual timeline of your project milestones and progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-8">
                    {isLoadingSteps ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-slate-600">Loading timeline...</span>
                        </div>
                      </div>
                    ) : onboardingSteps.length === 0 ? (
                      <div className="text-center py-16 text-slate-500">
                        <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <p className="font-semibold text-lg">No timeline available yet</p>
                        <p className="text-sm mt-1">Your project timeline will appear here once steps are scheduled</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
                        <ProjectGanttChart
                          steps={onboardingSteps}
                          readOnly={true}
                          clientView={true}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deliverables">
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900">Project Deliverables</CardTitle>
                    <CardDescription className="text-base font-medium text-slate-600">
                      Access your project documents and deliverables
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-8">
                    {isLoadingDeliverables ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="text-slate-600">Loading deliverables...</span>
                        </div>
                      </div>
                    ) : Object.keys(groupedDeliverables).length === 0 ? (
                      <div className="text-center py-16 text-slate-500">
                        <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <p className="font-semibold text-lg">No deliverables available yet</p>
                        <p className="text-sm mt-1">Your project deliverables will appear here as they're completed</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Object.entries(groupedDeliverables).map(([milestoneName, milestoneDeliverables]) => (
                          <div key={milestoneName} className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Target className="w-5 h-5 text-blue-600" />
                              <h3 className="text-xl font-bold text-slate-900">{milestoneName}</h3>
                              <Badge variant="secondary" className="text-sm font-semibold">
                                {milestoneDeliverables.length} deliverable{milestoneDeliverables.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            
                            <div className="space-y-4 ml-8">
                              {milestoneDeliverables.map((deliverable) => (
                                <div
                                  key={deliverable.id}
                                  className="p-6 border-2 border-slate-200 rounded-2xl hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-slate-50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                          <h4 className="text-lg font-bold text-slate-900">{deliverable.title}</h4>
                                          <Badge variant="outline" className="text-xs font-semibold">
                                            v{deliverable.version}
                                          </Badge>
                                        </div>
                                        
                                        {deliverable.description && (
                                          <p className="text-base text-slate-700 mb-3">{deliverable.description}</p>
                                        )}
                                        
                                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                                          <div className="flex items-center space-x-1">
                                            <FileText className="w-4 h-4" />
                                            <span>{deliverable.file_name}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Package className="w-4 h-4" />
                                            <span>{formatFileSize(deliverable.file_size)}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatDate(deliverable.created_at)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 ml-4">
                                      <Button
                                        onClick={() => handleDownloadDeliverable(deliverable)}
                                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                                        size="sm"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        <span>View</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}