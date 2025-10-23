import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit3, Eye, Copy, Check } from 'lucide-react';

interface MessageEditorProps {
  message: string;
  onMessageChange: (message: string) => void;
}

export function MessageEditor({ message, onMessageChange }: MessageEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempMessage, setTempMessage] = useState(message);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onMessageChange(tempMessage);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempMessage(message);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome Message</CardTitle>
            <CardDescription className="text-base font-medium text-slate-600 mt-2">
              Edit the AI-generated welcome message for your client
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!message}
              className="flex items-center space-x-2 h-10 px-4 font-semibold border-2 border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={!message}
              className="flex items-center space-x-2 h-10 px-4 font-semibold border-2 border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
            >
              {isEditing ? <Eye className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
              <span>{isEditing ? 'Preview' : 'Edit'}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-8">
        {isEditing ? (
          <div className="space-y-6">
            <Textarea
              value={tempMessage}
              onChange={(e) => setTempMessage(e.target.value)}
              className="min-h-[300px] text-base border-2 rounded-xl focus:border-blue-500 transition-all duration-300 font-sans"
              placeholder="Enter your welcome message..."
            />
            <div className="flex justify-end space-x-4">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="px-6 py-3 font-semibold border-2 rounded-xl hover:bg-slate-50 transition-all duration-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="px-6 py-3 font-semibold bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {message ? (
              <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200 min-h-[300px]">
                <pre className="whitespace-pre-wrap text-base text-slate-900 font-sans leading-relaxed">
                  {message}
                </pre>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl min-h-[300px] flex items-center justify-center bg-slate-50/50">
                <div>
                  <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="font-semibold text-lg">Generate content first to see your welcome message here</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}