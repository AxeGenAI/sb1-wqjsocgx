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
  TrendingUp,
  Mail,
  Plus,
  ArrowRight
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

interface SimplifiedEngagementDashboardProps {
  onStartNewOnboarding: () => void;
}

export function SimplifiedEngagementDashboard({ onStartNewOnboarding }: SimplifiedEngagementDashboardProps) {
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
      year: 'numeric'
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
          <span className="text-lg font-medium text-slate-600">Loading recent engagements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{engagements.length}</p>
                <p className="text-sm font-medium text-slate-600">Total Sent</p>
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

    </div>
  );
}