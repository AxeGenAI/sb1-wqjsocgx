import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Mail,
  Settings,
  ArrowRight,
  User,
  MessageSquare,
  Trash2,
  BarChart3,
  List,
  ExternalLink,
  Edit3,
  Save,
  Home,
  ArrowLeft,
  Package,
  AlertTriangle,
  PenTool,
  Target,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  listClientEngagements, 
  listOnboardingSteps,
  updateOnboardingStep,
  deleteOnboardingStep,
  createOnboardingStep,
  deleteClientAndAssociatedData,
  updateClient,
  type ClientEngagement, 
  type Client,
  type OnboardingStep 
} from '@/lib/supabase';
import { OnboardingStepCard } from './OnboardingStepCard';
import { ProjectGanttChart } from './ProjectGanttChart';
import { RiskManagementPanel } from './RiskManagementPanel';
import { ClientDeliverablesPanel } from './ClientDeliverablesPanel';
import { SignatureRequestsPanel } from './SignatureRequestsPanel';
import { SignatureRequestForm } from './SignatureRequestForm';
import { useToast } from '@/hooks/use-toast';

interface EngagementWithProgress extends ClientEngagement {
  client: Client;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
}

type ProjectSection = 'overview' | 'steps' | 'deliverables' | 'risks' | 'signatures' | 'sendSignature';

const projectNavigationItems = [
  { id: 'overview', icon: Building2, label: 'Project Overview', description: 'Client details and progress' },
  { id: 'steps', icon: CheckCircle2, label: 'Project Steps', description: 'Tasks and timeline' },
  { id: 'deliverables', icon: Package, label: 'Deliverables', description: 'Milestone documents' },
  { id: 'risks', icon: AlertTriangle, label: 'Risk Management', description: 'Issues and mitigation' },
  { id: 'signatures', icon: PenTool, label: 'E-Signatures', description: 'Document signing' }
];

