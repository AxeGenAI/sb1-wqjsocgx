import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  AlertTriangle, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Trash2, 
  Calendar as CalendarIcon,
  User,
  Clock,
  Target,
  Shield,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  createRisk, 
  listRisks, 
  updateRisk, 
  deleteRisk,
  type Risk, 
  type Client 
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface RiskManagementPanelProps {
  selectedClient: Client | null;
}

const severityConfig = {
  low: {
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: '🟢',
    label: 'Low'
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: '🟡',
    label: 'Medium'
  },
  high: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: '🟠',
    label: 'High'
  },
  critical: {
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: '🔴',
    label: 'Critical'
  }
};

const likelihoodConfig = {
  low: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Low'
  },
  medium: {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    label: 'Medium'
  },
  high: {
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    label: 'High'
  }
};

const statusConfig = {
  open: {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: AlertCircle,
    label: 'Open'
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
    label: 'In Progress'
  },
  mitigated: {
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Shield,
    label: 'Mitigated'
  },
  closed: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Target,
    label: 'Closed'
  }
};

export function RiskManagementPanel({ selectedClient }: RiskManagementPanelProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as Risk['severity'],
    likelihood: 'medium' as Risk['likelihood'],
    impact: '',
    mitigation_plan: '',
    status: 'open' as Risk['status'],
    assigned_to: '',
    due_date: undefined as Date | undefined
  });

  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      fetchRisks();
    } else {
      setRisks([]);
    }
  }, [selectedClient]);

  const fetchRisks = async () => {
    if (!selectedClient) return;
    
    setIsLoading(true);
    try {
      const clientRisks = await listRisks(selectedClient.id);
      setRisks(clientRisks);
    } catch (error) {
      console.error('Error fetching risks:', error);
      toast({
        title: "Failed to Load Risks",
        description: "Could not retrieve risk data from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      likelihood: 'medium',
      impact: '',
      mitigation_plan: '',
      status: 'open',
      assigned_to: '',
      due_date: undefined
    });
  };

  const handleCreateRisk = async () => {
    if (!selectedClient || !formData.title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a risk title.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newRisk = await createRisk({
        client_id: selectedClient.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        severity: formData.severity,
        likelihood: formData.likelihood,
        impact: formData.impact.trim() || null,
        mitigation_plan: formData.mitigation_plan.trim() || null,
        status: formData.status,
        assigned_to: formData.assigned_to.trim() || null,
        due_date: formData.due_date?.toISOString()
      });

      setRisks(prev => [newRisk, ...prev]);
      resetForm();
      setShowAddForm(false);

      toast({
        title: "Risk Created",
        description: "New risk has been added successfully.",
      });
    } catch (error) {
      console.error('Error creating risk:', error);
      toast({
        title: "Failed to Create Risk",
        description: "Could not create the risk. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRisk = async (riskId: string, updates: Partial<Risk>) => {
    try {
      const updatedRisk = await updateRisk(riskId, updates);
      setRisks(prev => prev.map(risk => 
        risk.id === riskId ? updatedRisk : risk
      ));

      toast({
        title: "Risk Updated",
        description: "Risk has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating risk:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the risk. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    try {
      await deleteRisk(riskId);
      setRisks(prev => prev.filter(risk => risk.id !== riskId));

      toast({
        title: "Risk Deleted",
        description: "Risk has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting risk:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the risk. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getRiskPriority = (severity: Risk['severity'], likelihood: Risk['likelihood']) => {
    const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[severity];
    const likelihoodScore = { low: 1, medium: 2, high: 3 }[likelihood];
    const priority = severityScore * likelihoodScore;
    
    if (priority >= 9) return { level: 'Critical', color: 'text-red-600' };
    if (priority >= 6) return { level: 'High', color: 'text-orange-600' };
    if (priority >= 3) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-green-600' };
  };

  const getStatusStats = () => {
    const stats = {
      open: risks.filter(r => r.status === 'open').length,
      in_progress: risks.filter(r => r.status === 'in_progress').length,
      mitigated: risks.filter(r => r.status === 'mitigated').length,
      closed: risks.filter(r => r.status === 'closed').length
    };
    return stats;
  };

  const getSeverityStats = () => {
    const stats = {
      critical: risks.filter(r => r.severity === 'critical').length,
      high: risks.filter(r => r.severity === 'high').length,
      medium: risks.filter(r => r.severity === 'medium').length,
      low: risks.filter(r => r.severity === 'low').length
    };
    return stats;
  };

  if (!selectedClient) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-amber-800 font-medium">
          Please select a client project to manage risks.
        </p>
      </div>
    );
  }

  const statusStats = getStatusStats();
  const severityStats = getSeverityStats();

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{statusStats.open}</p>
                <p className="text-sm font-medium text-slate-600">Open Risks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{statusStats.in_progress}</p>
                <p className="text-sm font-medium text-slate-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{severityStats.critical + severityStats.high}</p>
                <p className="text-sm font-medium text-slate-600">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{statusStats.mitigated}</p>
                <p className="text-sm font-medium text-slate-600">Mitigated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Risk Form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Risk</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Risk Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Key stakeholder unavailability"
                  className="border-2 focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Assigned To</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                  placeholder="Team member name"
                  className="border-2 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of the risk..."
                className="min-h-[100px] border-2 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Severity</Label>
                <Select value={formData.severity} onValueChange={(value: Risk['severity']) => 
                  setFormData(prev => ({ ...prev, severity: value }))
                }>
                  <SelectTrigger className="border-2 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Likelihood</Label>
                <Select value={formData.likelihood} onValueChange={(value: Risk['likelihood']) => 
                  setFormData(prev => ({ ...prev, likelihood: value }))
                }>
                  <SelectTrigger className="border-2 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-2 focus:border-blue-500",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? format(formData.due_date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Impact</Label>
              <Textarea
                value={formData.impact}
                onChange={(e) => setFormData(prev => ({ ...prev, impact: e.target.value }))}
                placeholder="Describe the potential impact if this risk occurs..."
                className="min-h-[80px] border-2 focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Mitigation Plan</Label>
              <Textarea
                value={formData.mitigation_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, mitigation_plan: e.target.value }))}
                placeholder="Describe how to prevent or mitigate this risk..."
                className="min-h-[80px] border-2 focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-3 pt-2">
              <Button 
                onClick={handleCreateRisk} 
                disabled={isCreating || !formData.title.trim()}
                className="flex-1 flex items-center justify-center space-x-2 h-10 font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Risk</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risks List */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Project Risks</CardTitle>
              <CardDescription className="text-base font-medium text-slate-600 mt-2">
                Manage and track all identified risks for this project
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Risk</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-600">Loading risks...</span>
              </div>
            </div>
          ) : risks.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <AlertTriangle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="font-semibold text-lg text-slate-700">No risks identified yet</p>
              <p className="text-sm mt-1">Add risks to track and mitigate potential project issues</p>
            </div>
          ) : (
            <div className="space-y-6">
              {risks.map((risk) => {
                const priority = getRiskPriority(risk.severity, risk.likelihood);
                const StatusIcon = statusConfig[risk.status].icon;
                
                return (
                  <div
                    key={risk.id}
                    className="p-6 border-2 border-slate-200 rounded-2xl hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-slate-50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{risk.title}</h3>
                          {risk.description && (
                            <p className="text-base text-slate-700 mb-3">{risk.description}</p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <Badge className={severityConfig[risk.severity].color}>
                              {severityConfig[risk.severity].icon} {severityConfig[risk.severity].label}
                            </Badge>
                            <Badge className={likelihoodConfig[risk.likelihood].color}>
                              Likelihood: {likelihoodConfig[risk.likelihood].label}
                            </Badge>
                            <Badge className={statusConfig[risk.status].color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig[risk.status].label}
                            </Badge>
                            <Badge className={`${priority.color} bg-transparent border`}>
                              Priority: {priority.level}
                            </Badge>
                          </div>

                          {risk.impact && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-slate-700 mb-1">Impact:</p>
                              <p className="text-sm text-slate-600">{risk.impact}</p>
                            </div>
                          )}

                          {risk.mitigation_plan && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-slate-700 mb-1">Mitigation Plan:</p>
                              <p className="text-sm text-slate-600">{risk.mitigation_plan}</p>
                            </div>
                          )}

                          <div className="flex items-center space-x-4 text-sm text-slate-500">
                            {risk.assigned_to && (
                              <div className="flex items-center space-x-1">
                                <User className="w-4 h-4" />
                                <span>Assigned to: {risk.assigned_to}</span>
                              </div>
                            )}
                            {risk.due_date && (
                              <div className="flex items-center space-x-1">
                                <CalendarIcon className="w-4 h-4" />
                                <span>Due: {formatDate(risk.due_date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Select 
                          value={risk.status} 
                          onValueChange={(value: Risk['status']) => 
                            handleUpdateRisk(risk.id, { status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="mitigated">Mitigated</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Risk?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the risk "{risk.title}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRisk(risk.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}