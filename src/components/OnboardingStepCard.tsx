import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Play, 
  Pause, 
  Calendar as CalendarIcon,
  Edit3,
  Save,
  X,
  GripVertical,
  Trash2,
  MessageSquare,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { type OnboardingStep } from '@/lib/supabase';

interface OnboardingStepCardProps {
  step: OnboardingStep;
  onUpdate: (stepId: string, updates: Partial<OnboardingStep>) => void;
  onDelete: (stepId: string) => void;
  index: number;
}

const statusConfig = {
  not_started: {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-700',
    label: 'Not Started'
  },
  in_progress: {
    icon: Play,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    label: 'In Progress'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Completed'
  },
  on_hold: {
    icon: Pause,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    label: 'On Hold'
  }
};

export function OnboardingStepCard({ step, onUpdate, onDelete, index }: OnboardingStepCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(step.title);
  const [editedDescription, setEditedDescription] = useState(step.description || '');
  const [editedInternalNotes, setEditedInternalNotes] = useState(step.internal_notes || '');
  const [editedAssignedTo, setEditedAssignedTo] = useState(step.assigned_to || '');
  const [startDate, setStartDate] = useState<Date | undefined>(
    step.start_date ? new Date(step.start_date) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    step.end_date ? new Date(step.end_date) : undefined
  );

  const config = statusConfig[step.status];
  const StatusIcon = config.icon;

  const handleSave = () => {
    onUpdate(step.id, {
      title: editedTitle,
      description: editedDescription,
      internal_notes: editedInternalNotes,
      assigned_to: editedAssignedTo,
      start_date: startDate?.toISOString(),
      end_date: endDate?.toISOString()
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(step.title);
    setEditedDescription(step.description || '');
    setEditedInternalNotes(step.internal_notes || '');
    setEditedAssignedTo(step.assigned_to || '');
    setStartDate(step.start_date ? new Date(step.start_date) : undefined);
    setEndDate(step.end_date ? new Date(step.end_date) : undefined);
    setIsEditing(false);
  };

  const handleStatusChange = (newStatus: OnboardingStep['status']) => {
    onUpdate(step.id, { status: newStatus });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getDaysRemaining = () => {
    if (!step.end_date) return null;
    const today = new Date();
    const endDate = new Date(step.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-lg",
      config.bgColor,
      config.borderColor,
      "border-2"
    )}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <GripVertical className="w-5 h-5 text-slate-400 mt-1 cursor-move" />
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm">
                  {index + 1}
                </div>
                <StatusIcon className={cn("w-6 h-6", config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="font-semibold text-lg border-2 focus:border-blue-500"
                    placeholder="Step title..."
                  />
                ) : (
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">
                    {step.title}
                  </h3>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Badge className={cn("text-xs font-semibold", config.badge)}>
                {config.label}
              </Badge>
              
              <Badge className={cn(
                "text-xs",
                step.client_visible 
                  ? "bg-blue-100 text-blue-700 border-blue-200" 
                  : "bg-slate-100 text-slate-700 border-slate-200"
              )}>
                {step.client_visible ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Client Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Internal Only
                  </>
                )}
              </Badge>
              
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 w-8 p-0 bg-transparent text-blue-600 hover:bg-blue-100"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="ml-12">
            {isEditing ? (
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="min-h-[100px] border-2 focus:border-blue-500"
                placeholder="Topics of discussion, key points to cover, deliverables..."
              />
            ) : (
              <div className="space-y-3">
                {step.description && (
                  <div className="p-4 bg-white/60 rounded-lg border border-slate-200">
                    <div className="flex items-start space-x-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span className="text-sm font-semibold text-slate-700">Topics of Discussion</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {step.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Client Visibility and Assignment Controls */}
          <div className="ml-12 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Visibility Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <Label htmlFor={`client-visible-${step.id}`} className="text-sm font-semibold text-slate-700">
                    Client Visible
                  </Label>
                  <p className="text-xs text-slate-500">Show this step to the client</p>
                </div>
                <Switch
                  id={`client-visible-${step.id}`}
                  checked={step.client_visible}
                  onCheckedChange={(checked) => onUpdate(step.id, { client_visible: checked })}
                  className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200 border border-slate-300 data-[state=checked]:border-blue-600"
                />
              </div>

              {/* Assignment */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Assigned To</Label>
                {isEditing ? (
                  <Input
                    value={editedAssignedTo}
                    onChange={(e) => setEditedAssignedTo(e.target.value)}
                    placeholder="Team member name..."
                    className="border-2 focus:border-blue-500"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg border border-slate-200">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">
                      {step.assigned_to || 'Unassigned'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          {(isEditing || step.internal_notes) && (
            <div className="ml-12">
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Internal Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editedInternalNotes}
                  onChange={(e) => setEditedInternalNotes(e.target.value)}
                  className="min-h-[80px] border-2 focus:border-blue-500"
                  placeholder="Internal team notes, reminders, or additional context..."
                />
              ) : step.internal_notes ? (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-900 whitespace-pre-wrap">
                    {step.internal_notes}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Status and Timeline Controls */}
          <div className="ml-12 space-y-4">
            {/* Status Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-semibold text-slate-700 w-16">Status:</label>
              <Select value={step.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Start Date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (!isEditing) {
                          onUpdate(step.id, { start_date: date?.toISOString() });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">End Date:</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        if (!isEditing) {
                          onUpdate(step.id, { end_date: date?.toISOString() });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Timeline Summary */}
            {(step.start_date || step.end_date || daysRemaining !== null) && (
              <div className="flex items-center space-x-4 text-sm">
                {step.start_date && (
                  <div className="flex items-center space-x-1 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Starts {formatDate(step.start_date)}</span>
                  </div>
                )}
                {daysRemaining !== null && (
                  <div className={cn(
                    "flex items-center space-x-1 font-semibold",
                    daysRemaining < 0 ? "text-red-600" : 
                    daysRemaining <= 3 ? "text-orange-600" : "text-slate-600"
                  )}>
                    <Clock className="w-4 h-4" />
                    <span>
                      {daysRemaining < 0 
                        ? `${Math.abs(daysRemaining)} days overdue`
                        : daysRemaining === 0 
                          ? "Due today"
                          : `${daysRemaining} days remaining`
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete Button */}
          <div className="ml-12 pt-2 border-t border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(step.id)}
              className="bg-transparent text-red-600 hover:text-red-700 hover:bg-red-50 border-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Step
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}