import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectChatFabProps {
  projectId: string;
  isTeamMember: boolean;
}

const ProjectChatFab = ({ projectId, isTeamMember }: ProjectChatFabProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isTeamMember) {
      loadConversation();
    }
  }, [projectId, isTeamMember]);

  const loadConversation = async () => {
    try {
      // Get project group chat conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('project_id', projectId)
        .eq('conversation_type', 'group')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (conversation) {
        setConversationId(conversation.id);
        loadUnreadCount(conversation.id);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadUnreadCount = async (convId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get participant's last read timestamp
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', convId)
        .eq('user_id', user.id)
        .single();

      if (!participant) return;

      // Count unread messages
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user.id)
        .gt('created_at', participant.last_read_at || '1970-01-01');

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const openChat = async () => {
    try {
      console.log('Opening project chat for project:', projectId);
      let chatId = conversationId;

      // If no conversation exists, create it
      if (!chatId) {
        console.log('No existing conversation, creating new one...');
        const { data, error } = await supabase.rpc('get_or_create_project_chat', {
          p_project_id: projectId,
        });

        if (error) throw error;
        console.log('Created/retrieved conversation:', data);
        chatId = data;
      }

      // Navigate to messages with conversation
      navigate('/messages', { state: { conversationId: chatId } });
    } catch (error: any) {
      console.error('Error opening chat:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to open team chat',
        variant: 'destructive',
      });
    }
  };

  // Don't show if not a team member
  if (!isTeamMember) {
    return null;
  }

  return (
    <Button
      onClick={openChat}
      className="fixed bottom-20 right-4 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-lg z-40"
      size="icon"
    >
      <div className="relative">
        <MessageCircle className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </div>
    </Button>
  );
};

export default ProjectChatFab;
