import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Download, Share, Eye } from 'lucide-react';
import { type OnboardingStep, type Client } from '@/lib/supabase';

interface ClientChecklistViewProps {
  steps: OnboardingStep[];
  selectedClient: Client | null;
  onSwitchToInternal: () => void;
}

export function ClientChecklistView({ steps, selectedClient, onSwitchToInternal }: ClientChecklistViewProps) {
  const clientVisibleSteps = steps.filter(step => step.client_visible);
  const completedSteps = clientVisibleSteps.filter(step => step.status === 'completed').length;
  const progressPercentage = clientVisibleSteps.length > 0 ? (completedSteps / clientVisibleSteps.length) * 100 : 0;

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-slate-900">
                Client Onboarding Checklist
              </CardTitle>
              <CardDescription className="text-lg font-medium text-slate-600 mt-3">
                Track progress on your onboarding journey with our team
                {selectedClient && (
                  <span className="block mt-2 text-blue-600 font-semibold">
                    {selectedClient.name}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onSwitchToInternal}
                className="flex items-center space-x-2 text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                <span>Internal View</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2 text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50"
              >
                <Share className="w-4 h-4" />
                <span>Share</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center space-x-2 text-emerald-600 border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Overall Progress</h3>
                <p className="text-base font-medium text-slate-600 mt-1">
                  {completedSteps} of {clientVisibleSteps.length} steps completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {Math.round(progressPercentage)}%
                </div>
                <div className="text-sm font-medium text-slate-500">Complete</div>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">Onboarding Steps</CardTitle>
          <CardDescription className="text-base font-medium text-slate-600">
            Your personalized onboarding journey with key milestones and deliverables
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <div className="space-y-4">
            {clientVisibleSteps.length > 0 ? (
              clientVisibleSteps.map((step, index) => (
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
                            <Clock className="w-4 h-4" />
                            <span>Starts {formatDate(step.start_date)}</span>
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
              ))
            ) : (
              <div className="text-center py-16 text-slate-500">
                <Circle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="font-semibold text-lg">No checklist items available</p>
                <p className="text-sm mt-1">Items will appear here once your onboarding plan is finalized</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}