export function ProjectManagementDashboard() {
  const [engagements, setEngagements] = useState<EngagementWithProgress[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<ProjectSection>('overview');
  const [engagementSteps, setEngagementSteps] = useState<Record<string, OnboardingStep[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [clientNameToConfirm, setClientNameToConfirm] = useState('');
  const [engagementToDelete, setEngagementToDelete] = useState<EngagementWithProgress | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'gantt'>('list');
  const [editingAppUrl, setEditingAppUrl] = useState(false);
  const [tempAppUrl, setTempAppUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 8; // 2 rows of 4 cards each
  const { toast } = useToast();

  useEffect(() => {
    fetchEngagements();
  }, []);

  const fetchEngagements = async () => {
    setIsLoading(true);
    try {
      const engagementData = await listClientEngagements();
      
      // Fetch progress data for each engagement
      const engagementsWithProgress = await Promise.all(
        engagementData.map(async (engagement) => {
          try {
            const steps = await listOnboardingSteps(engagement.client_id);
            const completedSteps = steps.filter(step => step.status === 'completed').length;
            const progressPercentage = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;
            
            // Store steps for this engagement
            setEngagementSteps(prev => ({
              ...prev,
              [engagement.id]: steps
            }));
            
            return {
              ...engagement,
              totalSteps: steps.length,
              completedSteps,
              progressPercentage
            };
          } catch (error) {
            console.error(`Error fetching steps for client ${engagement.client_id}:`, error);
            return {
              ...engagement,
              totalSteps: 0,
              completedSteps: 0,
              progressPercentage: 0
            };
          }
        })
      );
      
      setEngagements(engagementsWithProgress);
    } catch (error) {
      console.error('Error fetching engagements:', error);
      toast({
        title: "Failed to Load Projects",
        description: "Could not retrieve project data from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<OnboardingStep>) => {
    try {
      const updatedStep = await updateOnboardingStep(stepId, updates);
      
      // Update local state
      setEngagementSteps(prev => {
        const newSteps = { ...prev };
        Object.keys(newSteps).forEach(engagementId => {
          newSteps[engagementId] = newSteps[engagementId].map(step => 
            step.id === stepId ? updatedStep : step
          );
        });
        return newSteps;
      });
      
      // Refresh engagement progress
      await fetchEngagements();
      
      toast({
        title: "Step Updated",
        description: "Project step has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the step. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteOnboardingStep(stepId);
      
      // Update local state
      setEngagementSteps(prev => {
        const newSteps = { ...prev };
        Object.keys(newSteps).forEach(engagementId => {
          newSteps[engagementId] = newSteps[engagementId].filter(step => step.id !== stepId);
        });
        return newSteps;
      });
      
      // Refresh engagement progress
      await fetchEngagements();
      
      toast({
        title: "Step Removed",
        description: "Project step has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting step:', error);
      toast({
        title: "Delete Failed",
        description: "Could not remove the step. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddStep = async (clientId: string) => {
    try {
      const currentSteps = engagementSteps[selectedEngagement!] || [];
      const newStep = await createOnboardingStep({
        client_id: clientId,
        title: 'New Project Step',
        description: 'Add description and details for this step',
        status: 'not_started',
        order_index: currentSteps.length,
        client_visible: true
      });

      // Update local state
      setEngagementSteps(prev => ({
        ...prev,
        [selectedEngagement!]: [...(prev[selectedEngagement!] || []), newStep]
      }));
      
      // Refresh engagement progress
      await fetchEngagements();
      
      toast({
        title: "Step Added",
        description: "New project step has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating step:', error);
      toast({
        title: "Failed to Add Step",
        description: "Could not create the new step. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (engagement: EngagementWithProgress) => {
    try {
      await deleteClientAndAssociatedData(engagement.client_id);
      
      // Update local state by removing the deleted engagement
      setEngagements(prev => prev.filter(e => e.id !== engagement.id));
      setEngagementSteps(prev => {
        const newSteps = { ...prev };
        delete newSteps[engagement.id];
        return newSteps;
      });
      
      // If the deleted engagement was selected, clear selection
      if (selectedEngagement === engagement.id) {
        setSelectedEngagement(null);
        setCurrentSection('overview');
      }
      
      // Reset confirmation state
      setShowDeleteConfirmDialog(false);
      setClientNameToConfirm('');
      setEngagementToDelete(null);
      
      toast({
        title: "Project Deleted Successfully",
        description: `All data for "${engagement.client.name}" has been permanently removed.`,
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Failed to Delete Project",
        description: error instanceof Error ? error.message : "Could not delete the project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAppUrl = async (clientId: string, appUrl: string) => {
    try {
      await updateClient(clientId, { app_url: appUrl.trim() || undefined });
      
      // Update local state
      setEngagements(prev => prev.map(engagement => 
        engagement.client_id === clientId 
          ? { ...engagement, client: { ...engagement.client, app_url: appUrl.trim() || undefined } }
          : engagement
      ));
      
      setEditingAppUrl(false);
      
      toast({
        title: "App URL Updated",
        description: "Client app URL has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating app URL:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the app URL. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSelectProject = (engagementId: string) => {
    setSelectedEngagement(engagementId);
    setCurrentSection('overview');
  };

  const handleBackToProjects = () => {
    setSelectedEngagement(null);
    setCurrentSection('overview');
  };

  // Pagination logic
  const totalPages = Math.ceil(engagements.length / projectsPerPage);
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const currentEngagements = engagements.slice(startIndex, endIndex);

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

  const getStatusBadge = (status: ClientEngagement['status']) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Email Sent</Badge>;
      case 'in_progress':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Completed</Badge>;
      case 'on_hold':
        return <Badge className="bg-red-100 text-red-700 border-red-200">On Hold</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Draft</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not sent';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 50) return 'text-blue-600';
    if (percentage >= 25) return 'text-orange-600';
    return 'text-slate-600';
  };

  const selectedEngagementData = engagements.find(e => e.id === selectedEngagement);
  const currentSteps = selectedEngagement ? (engagementSteps[selectedEngagement] || []) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium text-slate-600">Loading projects...</span>
        </div>
      </div>
    );
  }

  if (engagements.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500 space-y-8">
        <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="font-semibold text-lg">No active projects</p>
        <p className="text-sm mt-1">Projects will appear here after sending client onboarding emails</p>
      </div>
    );
  }

  // Project List View (when no project is selected)
  if (!selectedEngagement) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-slate-900 flex items-center space-x-4">
              <Settings className="w-10 h-10 text-blue-600" />
              <span>Project Management Dashboard</span>
            </CardTitle>
            <CardDescription className="text-xl font-medium text-slate-600 mt-4 leading-relaxed">
              Manage active client projects, track progress, and coordinate team activities
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">{engagements.length}</p>
                  <p className="text-base font-semibold text-slate-600">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center shadow-lg">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {engagements.filter(e => e.status === 'in_progress').length}
                  </p>
                  <p className="text-base font-semibold text-slate-600">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {engagements.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-base font-semibold text-slate-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {Math.round(engagements.reduce((acc, e) => acc + e.progressPercentage, 0) / engagements.length || 0)}%
                  </p>
                  <p className="text-base font-semibold text-slate-600">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Active Projects</CardTitle>
                <CardDescription className="text-base font-medium text-slate-600">
                  Click on any project to access detailed management tools
                </CardDescription>
              </div>
              {engagements.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Badge variant="secondary" className="text-sm font-semibold px-4 py-2">
                    {engagements.length} project{engagements.length !== 1 ? 's' : ''}
                  </Badge>
                  {totalPages > 1 && (
                    <Badge variant="outline" className="text-sm font-semibold px-4 py-2">
                      Page {currentPage} of {totalPages}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-8">
              {/* Project Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentEngagements.map((engagement) => (
                  <Card
                    key={engagement.id}
                    className="border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-slate-50 hover:scale-[1.02] group"
                    onClick={() => handleSelectProject(engagement.id)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                              <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors duration-300">
                                {engagement.client.name}
                              </h3>
                              <p className="text-sm text-slate-600 truncate">
                                {engagement.client_email || 'No email'}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(engagement.status)}
                        </div>

                        {/* Key Metrics */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 font-medium">Progress</span>
                            <span className={`font-bold ${getProgressColor(engagement.progressPercentage)}`}>
                              {Math.round(engagement.progressPercentage)}%
                            </span>
                          </div>
                          <Progress value={engagement.progressPercentage} className="h-2" />
                          
                          <div className="text-xs text-slate-500 text-center">
                            {engagement.completedSteps} of {engagement.totalSteps} steps completed
                          </div>
                        </div>

                        {/* Quick Info */}
                        <div className="space-y-2 text-xs text-slate-500">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3 h-3" />
                            <span>Sent: {formatDate(engagement.email_sent_at)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-3 h-3" />
                            <span>Updated: {new Date(engagement.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProject(engagement.id);
                          }}
                          className="w-full flex items-center justify-center space-x-2 h-10 text-sm font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Manage Project</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detailed Project View with Left Navigation
  if (!selectedEngagementData) return null;

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
                <h2 className="text-xl font-bold text-slate-900">{selectedEngagementData.client.name}</h2>
                <p className="text-sm font-medium text-slate-600">Project Management</p>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Progress</span>
                <Badge variant="secondary" className="text-xs font-bold">
                  {Math.round(selectedEngagementData.progressPercentage)}%
                </Badge>
              </div>
              <Progress value={selectedEngagementData.progressPercentage} className="h-2" />
              <div className="text-xs text-slate-500">
                {selectedEngagementData.completedSteps} of {selectedEngagementData.totalSteps} steps completed
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-4 space-y-2">
            {projectNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id as ProjectSection)}
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
              onClick={handleBackToProjects}
              className="w-full flex items-center justify-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Projects</span>
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
                    {projectNavigationItems.find(item => item.id === currentSection)?.label || 'Project Overview'}
                  </CardTitle>
                  <CardDescription className="text-lg font-medium text-slate-600 mt-2">
                    {projectNavigationItems.find(item => item.id === currentSection)?.description || 'Manage project details'}
                    <span className="block mt-2 text-blue-600 font-semibold">
                      Client: {selectedEngagementData.client.name}
                    </span>
                  </CardDescription>
                </div>
                {currentSection !== 'overview' && (
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(selectedEngagementData.status)}
                    <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEngagementToDelete(selectedEngagementData);
                            setClientNameToConfirm('');
                            setShowDeleteConfirmDialog(true);
                          }}
                          className="flex items-center space-x-2 text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Project</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                            <AlertCircle className="w-5 h-5" />
                            <span>Permanently Delete Project?</span>
                          </AlertDialogTitle>
                          <AlertDialogDescription className="space-y-4">
                            <div className="text-slate-700">
                              This action <strong>cannot be undone</strong>. This will permanently delete:
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <ul className="space-y-2 text-sm text-red-800">
                                <li className="flex items-center space-x-2">
                                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                  <span>Client record for <strong>{engagementToDelete?.client.name}</strong></span>
                                </li>
                                <li className="flex items-center space-x-2">
                                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                  <span>All project steps ({engagementToDelete?.totalSteps})</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                  <span>All uploaded SOW documents</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                  <span>Email engagement history</span>
                                </li>
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-slate-700">
                                To confirm, type the client's name below:
                              </div>
                              <Input
                                value={clientNameToConfirm}
                                onChange={(e) => setClientNameToConfirm(e.target.value)}
                                placeholder={engagementToDelete?.client.name || ''}
                                className="border-2 focus:border-red-500"
                              />
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel 
                            onClick={() => {
                              setClientNameToConfirm('');
                              setEngagementToDelete(null);
                            }}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => engagementToDelete && handleDeleteProject(engagementToDelete)}
                            disabled={clientNameToConfirm !== engagementToDelete?.client.name}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:bg-slate-300 disabled:text-slate-500"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Dynamic Content Based on Selected Section */}
          <div className="space-y-8">
            {currentSection === 'overview' && (
              <div className="space-y-8">
                {/* Project Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">Email Sent</p>
                      <p className="text-base font-medium text-slate-600">{formatDate(selectedEngagementData.email_sent_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">Progress</p>
                      <p className="text-base font-medium text-slate-600">
                        {selectedEngagementData.completedSteps} of {selectedEngagementData.totalSteps} steps
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">Last Updated</p>
                      <p className="text-base font-medium text-slate-600">
                        {new Date(selectedEngagementData.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* App URL Management */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-slate-900">Client Application</CardTitle>
                    <CardDescription className="text-base font-medium text-slate-600">
                      Manage the client's application URL for easy access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-8">
                    <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                          <ExternalLink className="w-5 h-5 text-blue-600" />
                          <span>Client App URL</span>
                        </h4>
                        {!editingAppUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAppUrl(true);
                              setTempAppUrl(selectedEngagementData.client.app_url || '');
                            }}
                            className="text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        )}
                      </div>
                      
                      {editingAppUrl ? (
                        <div className="space-y-4">
                          <Input
                            value={tempAppUrl}
                            onChange={(e) => setTempAppUrl(e.target.value)}
                            placeholder="https://your-client-app.com"
                            className="border-2 focus:border-blue-500"
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleUpdateAppUrl(selectedEngagementData.client_id, tempAppUrl)}
                              className="bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingAppUrl(false);
                                setTempAppUrl('');
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {selectedEngagementData.client.app_url ? (
                            <div className="flex items-center space-x-3">
                              <a
                                href={selectedEngagementData.client.app_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 font-medium text-base underline decoration-2 underline-offset-2 hover:decoration-blue-700 transition-colors"
                              >
                                {selectedEngagementData.client.app_url}
                              </a>
                              <ExternalLink className="w-4 h-4 text-blue-500" />
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">No app URL configured for this client</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Bar */}
                <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-slate-900">Overall Progress</span>
                        <span className={`text-lg font-bold ${getProgressColor(selectedEngagementData.progressPercentage)}`}>
                          {Math.round(selectedEngagementData.progressPercentage)}%
                        </span>
                      </div>
                      <Progress value={selectedEngagementData.progressPercentage} className="h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {currentSection === 'steps' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-2xl font-bold text-slate-900">Project Steps</h3>
                    <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200"
                      >
                        <List className="w-4 h-4" />
                        <span>List</span>
                      </Button>
                      <Button
                        variant={viewMode === 'gantt' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('gantt')}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Gantt</span>
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button 
                      onClick={() => handleAddStep(selectedEngagementData.client_id)}
                      className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-semibold"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Add Step</span>
                    </Button>
                  </div>
                </div>

                {viewMode === 'list' ? (
                  <div className="space-y-6">
                    {currentSteps.length > 0 ? (
                      currentSteps.map((step, index) => (
                        <OnboardingStepCard
                          key={step.id}
                          step={step}
                          index={index}
                          onUpdate={handleUpdateStep}
                          onDelete={handleDeleteStep}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
                        <CheckCircle2 className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                        <p className="font-bold text-xl text-slate-700">No project steps yet</p>
                        <p className="text-base mt-3 font-medium">Add steps to track project progress and deliverables</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6">
                    {currentSteps.length > 0 ? (
                      <ProjectGanttChart
                        steps={currentSteps}
                        onTaskUpdate={handleUpdateStep}
                        readOnly={false}
                        clientView={false}
                      />
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <BarChart3 className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                        <p className="font-bold text-xl text-slate-700">No project timeline yet</p>
                        <p className="text-base mt-3 font-medium">Add steps to visualize project timeline and dependencies</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentSection === 'deliverables' && (
              <ClientDeliverablesPanel selectedClient={selectedEngagementData.client} />
            )}

            {currentSection === 'risks' && (
              <RiskManagementPanel selectedClient={selectedEngagementData.client} />
            )}

            {currentSection === 'signatures' && (
              <SignatureRequestsPanel 
                selectedClient={selectedEngagementData.client}
                onSendNewRequest={() => setCurrentSection('sendSignature')}
              />
            )}

            {currentSection === 'sendSignature' && (
              <SignatureRequestForm 
                onRequestSent={() => setCurrentSection('signatures')}
                onBack={() => setCurrentSection('signatures')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}