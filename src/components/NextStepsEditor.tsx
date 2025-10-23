import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, FileText, CheckCircle2, Circle, Edit3, Save, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { ListChecks } from 'lucide-react';
import { 
  updateOnboardingStep,
  deleteOnboardingStep,
  createOnboardingStep,
  type OnboardingStep,
  type Client 
} from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface NextStepsEditorProps {
  nextSteps: OnboardingStep[];
  onNextStepsChange: (steps: OnboardingStep[]) => void;
  selectedClient: Client | null;
}

export function NextStepsEditor({ 
  nextSteps, 
  onNextStepsChange, 
  selectedClient 
}: NextStepsEditorProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editedSteps, setEditedSteps] = useState<Record<string, { title: string; description: string }>>({});
  const { toast } = useToast();

  const clientVisibleSteps = nextSteps.filter(step => step.client_visible);
  const completedSteps = nextSteps.filter(step => step.status === 'completed').length;

  const handleEditStep = (step: OnboardingStep) => {
    setEditingStepId(step.id);
    setEditedSteps(prev => ({
      ...prev,
      [step.id]: {
        title: step.title,
        description: step.description || ''
      }
    }));
  };

  const handleSaveStep = async (stepId: string) => {
    if (!selectedClient) return;

    try {
      const editedData = editedSteps[stepId];
      const updatedStep = await updateOnboardingStep(stepId, {
        title: editedData.title,
        description: editedData.description
      });

      onNextStepsChange(nextSteps.map(step => 
        step.id === stepId ? updatedStep : step
      ));

      setEditingStepId(null);
      setEditedSteps(prev => {
        const newState = { ...prev };
        delete newState[stepId];
        return newState;
      });

      toast({
        title: "Step Updated",
        description: "Checklist item has been updated successfully.",
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

  const handleCancelEdit = (stepId: string) => {
    setEditingStepId(null);
    setEditedSteps(prev => {
      const newState = { ...prev };
      delete newState[stepId];
      return newState;
    });
  };

  const handleDeleteStep = async (stepId: string) => {
    try {
      await deleteOnboardingStep(stepId);
      onNextStepsChange(nextSteps.filter(step => step.id !== stepId));

      toast({
        title: "Step Removed",
        description: "Checklist item has been deleted successfully.",
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

  const handleToggleVisibility = async (stepId: string, currentVisibility: boolean) => {
    try {
      const updatedStep = await updateOnboardingStep(stepId, {
        client_visible: !currentVisibility
      });

      onNextStepsChange(nextSteps.map(step => 
        step.id === stepId ? updatedStep : step
      ));

      toast({
        title: "Visibility Updated",
        description: `Step is now ${!currentVisibility ? 'visible to' : 'hidden from'} client.`,
      });
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: "Update Failed",
        description: "Could not update step visibility. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddStep = async () => {
    if (!selectedClient || !newStepTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a title for the new step.",
        variant: "destructive",
      });
      return;
    }

    setIsAddingStep(true);
    try {
      const newStep = await createOnboardingStep({
        client_id: selectedClient.id,
        title: newStepTitle.trim(),
        description: newStepDescription.trim() || null,
        status: 'not_started',
        order_index: nextSteps.length,
        client_visible: true
      });

      onNextStepsChange([...nextSteps, newStep]);
      setNewStepTitle('');
      setNewStepDescription('');
      setShowAddForm(false);

      toast({
        title: "Step Added",
        description: "New checklist item has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating step:', error);
      toast({
        title: "Failed to Add Step",
        description: "Could not create the new step. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingStep(false);
    }
  };

  const handleCancelAdd = () => {
    setNewStepTitle('');
    setNewStepDescription('');
    setShowAddForm(false);
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
              <ListChecks className="w-7 h-7 text-blue-600" />
              <span>Client Checklist Preview</span>
            </CardTitle>
            <CardDescription className="text-base font-medium text-slate-600 mt-2">
              Edit and manage the checklist items that will appear to your client
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Step</span>
            </Button>
            {nextSteps.length > 0 && (
              <div className="text-right">
                <Badge variant="secondary" className="text-sm font-semibold">
                  {completedSteps}/{nextSteps.length} Complete
                </Badge>
                <div className="text-xs text-slate-500 mt-1">
                  {clientVisibleSteps.length} client-visible
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pb-8">
        {/* Add Step Form */}
        {showAddForm && (
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Add New Checklist Item</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelAdd}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Step Title</Label>
                <Input
                  value={newStepTitle}
                  onChange={(e) => setNewStepTitle(e.target.value)}
                  placeholder="e.g., Initial Stakeholder Alignment"
                  className="font-semibold border-2 focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Description</Label>
                <Textarea
                  value={newStepDescription}
                  onChange={(e) => setNewStepDescription(e.target.value)}
                  placeholder="Describe what this step involves..."
                  className="min-h-[100px] border-2 focus:border-blue-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <Button 
                  onClick={handleAddStep} 
                  disabled={isAddingStep || !newStepTitle.trim()}
                  className="flex-1 flex items-center justify-center space-x-2 h-10 font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {isAddingStep ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Step</span>
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelAdd}
                  className="px-6 h-10 font-semibold border-2 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editable Client Checklist View */}
        <div className="space-y-4">
          {nextSteps.length > 0 ? (
            nextSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start space-x-4 p-6 rounded-2xl border-2 transition-all duration-300 ${
                  step.status === 'completed'
                    ? 'bg-emerald-50 border-emerald-200'
                    : step.status === 'in_progress'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-slate-300 text-slate-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {editingStepId === step.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editedSteps[step.id]?.title || ''}
                        onChange={(e) => setEditedSteps(prev => ({
                          ...prev,
                          [step.id]: { ...prev[step.id], title: e.target.value }
                        }))}
                        className="font-bold text-lg border-2 focus:border-blue-500"
                      />
                      <Textarea
                        value={editedSteps[step.id]?.description || ''}
                        onChange={(e) => setEditedSteps(prev => ({
                          ...prev,
                          [step.id]: { ...prev[step.id], description: e.target.value }
                        }))}
                        className="min-h-[80px] border-2 focus:border-blue-500"
                        placeholder="Add description..."
                      />
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 leading-tight mb-2">
                        {step.title}
                      </h4>
                      {step.description && (
                        <p className="text-base text-slate-700 leading-relaxed">
                          {step.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {/* Client Visibility Toggle */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleVisibility(step.id, step.client_visible)}
                      className={`h-8 w-8 p-0 ${step.client_visible ? 'text-blue-600 hover:bg-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={step.client_visible ? 'Visible to client' : 'Hidden from client'}
                    >
                      {step.client_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                  </div>

                  {editingStepId === step.id ? (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveStep(step.id)}
                        className="h-8 w-8 p-0 hover:bg-emerald-100 text-emerald-600"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelEdit(step.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStep(step)}
                        className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStep(step.id)}
                        className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="font-semibold text-lg">Generate content first to see your checklist preview</p>
              <p className="text-sm mt-1">Client-visible steps will appear here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}