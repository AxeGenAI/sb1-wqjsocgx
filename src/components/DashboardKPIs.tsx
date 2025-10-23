import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  Target,
  Activity,
  Loader2
} from 'lucide-react';
import { 
  getOverallEngagementStats,
  getOverallOnboardingStepStats,
  getOverallRiskStats,
  getAverageOnboardingTime,
  listClients,
  type EngagementStats,
  type OnboardingStepStats,
  type RiskStats
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DashboardKPIsProps {
  className?: string;
}

export function DashboardKPIs({ className }: DashboardKPIsProps) {
  const [engagementStats, setEngagementStats] = useState<EngagementStats | null>(null);
  const [stepStats, setStepStats] = useState<OnboardingStepStats | null>(null);
  const [riskStats, setRiskStats] = useState<RiskStats | null>(null);
  const [averageTime, setAverageTime] = useState<number>(0);
  const [totalClients, setTotalClients] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        engagements,
        steps,
        risks,
        avgTime,
        clients
      ] = await Promise.all([
        getOverallEngagementStats(),
        getOverallOnboardingStepStats(),
        getOverallRiskStats(),
        getAverageOnboardingTime(),
        listClients()
      ]);

      setEngagementStats(engagements);
      setStepStats(steps);
      setRiskStats(risks);
      setAverageTime(avgTime);
      setTotalClients(clients.length);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Failed to Load Dashboard Data",
        description: "Could not retrieve platform statistics.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionRate = () => {
    if (!engagementStats || engagementStats.total === 0) return 0;
    return Math.round((engagementStats.completed / engagementStats.total) * 100);
  };

  const getStepCompletionRate = () => {
    if (!stepStats || stepStats.total === 0) return 0;
    return Math.round((stepStats.completed / stepStats.total) * 100);
  };

  const getActiveRisks = () => {
    if (!riskStats) return 0;
    return riskStats.open + riskStats.in_progress;
  };

  const getCriticalRisks = () => {
    if (!riskStats) return 0;
    return riskStats.by_severity.critical + riskStats.by_severity.high;
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-slate-600">Loading platform insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Executive Summary Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Platform Performance Overview</h2>
        <p className="text-lg font-medium text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Real-time insights across all client engagements, onboarding progress, and strategic initiatives
        </p>
      </div>

      {/* Primary KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-200 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-blue-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-900">{totalClients}</p>
                <p className="text-base font-semibold text-blue-700">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Engagements */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-emerald-200 rounded-2xl flex items-center justify-center shadow-lg">
                <Activity className="w-8 h-8 text-emerald-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-900">
                  {engagementStats ? engagementStats.in_progress + engagementStats.sent : 0}
                </p>
                <p className="text-base font-semibold text-emerald-700">Active Engagements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-purple-200 rounded-2xl flex items-center justify-center shadow-lg">
                <Target className="w-8 h-8 text-purple-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-900">{getCompletionRate()}%</p>
                <p className="text-base font-semibold text-purple-700">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Risks */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardContent className="p-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-orange-200 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-8 h-8 text-orange-700" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-900">{getCriticalRisks()}</p>
                <p className="text-base font-semibold text-orange-700">High Priority Risks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}