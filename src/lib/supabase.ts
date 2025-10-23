import * as SupabaseJS from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = SupabaseJS.createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  app_url?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDocument {
  id: string;
  client_id: string;
  document_path: string;
  document_type: 'sow' | 'kickoff_material';
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface OnboardingStep {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  start_date?: string;
  end_date?: string;
  order_index: number;
  client_visible: boolean;
  internal_notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface UniversalDocument {
  id: string;
  document_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
  url?: string; // Public URL for easy access
}

export interface UniversalDocument {
  id: string;
  document_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
  url?: string; // Public URL for easy access
}

export interface ClientEngagement {
  id: string;
  client_id: string;
  status: 'draft' | 'sent' | 'in_progress' | 'completed' | 'on_hold';
  email_sent_at?: string;
  client_email?: string;
  welcome_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Risk {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high';
  impact?: string;
  mitigation_plan?: string;
  status: 'open' | 'in_progress' | 'mitigated' | 'closed';
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientDeliverable {
  id: string;
  client_id: string;
  milestone_name: string;
  title: string;
  description?: string;
  document_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureRequest {
  id: string;
  client_id: string;
  sow_document_id?: string;
  nda_document_id?: string;
  recipient_name: string;
  recipient_email: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'voided';
  external_request_id?: string;
  signed_document_url?: string;
  signing_url?: string;
  signer_typed_signature?: string;
  signed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureRequest {
  id: string;
  client_id: string;
  sow_document_id?: string;
  nda_document_id?: string;
  recipient_name: string;
  recipient_email: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'voided';
  external_request_id?: string;
  signed_document_url?: string;
  created_at: string;
  updated_at: string;
}

// File upload helper
export const uploadFile = async (file: File, bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    ...data,
    publicUrl
  };
};

// List files in a bucket
export const listBucketFiles = async (bucketName: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw error;
    }

    // Filter out folders, placeholder files, and other system files
    const files = data
      .filter(file => {
        // Skip if no name
        if (!file.name) return false;
        
        // Skip folders (names ending with '/')
        if (file.name.endsWith('/')) return false;
        
        // Skip placeholder files and other system files
        if (file.name === '.emptyFolderPlaceholder') return false;
        if (file.name.startsWith('.')) return false;
        
        return true;
      })
      .map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(file.name);

        return {
          id: file.id || file.name,
          name: file.name,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || 'application/octet-stream',
          url: publicUrl,
          path: file.name,
          created_at: file.created_at,
          updated_at: file.updated_at
        };
      });

    return files;
  } catch (error) {
    console.error('Error listing bucket files:', error);
    throw new Error('Failed to fetch existing files');
  }
};

// Client management functions
export const createClient = async (name: string, appUrl?: string): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .insert([{ name, app_url: appUrl }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const listClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const updateClient = async (
  clientId: string,
  updates: Partial<Pick<Client, 'name' | 'app_url' | 'logo_url'>>
): Promise<Client> => {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const associateDocumentWithClient = async (
  clientId: string,
  documentPath: string,
  documentType: 'sow',
  fileName: string,
  fileSize: number,
  fileType: string
): Promise<ClientDocument> => {
  const { data, error } = await supabase
    .from('client_documents')
    .insert([{
      client_id: clientId,
      document_path: documentPath,
      document_type: documentType,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Universal Document management functions
export const createUniversalDocument = async (
  file: File,
  bucket: string,
  path: string
): Promise<UniversalDocument> => {
  const uploadResult = await uploadFile(file, bucket, path);

  const { data, error } = await supabase
    .from('universal_documents')
    .insert([{
      document_path: path,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type
    }])
    .select()
    .single();

  if (error) {
    // If database insert fails, try to delete the uploaded file to prevent orphans
    try {
      await deleteStorageFile(bucket, path);
    } catch (storageError) {
      console.error('Failed to clean up storage file after DB insert error:', storageError);
    }
    throw error;
  }

  return { ...data, url: uploadResult.publicUrl };
};

export const listUniversalDocuments = async (): Promise<UniversalDocument[]> => {
  const { data, error } = await supabase
    .from('universal_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  // Add public URLs to the documents
  return (data || []).map(doc => ({
    ...doc,
    url: getFileUrl('kickoff-materials', doc.document_path)
  }));
};

export const removeUniversalDocument = async (documentId: string): Promise<void> => {
  const { data: document, error: fetchError } = await supabase
    .from('universal_documents')
    .select('document_path')
    .eq('id', documentId)
    .single();

  if (fetchError) throw fetchError;
  if (!document) throw new Error('Universal document not found');

  await deleteStorageFile('kickoff-materials', document.document_path); // Delete from storage

  const { error } = await supabase
    .from('universal_documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
};

export const listClientDocuments = async (
  clientId: string,
  documentType?: 'sow'
) => {
  let query = supabase
    .from('client_documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (documentType) {
    query = query.eq('document_type', documentType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Convert to UploadedFile format and get public URLs
  const files = (data || []).map(doc => {
    const bucket = 'sow-documents'; // Only SOWs are stored in client_documents now
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(doc.document_path);

    return {
      id: doc.id,
      name: doc.file_name,
      size: doc.file_size,
      type: doc.file_type,
      url: publicUrl,
      path: doc.document_path,
      created_at: doc.created_at,
      updated_at: doc.created_at
    };
  });

  return files;
};

export const removeClientDocument = async (documentId: string): Promise<void> => {
  // First, get the document details to know which file to delete from storage
  const { data: document, error: fetchError } = await supabase
    .from('client_documents')
    .select('document_path, document_type')
    .eq('id', documentId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (document) {
    // Delete the file from storage first
    const bucket = 'sow-documents'; // Only SOWs are stored in client_documents now
    try {
      await deleteStorageFile(bucket, document.document_path);
    } catch (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
      // This prevents orphaned database records
    }
  }

  // Then delete the record from the database
  const { error } = await supabase
    .from('client_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw error;
  }
};

// Helper function to delete files from Supabase Storage
export const deleteStorageFile = async (bucket: string, path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw error;
  }
};

// Helper function to get public URL for a file
export const getFileUrl = (bucket: string, path: string): string => {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return publicUrl;
};

// Onboarding Steps management functions
export const createOnboardingStep = async (step: Partial<OnboardingStep>): Promise<OnboardingStep> => {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .insert([step])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const listOnboardingSteps = async (clientId: string): Promise<OnboardingStep[]> => {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .select('*')
    .eq('client_id', clientId)
    .order('order_index', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
};

export const listClientVisibleSteps = async (clientId: string): Promise<OnboardingStep[]> => {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .select('*')
    .eq('client_id', clientId)
    .eq('client_visible', true)
    .order('order_index', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
};
export const updateOnboardingStep = async (
  stepId: string, 
  updates: Partial<OnboardingStep>
): Promise<OnboardingStep> => {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .update(updates)
    .eq('id', stepId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteOnboardingStep = async (stepId: string): Promise<void> => {
  const { error } = await supabase
    .from('onboarding_steps')
    .delete()
    .eq('id', stepId);

  if (error) {
    throw error;
  }
};

// Delete all onboarding steps for a specific client
export const deleteAllOnboardingSteps = async (clientId: string): Promise<void> => {
  const { error } = await supabase
    .from('onboarding_steps')
    .delete()
    .eq('client_id', clientId);

  if (error) {
    throw error;
  }
};

// Client Engagement management functions
export const createClientEngagement = async (
  clientId: string,
  clientEmail: string,
  welcomeMessage: string
): Promise<ClientEngagement> => {
  const { data, error } = await supabase
    .from('client_engagements')
    .insert([{
      client_id: clientId,
      client_email: clientEmail,
      welcome_message: welcomeMessage,
      status: 'sent',
      email_sent_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const listClientEngagements = async (): Promise<(ClientEngagement & { client: Client })[]> => {
  const { data, error } = await supabase
    .from('client_engagements')
    .select(`
      *,
      client:clients(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const updateClientEngagement = async (
  engagementId: string,
  updates: Partial<ClientEngagement>
): Promise<ClientEngagement> => {
  const { data, error } = await supabase
    .from('client_engagements')
    .update(updates)
    .eq('id', engagementId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Delete client and all associated data (recursive cleanup)
export const deleteClientAndAssociatedData = async (clientId: string): Promise<void> => {
  try {
    // First, get all documents associated with this client
    const { data: documents, error: documentsError } = await supabase
      .from('client_documents')
      .select('*')
      .eq('client_id', clientId);

    if (documentsError) {
      throw new Error(`Failed to fetch client documents: ${documentsError.message}`);
    }

    // Delete all associated files from storage
    if (documents && documents.length > 0) {
      for (const document of documents) {
        if (document.document_type === 'sow') { // Only delete SOW files, kickoff materials are universal
          try {
            const bucket = 'sow-documents';
            await deleteStorageFile(bucket, document.document_path);
          } catch (storageError) {
            console.warn(`Failed to delete file ${document.document_path} from storage:`, storageError);
            // Continue with deletion even if some files fail to delete from storage
          }
        }
      }
      // Note: client_documents records are deleted by cascade from clients table
    }

    // Delete the client record (this will cascade delete client_engagements and onboarding_steps)
    const { error: clientDeleteError } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (clientDeleteError) {
      throw new Error(`Failed to delete client: ${clientDeleteError.message}`);
    }

    console.log(`Successfully deleted client ${clientId} and all associated data`);
  } catch (error) {
    console.error('Error in deleteClientAndAssociatedData:', error);
    throw error;
  }
};

// Risk management functions
export const createRisk = async (risk: Partial<Risk>): Promise<Risk> => {
  const { data, error } = await supabase
    .from('risks')
    .insert([risk])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const listRisks = async (clientId?: string): Promise<Risk[]> => {
  let query = supabase
    .from('risks')
    .select('*')
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
};

export const updateRisk = async (
  riskId: string, 
  updates: Partial<Risk>
): Promise<Risk> => {
  const { data, error } = await supabase
    .from('risks')
    .update(updates)
    .eq('id', riskId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteRisk = async (riskId: string): Promise<void> => {
  const { error } = await supabase
    .from('risks')
    .delete()
    .eq('id', riskId);

  if (error) {
    throw error;
  }
};

export const getRisksByStatus = async (clientId: string, status: Risk['status']): Promise<Risk[]> => {
  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const getRisksBySeverity = async (clientId: string, severity: Risk['severity']): Promise<Risk[]> => {
  const { data, error } = await supabase
    .from('risks')
    .select('*')
    .eq('client_id', clientId)
    .eq('severity', severity)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};
// Enhanced Reporting Functions
export interface EngagementStats {
  draft: number;
  sent: number;
  in_progress: number;
  completed: number;
  on_hold: number;
  total: number;
}

export interface OnboardingStepStats {
  not_started: number;
  in_progress: number;
  completed: number;
  on_hold: number;
  total: number;
}

export interface RiskStats {
  open: number;
  in_progress: number;
  mitigated: number;
  closed: number;
  total: number;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface ClientGrowthData {
  month: string;
  clients: number;
  engagements: number;
}

export const getOverallEngagementStats = async (): Promise<EngagementStats> => {
  const { data, error } = await supabase
    .from('client_engagements')
    .select('status');

  if (error) {
    throw error;
  }

  const stats = {
    draft: 0,
    sent: 0,
    in_progress: 0,
    completed: 0,
    on_hold: 0,
    total: data?.length || 0
  };

  data?.forEach(engagement => {
    if (engagement.status in stats) {
      stats[engagement.status as keyof Omit<EngagementStats, 'total'>]++;
    }
  });

  return stats;
};

export const getOverallOnboardingStepStats = async (): Promise<OnboardingStepStats> => {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .select('status');

  if (error) {
    throw error;
  }

  const stats = {
    not_started: 0,
    in_progress: 0,
    completed: 0,
    on_hold: 0,
    total: data?.length || 0
  };

  data?.forEach(step => {
    if (step.status in stats) {
      stats[step.status as keyof Omit<OnboardingStepStats, 'total'>]++;
    }
  });

  return stats;
};

export const getOverallRiskStats = async (): Promise<RiskStats> => {
  const { data, error } = await supabase
    .from('risks')
    .select('status, severity');

  if (error) {
    throw error;
  }

  const stats = {
    open: 0,
    in_progress: 0,
    mitigated: 0,
    closed: 0,
    total: data?.length || 0,
    by_severity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }
  };

  data?.forEach(risk => {
    if (risk.status in stats) {
      stats[risk.status as keyof Omit<RiskStats, 'total' | 'by_severity'>]++;
    }
    if (risk.severity in stats.by_severity) {
      stats.by_severity[risk.severity as keyof RiskStats['by_severity']]++;
    }
  });

  return stats;
};

export const getClientGrowthData = async (): Promise<ClientGrowthData[]> => {
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('created_at')
    .order('created_at', { ascending: true });

  const { data: engagements, error: engagementsError } = await supabase
    .from('client_engagements')
    .select('created_at')
    .order('created_at', { ascending: true });

  if (clientsError || engagementsError) {
    throw clientsError || engagementsError;
  }

  // Group by month for the last 12 months
  const monthlyData: Record<string, { clients: number; engagements: number }> = {};
  const now = new Date();
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    monthlyData[monthKey] = { clients: 0, engagements: 0 };
  }

  // Count clients by month
  clients?.forEach(client => {
    const monthKey = client.created_at.slice(0, 7);
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].clients++;
    }
  });

  // Count engagements by month
  engagements?.forEach(engagement => {
    const monthKey = engagement.created_at.slice(0, 7);
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].engagements++;
    }
  });

  // Convert to array format for charts
  return Object.entries(monthlyData).map(([month, data]) => ({
    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    clients: data.clients,
    engagements: data.engagements
  }));
};

export const getAverageOnboardingTime = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('onboarding_steps')
    .select('start_date, end_date, status')
    .eq('status', 'completed')
    .not('start_date', 'is', null)
    .not('end_date', 'is', null);

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  const totalDays = data.reduce((sum, step) => {
    const startDate = new Date(step.start_date!);
    const endDate = new Date(step.end_date!);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return sum + diffDays;
  }, 0);

  return Math.round(totalDays / data.length);
};

// Signature Request management functions
export const createSignatureRequest = async (
  clientId: string,
  recipientName: string,
  recipientEmail: string,
  sowDocumentId?: string,
  ndaDocumentId?: string
): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-signature-request', {
      body: {
        clientId,
        sowDocumentId,
        ndaDocumentId,
        recipientName,
        recipientEmail
      }
    });

    if (error) {
      throw new Error(`Failed to send signature request: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating signature request:', error);
    // Check if the error is due to missing table
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('relation "public.signature_requests" does not exist')) {
      throw new Error('E-signature feature is not yet configured. Please set up the signature_requests table first.');
    }
    throw error;
  }
};

export const listSignatureRequests = async (clientId?: string): Promise<SignatureRequest[]> => {
  try {
    let query = supabase
      .from('signature_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    // If the table doesn't exist, return empty array instead of throwing
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('relation "public.signature_requests" does not exist')) {
      console.warn('Signature requests table does not exist. Returning empty array.');
      return [];
    }
    throw error;
  }
};

export const updateSignatureRequestStatus = async (
  requestId: string,
  status: SignatureRequest['status'],
  signedDocumentUrl?: string
): Promise<SignatureRequest> => {
  const updates: Partial<SignatureRequest> = { status };
  if (signedDocumentUrl) {
    updates.signed_document_url = signedDocumentUrl;
  }

  const { data, error } = await supabase
    .from('signature_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Client Deliverables management functions
export const createClientDeliverable = async (
  file: File,
  clientId: string,
  milestoneName: string,
  title: string,
  description?: string,
  version: string = '1.0'
): Promise<ClientDeliverable> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = `${clientId}/${milestoneName}/${fileName}`;

  // Upload file
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('client-deliverables')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      duplex: 'half'
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Get the public URL for the uploaded file
  const { data: urlData } = supabase
    .storage
    .from('client-deliverables')
    .getPublicUrl(filePath);

  // Create database record
  const { data, error } = await supabase
    .from('client_deliverables')
    .insert({
      client_id: clientId,
      milestone_name: milestoneName,
      title: title,
      description: description,
      document_path: filePath,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      version
    })
    .select('*')
    .single();

  if (error) {
    console.error('Database insert error:', error);
    
    // Clean up uploaded file if database insert fails
    await supabase.storage
      .from('client-deliverables')
      .remove([filePath]);
      
    throw new Error(`Failed to create deliverable record: ${error.message}`);
  }

  return data;
};

export const listClientDeliverables = async (clientId: string): Promise<ClientDeliverable[]> => {
  const { data, error } = await supabase
    .from('client_deliverables')
    .select('*')
    .eq('client_id', clientId)
    .order('milestone_name', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const updateClientDeliverable = async (
  deliverableId: string,
  updates: Partial<Pick<ClientDeliverable, 'title' | 'description' | 'version'>>
): Promise<ClientDeliverable> => {
  const { data, error } = await supabase
    .from('client_deliverables')
    .update(updates)
    .eq('id', deliverableId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteClientDeliverable = async (deliverableId: string): Promise<void> => {
  // First, get the deliverable details to know which file to delete from storage
  const { data: deliverable, error: fetchError } = await supabase
    .from('client_deliverables')
    .select('document_path')
    .eq('id', deliverableId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (deliverable) {
    // Delete the file from storage first
    try {
      await deleteStorageFile('client-deliverables', deliverable.document_path);
    } catch (storageError) {
      console.warn('Failed to delete file from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }
  }

  // Then delete the record from the database
  const { error } = await supabase
    .from('client_deliverables')
    .delete()
    .eq('id', deliverableId);

  if (error) {
    throw error;
  }
};

export const getDeliverablesByMilestone = async (
  clientId: string,
  milestoneName: string
): Promise<ClientDeliverable[]> => {
  const { data, error } = await supabase
    .from('client_deliverables')
    .select('*')
    .eq('client_id', clientId)
    .eq('milestone_name', milestoneName)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

// Remove NDA from a specific signature request
export const removeNDAFromSignatureRequest = async (requestId: string): Promise<SignatureRequest> => {
  const { data, error } = await supabase
    .from('signature_requests')
    .update({ nda_document_id: null })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

// Remove SOW from a specific signature request
export const removeSOWFromSignatureRequest = async (requestId: string): Promise<SignatureRequest> => {
  const { data, error } = await supabase
    .from('signature_requests')
    .update({ sow_document_id: null })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};