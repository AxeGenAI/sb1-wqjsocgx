import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Target,
  Calendar,
  Activity
} from 'lucide-react';
import { 
  getOverallEngagementStats,
  getOverallOnboardingStepStats,
  getOverallRiskStats,
  getClientGrowthData,
  getAverageOnboardingTime,
  type EngagementStats,
  type OnboardingStepStats,
  type RiskStats,
  type ClientGrowthData
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  orange: '#f97316',
  slate: '#64748b'
};

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info];

export function ReportingDashboard() {
  const [engagementStats, setEngagementStats] = useState<EngagementStats | null>(null);
  const [stepStats, setStepStats] = useState<OnboardingStepStats | null>(null);
  const [riskStats, setRiskStats] = useState<RiskStats | null>(null);
  const [growthData, setGrowthData] = useState<ClientGrowthData[]>([]);
  const [averageOnboardingTime, setAverageOnboardingTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportingData();
  }, []);

  const fetchReportingData = async () => {
    setIsLoading(true);
    try {
      const [
        engagements,
        steps,
        risks,
        growth,
        avgTime
      ] = await Promise.all([
        getOverallEngagementStats(),
        getOverallOnboardingStepStats(),
        getOverallRiskStats(),
        getClientGrowthData(),
        getAverageOnboardingTime()
      ]);

      setEngagementStats(engagements);
      setStepStats(steps);
      setRiskStats(risks);
      setGrowthData(growth);
      setAverageOnboardingTime(avgTime);
    } catch (error) {
      console.error('Error fetching reporting data:', error);
      toast({
        title: "Failed to Load Reports",
        description: "Could not retrieve reporting data from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatEngagementDataForPieChart = () => {
    if (!engagementStats) return [];
    return [
      { name: 'Draft', value: engagementStats.draft, color: COLORS.slate },
      { name: 'Sent', value: engagementStats.sent, color: COLORS.primary },
      { name: 'In Progress', value: engagementStats.in_progress, color: COLORS.warning },
      { name: 'Completed', value: engagementStats.completed, color: COLORS.success },
      { name: 'On Hold', value: engagementStats.on_hold, color: COLORS.danger }
    ].filter(item => item.value > 0);
  };

  const formatStepDataForBarChart = () => {
    if (!stepStats) return [];
    return [
      { name: 'Not Started', value: stepStats.not_started, fill: COLORS.slate },
      { name: 'In Progress', value: stepStats.in_progress, fill: COLORS.warning },
      { name: 'Completed', value: stepStats.completed, fill: COLORS.success },
      { name: 'On Hold', value: stepStats.on_hold, fill: COLORS.danger }
    ];
  };

  const formatRiskDataForPieChart = () => {
    if (!riskStats) return [];
    return [
      { name: 'Open', value: riskStats.open, color: COLORS.slate },
      { name: 'In Progress', value: riskStats.in_progress, color: COLORS.warning },
      { name: 'Mitigated', value: riskStats.mitigated, color: COLORS.success },
      { name: 'Closed', value: riskStats.closed, color: COLORS.info }
    ].filter(item => item.value > 0);
  };

  const formatSeverityDataForBarChart = () => {
    if (!riskStats) return [];
    return [
      { name: 'Low', value: riskStats.by_severity.low, fill: COLORS.success },
      { name: 'Medium', value: riskStats.by_severity.medium, fill: COLORS.warning },
      { name: 'High', value: riskStats.by_severity.high, fill: COLORS.orange },
      { name: 'Critical', value: riskStats.by_severity.critical, fill: COLORS.danger }
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium text-slate-600">Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-slate-900 flex items-center space-x-4">
            <BarChart3 className="w-10 h-10 text-purple-600" />
            <span>Analytics & Reporting Dashboard</span>
          </CardTitle>
          <CardDescription className="text-xl font-medium text-slate-600 mt-4 leading-relaxed">
            Comprehensive insights into client onboarding performance, project progress, and business metrics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{engagementStats?.total || 0}</p>
                <p className="text-base font-semibold text-slate-600">Total Engagements</p>
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
                <p className="text-3xl font-bold text-slate-900">{stepStats?.completed || 0}</p>
                <p className="text-base font-semibold text-slate-600">Completed Steps</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{riskStats?.total || 0}</p>
                <p className="text-base font-semibold text-slate-600">Total Risks</p>
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
                <p className="text-3xl font-bold text-slate-900">{averageOnboardingTime}</p>
                <p className="text-base font-semibold text-slate-600">Avg Days/Step</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Engagement Status Distribution */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <Target className="w-6 h-6 text-blue-600" />
              <span>Engagement Status Distribution</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600">
              Overview of client engagement statuses
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formatEngagementDataForPieChart()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {formatEngagementDataForPieChart().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Steps Progress */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <Activity className="w-6 h-6 text-emerald-600" />
              <span>Onboarding Steps Progress</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600">
              Distribution of step statuses across all projects
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatStepDataForBarChart()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Client Growth Trend */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <span>Growth Trends</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600">
              Client acquisition and engagement trends over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="clients" 
                    stroke={COLORS.primary} 
                    strokeWidth={3}
                    name="New Clients"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagements" 
                    stroke={COLORS.success} 
                    strokeWidth={3}
                    name="New Engagements"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Analysis */}
        <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <span>Risk Analysis</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600">
              Risk distribution by severity and status
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="space-y-6">
              {/* Risk Status Pie Chart */}
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Risk Status Distribution</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formatRiskDataForPieChart()}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {formatRiskDataForPieChart().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Risk Severity Bar Chart */}
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Risk Severity Breakdown</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatSeverityDataForBarChart()} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={60} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}