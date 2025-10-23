import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Mail,
  Eye,
  Settings,
  Plus
} from 'lucide-react';
import { 
  listClientEngagements, 
  listOnboardingSteps,
  type ClientEngagement, 
  type Client,
  type OnboardingStep 
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface EngagementWithProgress extends ClientEngagement {
  client: Client;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
}

interface EngagementDashboardProps {
  onSelectEngagement: (engagement: ClientEngagement & { client: Client }) => void;
  onStartNewOnboarding: () => void;
}

export function EngagementDashboard({ onSelectEngagement, onStartNewOnboarding }: EngagementDashboardProps) {
  const [engagements, setEngagements] = useState<EngagementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        title: "Failed to Load Engagements",
        description: "Could not retrieve client engagements from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium text-slate-600">Loading engagements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span>Client Engagement Dashboard</span>
          </CardTitle>
          <CardDescription className="text-lg font-medium text-slate-600 mt-3">
            Monitor and manage all active client onboarding engagements
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      {engagements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{engagements.length}</p>
                  <p className="text-sm font-medium text-slate-600">Total Engagements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {engagements.filter(e => e.status === 'in_progress').length}
                  </p>
                  <p className="text-sm font-medium text-slate-600">In Progress</p>
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
                  <p className="text-2xl font-bold text-slate-900">
                    {engagements.filter(e => e.status === 'completed').length}
                  </p>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(engagements.reduce((acc, e) => acc + e.progressPercentage, 0) / engagements.length || 0)}%
                  </p>
                  <p className="text-sm font-medium text-slate-600">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Engagements List */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">Active Engagements</CardTitle>
          <CardDescription className="text-base font-medium text-slate-600">
            Click on any engagement to manage its detailed project timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          {engagements.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-8">
              <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="font-semibold text-lg">No active engagements</p>
              <p className="text-sm mt-1">Engagements will appear here after sending client emails</p>
              
              <div className="pt-8">
                <Button
                  onClick={onStartNewOnboarding}
                  className="flex items-center justify-center space-x-3 h-16 px-12 text-xl font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                  size="lg"
                >
                  <Plus className="w-6 h-6" />
                  <span>Start New Client Onboarding</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {engagements.map((engagement) => (
                <div
                  key={engagement.id}
                  className="p-8 border-2 border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-r from-white to-slate-50"
                  onClick={() => onSelectEngagement(engagement)}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">
                          {engagement.client.name}
                        </h3>
                        <p className="text-base font-medium text-slate-600">
                          {engagement.client_email || 'No email provided'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(engagement.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEngagement(engagement);
                        }}
                        className="flex items-center space-x-2 text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Manage</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Email Sent</p>
                        <p className="text-sm text-slate-600">{formatDate(engagement.email_sent_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Progress</p>
                        <p className="text-sm text-slate-600">
                          {engagement.completedSteps} of {engagement.totalSteps} steps
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Last Updated</p>
                        <p className="text-sm text-slate-600">
                          {new Date(engagement.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Overall Progress</span>
                      <span className={`text-sm font-bold ${getProgressColor(engagement.progressPercentage)}`}>
                        {Math.round(engagement.progressPercentage)}%
                      </span>
                    </div>
                    <Progress value={engagement.progressPercentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}