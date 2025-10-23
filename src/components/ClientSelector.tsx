import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Users, Plus, Check, Loader2, Building2, X, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient, listClients, deleteClientAndAssociatedData, type Client } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
}

export function ClientSelector({ selectedClient, onClientSelect }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAppUrl, setNewClientAppUrl] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [clientNameToConfirm, setClientNameToConfirm] = useState('');
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 8; // 2 rows of 4 cards each
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  // Auto-open create form when no clients exist
  useEffect(() => {
    if (!isLoading && clients.length === 0) {
      setShowCreateForm(true);
    }
  }, [isLoading, clients.length]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const clientList = await listClients();
      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Failed to Load Clients",
        description: "Could not retrieve client list from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({
        title: "Client Name Required",
        description: "Please enter a name for the new client.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newClient = await createClient(
        newClientName.trim(),
        newClientAppUrl.trim() || undefined
      );
      setClients(prev => [newClient, ...prev]);
      onClientSelect(newClient);
      setNewClientName('');
      setNewClientAppUrl('');
      setShowCreateForm(false);
      
      toast({
        title: "Client Created Successfully",
        description: `"${newClient.name}" has been added to your client list.`,
      });
    } catch (error: any) {
      console.error('Error creating client:', error);
      const errorMessage = error.message?.includes('duplicate') 
        ? 'A client with this name already exists.'
        : 'Failed to create client. Please try again.';
      
      toast({
        title: "Failed to Create Client",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUnselectClient = () => {
    onClientSelect(null);
    toast({
      title: "Client Unselected",
      description: "You can now choose a different client or create a new one.",
    });
  };

  const handleDeleteClient = async (client: Client) => {
    try {
      await deleteClientAndAssociatedData(client.id);
      
      // Update local state by removing the deleted client
      setClients(prev => prev.filter(c => c.id !== client.id));
      
      // If the deleted client was selected, unselect it
      if (selectedClient?.id === client.id) {
        onClientSelect(null);
      }
      
      // Reset confirmation state
      setShowDeleteConfirmDialog(false);
      setClientNameToConfirm('');
      setClientToDelete(null);
      
      toast({
        title: "Client Deleted Successfully",
        description: `All data for "${client.name}" has been permanently removed.`,
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Failed to Delete Client",
        description: error instanceof Error ? error.message : "Could not delete the client. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(clients.length / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const endIndex = startIndex + clientsPerPage;
  const currentClients = clients.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-8">
        <CardTitle className="text-3xl font-bold text-slate-900 flex items-center space-x-4">
          <Building2 className="w-8 h-8 text-blue-600" />
          <span>Select Client</span>
        </CardTitle>
        <CardDescription className="text-lg font-medium text-slate-600 mt-3">
          Choose an existing client or create a new one to manage their onboarding documents.
          {selectedClient && (
            <span className="block mt-3 text-blue-600 font-semibold">
              Currently selected: {selectedClient.name}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Action Buttons Section */}
        <div className="space-y-6">
          <div className="flex space-x-4">
            {!showCreateForm ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex-1 flex items-center justify-center space-x-3 h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              >
                <Plus className="w-6 h-6" />
                <span>Create New Client</span>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewClientName('');
                  setNewClientAppUrl('');
                }}
                variant="outline"
                className="flex-1 flex items-center justify-center space-x-3 h-14 text-lg font-bold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300"
              >
                <X className="w-6 h-6" />
                <span>Cancel</span>
              </Button>
            )}
            
            {selectedClient && (
              <Button
                onClick={handleUnselectClient}
                variant="outline"
                className="flex items-center justify-center space-x-3 h-14 text-lg font-bold text-slate-600 hover:text-slate-900 border-2 border-slate-300 hover:border-slate-400 rounded-xl hover:bg-slate-50 transition-all duration-300"
              >
                <X className="w-6 h-6" />
                <span>Unselect Client</span>
              </Button>
            )}
          </div>

          {showCreateForm && (
            <div className="p-8 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200 space-y-6">
              <div className="space-y-3">
                <label htmlFor="clientName" className="text-base font-semibold text-slate-800">
                  Client Name
                </label>
                <Input
                  id="clientName"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Enter client name..."
                  className="w-full h-12 text-base font-medium border-2 rounded-xl focus:border-blue-500 transition-all duration-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateClient();
                    }
                  }}
                />
              </div>
              
              <div className="space-y-3">
                <label htmlFor="clientAppUrl" className="text-base font-semibold text-slate-800">
                  App URL (Optional)
                </label>
                <Input
                  id="clientAppUrl"
                  value={newClientAppUrl}
                  onChange={(e) => setNewClientAppUrl(e.target.value)}
                  placeholder="https://your-client-app.com"
                  className="w-full h-12 text-base font-medium border-2 rounded-xl focus:border-blue-500 transition-all duration-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateClient();
                    }
                  }}
                />
              </div>
              <div className="flex space-x-4">
                <Button
                  onClick={handleCreateClient}
                  disabled={isCreating || !newClientName.trim()}
                  className="flex-1 flex items-center justify-center space-x-3 h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>Create Client</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Clients Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Existing Clients</span>
            </h3>
            {clients.length > 0 && (
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="text-base font-semibold px-4 py-2">
                  {clients.length} client{clients.length !== 1 ? 's' : ''}
                </Badge>
                {totalPages > 1 && (
                  <Badge variant="outline" className="text-base font-semibold px-4 py-2">
                    Page {currentPage} of {totalPages}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-slate-600">Loading clients...</span>
              </div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50">
              <Users className="w-16 h-16 text-slate-400 mx-auto mb-6" />
              <p className="font-semibold text-xl text-slate-700">No clients found</p>
              <p className="text-base mt-3 font-medium">Create your first client to get started</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Client Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentClients.map((client) => (
                  <Card
                    key={client.id}
                    className="border-2 border-slate-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-slate-50 hover:scale-[1.02] group"
                    onClick={showDeleteConfirmDialog ? undefined : () => onClientSelect(client)}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300 ${
                              selectedClient?.id === client.id ? 'bg-blue-100' : 'bg-slate-100'
                            }`}>
                              {selectedClient?.id === client.id ? (
                                <Check className="w-6 h-6 text-blue-600" />
                              ) : (
                                <Building2 className="w-6 h-6 text-slate-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors duration-300">
                                {client.name}
                              </h3>
                              <p className="text-sm text-slate-600 truncate">
                                Created {formatDate(client.created_at)}
                              </p>
                            </div>
                          </div>
                          {selectedClient?.id === client.id && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
                              Selected
                            </Badge>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClientSelect(client);
                            }}
                            disabled={selectedClient?.id === client.id}
                            className={`w-full text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 ${
                              selectedClient?.id === client.id 
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25 text-white' 
                                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-xl text-white'
                            }`}
                          >
                            {selectedClient?.id === client.id ? (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Selected
                              </>
                            ) : (
                              'Select Client'
                            )}
                          </Button>
                          
                          <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
                            <AlertDialogTrigger asChild>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setClientToDelete(client);
                                  setClientNameToConfirm('');
                                }}
                                variant="outline"
                                className="w-full text-sm font-bold px-4 py-2 rounded-xl transition-all duration-300 text-red-600 border-red-300 hover:text-red-700 hover:bg-red-50 hover:border-red-400 shadow-sm hover:shadow-md"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center space-x-2 text-red-600">
                                  <AlertCircle className="w-5 h-5" />
                                  <span>Permanently Delete Client?</span>
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-4">
                                  <div className="text-slate-700">
                                    This action <strong>cannot be undone</strong>. This will permanently delete:
                                  </div>
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <ul className="space-y-2 text-sm text-red-800">
                                      <li className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                        <span>Client record for <strong>{clientToDelete?.name}</strong></span>
                                      </li>
                                      <li className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                        <span>All uploaded SOW documents</span>
                                      </li>
                                      <li className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                        <span>All onboarding steps and project data</span>
                                      </li>
                                      <li className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                                        <span>Email engagement history</span>
                                      </li>
                                    </ul>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="text-sm font-semibold text-slate-700">
                                      To confirm, type the client's name below:
                                    </div>
                                    <Input
                                      value={clientNameToConfirm}
                                      onChange={(e) => setClientNameToConfirm(e.target.value)}
                                      placeholder={clientToDelete?.name || ''}
                                      className="border-2 focus:border-red-500"
                                    />
                                  </div>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel 
                                  onClick={() => {
                                    setClientNameToConfirm('');
                                    setClientToDelete(null);
                                  }}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => clientToDelete && handleDeleteClient(clientToDelete)}
                                  disabled={clientNameToConfirm !== clientToDelete?.name}
                                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:bg-slate-300 disabled:text-slate-500"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Client
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-2 h-10 px-4 font-semibold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => handlePageChange(page)}
                        className={`h-10 w-10 p-0 font-bold rounded-xl transition-all duration-300 ${
                          currentPage === page 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                            : 'border-2 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-2 h-10 px-4 font-semibold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}