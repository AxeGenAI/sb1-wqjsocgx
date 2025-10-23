import React from 'react';
import { type OnboardingStep } from '@/lib/supabase';
import { format, differenceInDays, addDays } from 'date-fns';

interface ProjectGanttChartProps {
  steps: OnboardingStep[];
  onTaskUpdate?: (taskId: string, updates: Partial<OnboardingStep>) => void;
  readOnly?: boolean;
  clientView?: boolean;
}

export function ProjectGanttChart({ 
  steps, 
  onTaskUpdate, 
  readOnly = false, 
  clientView = false 
}: ProjectGanttChartProps) {
  const filteredSteps = clientView ? steps.filter(step => step.client_visible) : steps;

  if (filteredSteps.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-2">No project steps available</p>
          <p className="text-gray-400 text-sm">Add some onboarding steps to see the Gantt chart</p>
        </div>
      </div>
    );
  }

  // Calculate date range for the chart
  const allDates = filteredSteps.flatMap(step => [
    step.start_date ? new Date(step.start_date) : new Date(),
    step.end_date ? new Date(step.end_date) : addDays(new Date(), 7)
  ]);
  
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'on_hold':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      case 'on_hold':
        return 25;
      default:
        return 0;
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
        <p className="text-sm text-gray-600">
          {clientView ? 'Project progress overview' : 'Visual timeline of project milestones'}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header with dates */}
          <div className="flex mb-4">
            <div className="w-64 flex-shrink-0"></div>
            <div className="flex-1 flex">
              {Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
                const date = addDays(minDate, i);
                return (
                  <div key={i} className="flex-1 text-xs text-center py-2 border-l border-gray-200">
                    {format(date, 'MMM d')}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks */}
          <div className="space-y-2">
            {filteredSteps.map((step) => {
              const startDate = step.start_date ? new Date(step.start_date) : new Date();
              const endDate = step.end_date ? new Date(step.end_date) : addDays(startDate, 7);
              
              const startOffset = differenceInDays(startDate, minDate);
              const duration = differenceInDays(endDate, startDate) + 1;
              const progress = getStatusProgress(step.status);

              return (
                <div key={step.id} className="flex items-center">
                  {/* Task name */}
                  <div className="w-64 flex-shrink-0 pr-4">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {step.assigned_to && `Assigned to: ${step.assigned_to}`}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex-1 relative h-8 bg-gray-100 rounded">
                    <div
                      className={`absolute top-1 bottom-1 rounded ${getStatusColor(step.status)} flex items-center`}
                      style={{
                        left: `${(startOffset / Math.min(totalDays, 30)) * 100}%`,
                        width: `${(duration / Math.min(totalDays, 30)) * 100}%`,
                        minWidth: '20px'
                      }}
                    >
                      {/* Progress indicator */}
                      <div
                        className="h-full bg-white bg-opacity-30 rounded-l"
                        style={{ width: `${progress}%` }}
                      ></div>
                      
                      {/* Task label */}
                      <span className="text-xs text-white font-medium px-2 truncate">
                        {step.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-gray-400 rounded"></div>
          <span className="text-gray-600">Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-600">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-600">On Hold</span>
        </div>
      </div>
    </div>
  );
}