import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Loader2, CheckCircle, Building2, FileText } from 'lucide-react';
import { sendClientOnboardingEmail } from '@/lib/email';
import { createClientEngagement, type Client, type OnboardingStep } from '@/lib/supabase';
import { type UploadedFile } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface EmailClientFormProps {
  selectedClient: Client | null;
  welcomeMessage: string;
  nextSteps: OnboardingStep[];
  kickoffFiles: UploadedFile[];
  onEmailSent: () => void;
}

export function EmailClientForm({ 
  selectedClient, 
  welcomeMessage, 
  nextSteps, 
  kickoffFiles, 
  onEmailSent 
}: EmailClientFormProps) {
  const [clientEmail, setClientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const clientVisibleSteps = nextSteps.filter(step => step.client_visible);

  const handleSendEmail = async () => {
    if (!selectedClient || !clientEmail.trim() || !welcomeMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please ensure client is selected, email is provided, and welcome message is generated.",
        variant: "destructive",
      });
      return;
    }

    if (clientVisibleSteps.length === 0) {
      toast({
        title: "No Checklist Items",
        description: "Please generate content first to create checklist items for the client.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Prepare checklist items for email
      const checklistItems = clientVisibleSteps.map(step => ({
        title: step.title,
        description: step.description
      }));

      // Send email
      await sendClientOnboardingEmail(
        selectedClient.name,
        clientEmail.trim(),
        welcomeMessage.replace(/\n/g, '<br/>'),
        checklistItems,
        kickoffFiles
      );

      // Create engagement record
      await createClientEngagement(
        selectedClient.id,
        clientEmail.trim(),
        welcomeMessage
      );

      toast({
        title: "Email Sent Successfully!",
        description: `Onboarding email has been sent to ${clientEmail} and engagement tracking has been created.`,
      });

      onEmailSent();
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
          <Mail className="w-8 h-8 text-blue-600" />
          <span>Send Client Onboarding Email</span>
        </CardTitle>
        <CardDescription className="text-lg font-medium text-slate-600 mt-3">
          Send the personalized welcome message and checklist to your client
          {selectedClient && (
            <span className="block mt-3 text-blue-600 font-semibold flex items-center space-x-2">
              <Building2 className="w-5 h-5" />
              <span>Client: {selectedClient.name}</span>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pb-10">
        {/* Email Input */}
        <div className="space-y-4">
          <Label htmlFor="clientEmail" className="text-lg font-bold text-slate-900">
            Client Email Address
          </Label>
          <Input
            id="clientEmail"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="client@company.com"
            className="h-12 text-base border-2 rounded-xl focus:border-blue-500 transition-all duration-300"
          />
        </div>

        <Separator />

        {/* Email Preview Summary */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Email Content Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">1</div>
              <div className="text-sm font-semibold text-blue-800">Welcome Message</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200">
              <div className="text-3xl font-bold text-emerald-600 mb-2">{clientVisibleSteps.length}</div>
              <div className="text-sm font-semibold text-emerald-800">Checklist Items</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">{kickoffFiles.length}</div>
              <div className="text-sm font-semibold text-purple-800">Attachments</div>
            </div>
          </div>

          {/* Checklist Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900">Client Checklist Items</h4>
              <Badge variant="secondary" className="text-sm font-semibold">
                {clientVisibleSteps.length} items
              </Badge>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {clientVisibleSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                    {step.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{step.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Summary */}
          {kickoffFiles.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-slate-900">Referenced Documents</h4>
              <div className="space-y-3">
                {kickoffFiles.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-900 text-sm">{file.name}</p>
                      <p className="text-xs text-emerald-700">Resource • {formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Send Button */}
        <div className="text-center space-y-4">
          <Button
            onClick={handleSendEmail}
            disabled={isSending || !selectedClient || !clientEmail.trim() || !welcomeMessage.trim() || clientVisibleSteps.length === 0}
            className="flex items-center justify-center space-x-3 h-16 px-12 text-xl font-bold bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] disabled:scale-100 disabled:shadow-none"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Sending Email...</span>
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>Send Onboarding Email</span>
              </>
            )}
          </Button>
          
          <p className="text-sm text-slate-500 max-w-2xl mx-auto">
            This will send a professional onboarding email to your client with their personalized 
            welcome message and checklist, and create an engagement record for internal tracking.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}