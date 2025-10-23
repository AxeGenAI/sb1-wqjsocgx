import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Zap,
  Brain
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

const PREDEFINED_PROMPTS = [
  {
    id: 'project-summary',
    icon: BarChart3,
    title: 'Project Overview',
    prompt: 'Provide a comprehensive overview of the current project status, including progress percentage, completed milestones, and next steps.',
    color: 'from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-150'
  },
  {
    id: 'task-status',
    icon: Sparkles,
    title: 'Task Analysis',
    prompt: 'List all current tasks with their status (not started, in progress, completed, on hold) and who is assigned to each task.',
    color: 'from-emerald-50 to-emerald-100 border-emerald-200 hover:from-emerald-100 hover:to-emerald-150'
  },
  {
    id: 'risks-issues',
    icon: AlertTriangle,
    title: 'Risk Assessment',
    prompt: 'Highlight any current risks, issues, or blockers that need attention, along with their severity and mitigation plans.',
    color: 'from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-150'
  }
];

export function EmbeddedProjectInsightChat() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
    // Add welcome message when component mounts
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: 'Hello! I\'m your Project Insight Assistant. Select a client project and I\'ll provide you with real-time insights about project status, tasks, and risks. You can use the quick prompts below or ask me specific questions.',
      timestamp: new Date()
    }]);
  }, []);

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
    <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-2xl transition-all duration-300">
      <CardHeader className="pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-200 to-orange-300 rounded-2xl flex items-center justify-center shadow-lg">
            <Brain className="w-8 h-8 text-orange-700" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl font-bold text-slate-900 mb-2">AI Project Assistant</CardTitle>
            <CardDescription className="text-base font-medium text-slate-600 leading-relaxed">
              Get real-time AI-powered insights about your client projects and strategic initiatives
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-8">
        <div className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <label className="text-sm font-bold text-slate-900">Select Project</label>
            </div>
            {isLoadingClients ? (
              <div className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                <span className="text-sm font-medium text-slate-600">Loading projects...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-full h-10 text-sm font-medium border border-slate-200 rounded-lg focus:border-orange-500 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                    <SelectValue placeholder="Choose a client project..." />
                  </SelectTrigger>
                  <SelectContent className="border border-slate-200 rounded-lg shadow-xl">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-sm font-medium py-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-orange-600" />
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
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-semibold px-2 py-1 text-xs">
                      Active: {selectedClientName}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-inner">
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot className="w-4 h-4 text-orange-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-3 shadow-md transition-all duration-300 hover:shadow-lg ${
                      message.type === 'user'
                        ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-lg rounded-br-sm'
                        : 'bg-gradient-to-br from-white to-slate-50 text-slate-900 border border-slate-200 rounded-lg rounded-bl-sm'
                    }`}
                  >
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
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
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 px-4 py-3 rounded-lg rounded-bl-sm shadow-md">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                      <span className="text-sm font-medium text-slate-600">Analyzing project data...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Insights - Only show when client is selected and conversation is minimal */}
            {selectedClient && messages.length <= 1 && (
              <div className="px-4 py-4 bg-gradient-to-r from-slate-50 to-orange-50 border-t border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-100 rounded-md flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-orange-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">Quick Insights</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_PROMPTS.map((prompt) => {
                      const Icon = prompt.icon;
                      return (
                        <Button
                          key={prompt.id}
                          variant="outline"
                          onClick={() => handlePredefinedPrompt(prompt.prompt)}
                          disabled={isLoading}
                          className={`h-8 px-3 py-1 text-center justify-center bg-gradient-to-r ${prompt.color} border hover:shadow-md transition-all duration-300 hover:scale-[1.01] rounded-full text-xs font-semibold whitespace-nowrap`}
                        >
                          <div className="flex items-center space-x-2">
                            <Icon className="w-3 h-3 text-slate-700" />
                            <span>{prompt.title}</span>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="px-4 py-4 bg-gradient-to-r from-white to-orange-50 border-t border-slate-200">
              <div className="space-y-3">
                <div className="flex items-end space-x-3">
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
                      className="h-10 text-sm font-medium border border-slate-200 rounded-lg focus:border-orange-500 bg-white shadow-sm hover:shadow-md transition-all duration-300 px-3"
                    />
                  </div>
                  <Button
                    onClick={() => handleSendMessage(inputMessage)}
                    disabled={!inputMessage.trim() || !selectedClient || isLoading}
                    className="h-10 w-10 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:shadow-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {!selectedClient && (
                  <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3 h-3" />
                    <p className="text-xs font-medium">
                      Select a client project above to start getting AI-powered insights
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}