import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

const MessagesButton = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadUnreadCount();
      subscribeToMessages();
    }
  }, [currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadUnreadCount = async () => {
    try {
      // Get conversations where user is participant
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', currentUserId);

      if (!participations || participations.length === 0) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // Get messages sent after last_read_at
      let totalUnread = 0;
      for (const participation of participations) {
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', participation.conversation_id)
          .neq('sender_id', currentUserId)
          .gt('created_at', participation.last_read_at || '1970-01-01');

        totalUnread += messages?.length || 0;
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages-button')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate('/messages')}
      className="relative h-9 w-9 sm:h-10 sm:w-10"
    >
      <MessageCircle className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

export default MessagesButton;
