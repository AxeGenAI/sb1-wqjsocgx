import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Building2, 
  Loader2,
  Bot,
  User,
  Sparkles,
  BarChart3,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { listClients, type Client } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProjectInsightChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const PREDEFINED_PROMPTS = [
  {
    id: 'project-summary',
    icon: BarChart3,
    title: 'Project Overview',
    prompt: 'Provide a comprehensive overview of the current project status, including progress percentage, completed milestones, and next steps.',
    color: 'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-150'
  },
  {
    id: 'task-status',
    icon: Sparkles,
    title: 'Task Analysis',
    prompt: 'List all current tasks with their status (not started, in progress, completed, on hold) and who is assigned to each task.',
    color: 'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-150'
  },
  {
    id: 'risks-issues',
    icon: AlertTriangle,
    title: 'Risk Assessment',
    prompt: 'Highlight any current risks, issues, or blockers that need attention, along with their severity and mitigation plans.',
    color: 'from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-150'
  }
];

export function ProjectInsightChat({ isOpen, onClose }: ProjectInsightChatProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      // Add welcome message when chat opens
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: 'Hello! I\'m your Project Insight Assistant. Select a client project and I\'ll provide you with real-time insights about project status, tasks, and risks. You can use the quick prompts below or ask me specific questions.',
        timestamp: new Date()
      }]);
    } else {
      // Reset state when chat closes
      setSelectedClient('');
      setMessages([]);
      setInputMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const clientList = await listClients();
      setClients(clientList);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Failed to Load Clients",
        description: "Could not retrieve client list for project insights.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !selectedClient) {
      if (!selectedClient) {
        toast({
          title: "Select a Project",
          description: "Please select a client project first to get insights.",
          variant: "destructive",
        });
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Create a placeholder assistant message that will be updated with streaming content
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Use direct fetch for streaming support
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-insight-ai`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId: selectedClient, userQuery: message.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          // Decode the chunk and add it to accumulated content
          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;
          
          // Update the assistant message with the accumulated content
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: accumulatedContent }
              : msg
          ));
        }
      } finally {
        reader.releaseLock();
      }

      // Ensure we have some content, if not provide a fallback
      if (!accumulatedContent.trim()) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'I apologize, but I could not generate insights for this query. Please try again.' }
            : msg
        ));
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the assistant message with error content
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'I apologize, but I encountered an error while analyzing your project data. Please try again or contact support if the issue persists.' }
          : msg
      ));
      
      toast({
        title: "Failed to Get Insights",
        description: error instanceof Error ? error.message : "Could not retrieve project insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredefinedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };

  const selectedClientName = clients.find(c => c.id === selectedClient)?.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 bg-white border-0 shadow-2xl">
        {/* Enhanced Header */}
        <DialogHeader className="pl-8 pr-20 py-8 bg-gradient-to-r from-orange-50 via-white to-orange-100 border-b border-slate-200/60">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center shadow-lg">
              <MessageCircle className="w-7 h-7 text-orange-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-1">
                Project Insight Assistant
              </DialogTitle>
              <DialogDescription className="text-base font-medium text-slate-600">
                Get real-time AI-powered insights about your client projects and strategic initiatives
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Enhanced Client Selection */}
        <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200/60">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-slate-600" />
              <label className="text-base font-bold text-slate-900">Select Project</label>
            </div>
            {isLoadingClients ? (
              <div className="flex items-center space-x-3 p-4 bg-white border-2 border-slate-200 rounded-xl shadow-sm">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-base font-medium text-slate-600">Loading projects...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-full h-12 text-base font-medium border-2 border-slate-200 rounded-xl focus:border-orange-500 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                    <SelectValue placeholder="Choose a client project..." />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-slate-200 rounded-xl shadow-xl">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-base font-medium py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-orange-600" />
                          </div>
                          <span>{client.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientName && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold px-3 py-1">
                      Active: {selectedClientName}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Messages Area */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-white to-slate-50/30">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-4 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Bot className="w-5 h-5 text-orange-600" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-6 py-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-2xl rounded-br-sm'
                      : 'bg-gradient-to-br from-white to-slate-50 text-slate-900 border-2 border-slate-200 rounded-2xl rounded-bl-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <p className="text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        message.type === 'user' ? 'text-orange-200' : 'text-slate-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                {message.type === 'user' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <User className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-5 h-5 text-orange-600" />
                </div>
                <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 px-6 py-4 rounded-2xl rounded-bl-sm shadow-lg">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                    <span className="text-base font-medium text-slate-600">Analyzing project data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Predefined Prompts */}
          {selectedClient && messages.length <= 1 && (
            <div className="px-8 py-6 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200/60">
              <div className="space-y-5">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-orange-600" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Quick Insights</h4>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {PREDEFINED_PROMPTS.map((prompt) => {
                    const Icon = prompt.icon;
                    return (
                      <Button
                        key={prompt.id}
                        variant="outline"
                        onClick={() => handlePredefinedPrompt(prompt.prompt)}
                        disabled={isLoading}
                        className={`h-auto p-6 text-left justify-start bg-gradient-to-r ${prompt.color} border-2 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] rounded-xl`}
                      >
                        <div className="flex items-center space-x-4 w-full">
                          <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icon className="w-6 h-6 text-slate-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base text-slate-900 mb-1">
                              {prompt.title}
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 overflow-hidden">
                              {prompt.prompt}
                            </p>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Input Area */}
          <div className="px-8 py-6 bg-gradient-to-r from-white to-slate-50 border-t border-slate-200/60">
            <div className="space-y-4">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedClient
                        ? "Ask about project status, tasks, risks, or strategic insights..."
                        : "Select a project first to start getting insights..."
                    }
                    disabled={!selectedClient || isLoading}
                    className="h-14 text-base font-medium border-2 border-slate-200 rounded-xl focus:border-orange-500 bg-white shadow-sm hover:shadow-md transition-all duration-300 px-6"
                  />
                </div>
                <Button
                  onClick={() => handleSendMessage(inputMessage)}
                  disabled={!inputMessage.trim() || !selectedClient || isLoading}
                  className="h-14 w-14 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:shadow-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                </Button>
              </div>
              {!selectedClient && (
                <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">
                    Select a client project above to start getting AI-powered insights
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}