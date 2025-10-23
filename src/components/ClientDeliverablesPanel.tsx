import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { FileUpload } from './FileUpload';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Save, 
  X, 
  Trash2, 
  Download,
  ExternalLink,
  Clock,
  Package,
  Target,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { 
  createClientDeliverable,
  listClientDeliverables,
  updateClientDeliverable,
  deleteClientDeliverable,
  type ClientDeliverable,
  type Client
} from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ClientDeliverablesPanelProps {
  selectedClient: Client | null;
}

const MILESTONE_SUGGESTIONS = [
  'Phase 1: Discovery & Analysis',
  'Phase 2: Strategy Development',
  'Phase 3: Implementation Planning',
  'Phase 4: Execution & Monitoring',
  'Final Report & Recommendations',
  'Executive Summary',
  'Technical Documentation',
  'Training Materials',
  'Handover Documentation'
];

export function ClientDeliverablesPanel({ selectedClient }: ClientDeliverablesPanelProps) {
  const [deliverables, setDeliverables] = useState<ClientDeliverable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeliverableId, setEditingDeliverableId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    milestoneName: '',
    title: '',
    description: '',
    version: '1.0',
    file: null as File | null
  });

  // Edit state
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    version: '',
    milestoneName: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (selectedClient) {
      fetchDeliverables();
    } else {
      setDeliverables([]);
    }
  }, [selectedClient]);

  const fetchDeliverables = async () => {
    if (!selectedClient) return;
    
    setIsLoading(true);
    try {
      const clientDeliverables = await listClientDeliverables(selectedClient.id);
      setDeliverables(clientDeliverables);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      toast({
        title: "Failed to Load Deliverables",
        description: "Could not retrieve client deliverables from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      milestoneName: '',
      title: '',
      description: '',
      version: '1.0',
      file: null
    });
  };

  const handleFileUpload = (file: File) => {
    setFormData(prev => ({ ...prev, file }));
  };

  const handleCreateDeliverable = async () => {
    if (!selectedClient || !formData.file || !formData.milestoneName.trim() || !formData.title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide milestone name, title, and select a file.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newDeliverable = await createClientDeliverable(
        formData.file,
        selectedClient.id,
        formData.milestoneName.trim(),
        formData.title.trim(),
        formData.description.trim() || undefined,
        formData.version.trim()
      );

      setDeliverables(prev => [newDeliverable, ...prev]);
      resetForm();
      setShowAddForm(false);

      toast({
        title: "Deliverable Created",
        description: "Client deliverable has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Error creating deliverable:', error);
      toast({
        title: "Failed to Create Deliverable",
        description: "Could not upload the deliverable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditDeliverable = (deliverable: ClientDeliverable) => {
    setEditingDeliverableId(deliverable.id);
    setEditData({
      title: deliverable.title,
      description: deliverable.description || '',
      version: deliverable.version,
      milestoneName: deliverable.milestone_name
    });
  };

  const handleSaveEdit = async (deliverableId: string) => {
    try {
      const updatedDeliverable = await updateClientDeliverable(deliverableId, {
        title: editData.title,
        description: editData.description || undefined,
        version: editData.version,
        milestone_name: editData.milestoneName
      });

      setDeliverables(prev => prev.map(d => 
        d.id === deliverableId ? updatedDeliverable : d
      ));

      setEditingDeliverableId(null);

      toast({
        title: "Deliverable Updated",
        description: "Deliverable has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the deliverable. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    try {
      await deleteClientDeliverable(deliverableId);
      setDeliverables(prev => prev.filter(d => d.id !== deliverableId));

      toast({
        title: "Deliverable Deleted",
        description: "Deliverable has been removed successfully.",
      });
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete the deliverable. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (deliverable: ClientDeliverable) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-deliverables')
        .createSignedUrl(deliverable.document_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        toast({
          title: "Failed to Access File",
          description: "Could not generate access URL for the deliverable.",
          variant: "destructive",
        });
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error accessing deliverable:', error);
      toast({
        title: "Access Failed",
        description: "Could not access the deliverable file.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupDeliverablesByMilestone = () => {
    const grouped: Record<string, ClientDeliverable[]> = {};
    deliverables.forEach(deliverable => {
      if (!grouped[deliverable.milestone_name]) {
        grouped[deliverable.milestone_name] = [];
      }
      grouped[deliverable.milestone_name].push(deliverable);
    });
    return grouped;
  };

  if (!selectedClient) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-amber-800 font-medium">
          Please select a client project to manage deliverables.
        </p>
      </div>
    );
  }

  const groupedDeliverables = groupDeliverablesByMilestone();
  const milestoneCount = Object.keys(groupedDeliverables).length;
  const totalDeliverables = deliverables.length;

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{milestoneCount}</p>
                <p className="text-sm font-medium text-slate-600">Milestones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalDeliverables}</p>
                <p className="text-sm font-medium text-slate-600">Total Deliverables</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {deliverables.reduce((sum, d) => sum + d.file_size, 0) > 0 
                    ? formatFileSize(deliverables.reduce((sum, d) => sum + d.file_size, 0))
                    : '0 MB'
                  }
                </p>
                <p className="text-sm font-medium text-slate-600">Total Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Deliverable Form */}
      {showAddForm && (
        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Deliverable</h3>
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
                <Label className="text-sm font-semibold text-slate-700">Milestone Name *</Label>
                <Input
                  value={formData.milestoneName}
                  onChange={(e) => setFormData(prev => ({ ...prev, milestoneName: e.target.value }))}
                  placeholder="e.g., Phase 1: Discovery & Analysis"
                  className="border-2 focus:border-blue-500"
                  list="milestone-suggestions"
                />
                <datalist id="milestone-suggestions">
                  {MILESTONE_SUGGESTIONS.map(suggestion => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700">Version</Label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.0"
                  className="border-2 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Discovery Phase Findings Report"
                className="border-2 focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the deliverable content and purpose..."
                className="min-h-[100px] border-2 focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Document File *</Label>
              <FileUpload
                onFileUpload={handleFileUpload}
                acceptedTypes={['.pdf', '.docx', '.pptx', '.xlsx', '.txt']}
                maxSize={50 * 1024 * 1024} // 50MB
                uploadedFile={formData.file ? {
                  id: 'temp',
                  name: formData.file.name,
                  size: formData.file.size,
                  type: formData.file.type,
                  url: ''
                } : null}
              />
            </div>
            
            <div className="flex space-x-3 pt-2">
              <Button 
                onClick={handleCreateDeliverable} 
                disabled={isCreating || !formData.file || !formData.milestoneName.trim() || !formData.title.trim()}
                className="flex-1 flex items-center justify-center space-x-2 h-10 font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Deliverable</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables List */}
      <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Project Deliverables</CardTitle>
              <CardDescription className="text-base font-medium text-slate-600 mt-2">
                Organized by milestone for easy client access and reference
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Deliverable</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-slate-600">Loading deliverables...</span>
              </div>
            </div>
          ) : Object.keys(groupedDeliverables).length === 0 ? (
            <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="font-semibold text-lg text-slate-700">No deliverables yet</p>
              <p className="text-sm mt-1">Add milestone deliverables to share with your client</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedDeliverables).map(([milestoneName, milestoneDeliverables]) => (
                <div key={milestoneName} className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Target className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-slate-900">{milestoneName}</h3>
                    <Badge variant="secondary" className="text-sm font-semibold">
                      {milestoneDeliverables.length} deliverable{milestoneDeliverables.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4 ml-8">
                    {milestoneDeliverables.map((deliverable) => (
                      <div
                        key={deliverable.id}
                        className="p-6 border-2 border-slate-200 rounded-2xl hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-slate-50"
                      >
                        {editingDeliverableId === deliverable.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Title</Label>
                                <Input
                                  value={editData.title}
                                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                  className="border-2 focus:border-blue-500"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-semibold text-slate-700">Version</Label>
                                <Input
                                  value={editData.version}
                                  onChange={(e) => setEditData(prev => ({ ...prev, version: e.target.value }))}
                                  className="border-2 focus:border-blue-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-700">Milestone Name</Label>
                              <Input
                                value={editData.milestoneName}
                                onChange={(e) => setEditData(prev => ({ ...prev, milestoneName: e.target.value }))}
                                className="border-2 focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-slate-700">Description</Label>
                              <Textarea
                                value={editData.description}
                                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                className="min-h-[80px] border-2 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleSaveEdit(deliverable.id)}
                                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700"
                                size="sm"
                              >
                                <Save className="w-4 h-4" />
                                <span>Save</span>
                              </Button>
                              <Button
                                onClick={() => setEditingDeliverableId(null)}
                                variant="outline"
                                size="sm"
                              >
                                <X className="w-4 h-4" />
                                <span>Cancel</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h4 className="text-lg font-bold text-slate-900">{deliverable.title}</h4>
                                  <Badge variant="outline" className="text-xs font-semibold">
                                    v{deliverable.version}
                                  </Badge>
                                </div>
                                
                                {deliverable.description && (
                                  <p className="text-base text-slate-700 mb-3">{deliverable.description}</p>
                                )}
                                
                                <div className="flex items-center space-x-4 text-sm text-slate-500">
                                  <div className="flex items-center space-x-1">
                                    <FileText className="w-4 h-4" />
                                    <span>{deliverable.file_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Package className="w-4 h-4" />
                                    <span>{formatFileSize(deliverable.file_size)}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatDate(deliverable.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              <Button
                                onClick={() => handleDownload(deliverable)}
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-300 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View
                              </Button>
                              
                              <Button
                                onClick={() => handleEditDeliverable(deliverable)}
                                variant="outline"
                                size="sm"
                                className="text-slate-600 border-slate-300 hover:text-slate-700 hover:bg-slate-50"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              
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
                                    <AlertDialogTitle>Delete Deliverable?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete "{deliverable.title}" and remove the file from storage.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteDeliverable(deliverable.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {milestoneName !== Object.keys(groupedDeliverables)[Object.keys(groupedDeliverables).length - 1] && (
                    <Separator className="my-8" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}