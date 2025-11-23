import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Search, ArrowLeft, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePaymentGuard } from '@/hooks/usePaymentGuard';
import PaymentRequiredDialog from '@/components/PaymentRequiredDialog';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface Conversation {
  id: string;
  last_message_at: string;
  conversation_type?: string;
  group_name?: string;
  other_user?: Profile;
  last_message?: {
    content: string;
    sender_id: string;
  };
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const [hasTriedReload, setHasTriedReload] = useState(false);
  const { hasPaid } = usePaymentGuard();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [blockedFeature] = useState<'send_message'>('send_message');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
      subscribeToMessages();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
      // Ensure we have complete profile data for direct chats (non-blocking)
      if (selectedConversation.conversation_type !== 'group' && !selectedConversation.other_user?.full_name) {
        console.log('Profile missing, attempting to refresh...');
        refreshConversationProfile(selectedConversation.id).catch(err => {
          console.error('Failed to refresh profile, but continuing:', err);
        });
      }
    }
  }, [selectedConversation]);

  // Handle conversation from navigation state
  useEffect(() => {
    if (location.state?.conversationId) {
      console.log('Navigation state detected, conversation ID:', location.state.conversationId);
      setPendingConversationId(location.state.conversationId);
      setHasTriedReload(false);
    }
  }, [location.state]);

  // Auto-select conversation once loaded
  useEffect(() => {
    const selectConversation = async () => {
      if (!pendingConversationId || !currentUserId) return;

      console.log('Attempting to select conversation:', pendingConversationId);
      
      // First check if it's already in the loaded conversations
      const existingConv = conversations.find(c => c.id === pendingConversationId);
      if (existingConv) {
        console.log('Conversation found in list, selecting:', existingConv);
        setSelectedConversation(existingConv);
        setPendingConversationId(null);
        window.history.replaceState({}, document.title);
        return;
      }

      // If not found and haven't tried loading it yet
      if (!hasTriedReload) {
        console.log('Conversation not in list, fetching directly...');
        setHasTriedReload(true);
        
        try {
          // Fetch the specific conversation
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('id, last_message_at, conversation_type, group_name, project_id')
            .eq('id', pendingConversationId)
            .single();

          if (convError) {
            console.error('Error fetching conversation:', convError);
            setPendingConversationId(null);
            setHasTriedReload(false);
            return;
          }

          console.log('Fetched conversation:', conv);

          // Get other participant if it's a direct chat
          let otherUser = undefined;
          if (conv.conversation_type !== 'group') {
            const { data: otherParticipant, error: partError } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', pendingConversationId)
              .neq('user_id', currentUserId)
              .single();

            if (partError) {
              console.error('Error fetching other participant:', partError);
            } else if (otherParticipant) {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role')
                .eq('id', otherParticipant.user_id)
                .single();
              
              if (profileError) {
                console.error('Error fetching profile:', profileError);
              } else {
                console.log('Fetched other user profile:', profile);
                otherUser = profile as Profile;
              }
            }
          }

          // Create conversation object and select it
          const conversationToSelect: Conversation = {
            id: conv.id,
            last_message_at: conv.last_message_at || new Date().toISOString(),
            conversation_type: conv.conversation_type,
            group_name: conv.group_name,
            other_user: otherUser,
            last_message: undefined,
            unread_count: 0,
          };

          console.log('Selecting fetched conversation:', conversationToSelect);
          setSelectedConversation(conversationToSelect);
          setPendingConversationId(null);
          setHasTriedReload(false);
          window.history.replaceState({}, document.title);
          
          // Reload full conversation list in background
          loadConversations();
        } catch (error) {
          console.error('Error loading conversation:', error);
          setPendingConversationId(null);
          setHasTriedReload(false);
        }
      }
    };

    selectConversation();
  }, [pendingConversationId, conversations, currentUserId, hasTriedReload]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('Loading conversations for user:', currentUserId);

      // Get all conversations with participants - using simpler query
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', currentUserId);

      if (partError) throw partError;
      console.log('Found participations:', participations?.length || 0);

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get conversation details
      const conversationIds = participations.map(p => p.conversation_id);
      
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id, last_message_at, conversation_type, group_name, project_id')
        .in('id', conversationIds);

      if (convError) throw convError;
      console.log('Loaded conversations:', conversations?.length || 0, conversations);

      // Get other participants for each conversation
      const { data: otherParticipants, error: otherError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', currentUserId);

      if (otherError) throw otherError;
      console.log('Other participants:', otherParticipants);

      // Get profiles for other participants
      const otherUserIds = otherParticipants?.map(p => p.user_id) || [];
      console.log('Fetching profiles for user IDs:', otherUserIds);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', otherUserIds);

      if (profileError) throw profileError;
      console.log('Loaded profiles:', profiles);

      // Get last messages
      const { data: lastMessages, error: msgError } = await supabase
        .from('messages')
        .select('conversation_id, content, sender_id, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Combine data
      const conversationData: Conversation[] = participations.map(p => {
        const conv = conversations?.find(c => c.id === p.conversation_id);
        const isGroup = conv?.conversation_type === 'group';
        
        const otherParticipant = otherParticipants?.find(
          op => op.conversation_id === p.conversation_id
        );
        const otherUserProfile = profiles?.find(
          profile => profile.id === otherParticipant?.user_id
        );
        
        if (!isGroup && !otherUserProfile) {
          console.warn('Missing profile for conversation:', {
            conversationId: p.conversation_id,
            otherParticipantId: otherParticipant?.user_id,
            availableProfiles: profiles?.map(pr => pr.id)
          });
        }
        
        const lastMsg = lastMessages?.find(
          msg => msg.conversation_id === p.conversation_id
        );

        const unreadCount = lastMessages?.filter(
          msg =>
            msg.conversation_id === p.conversation_id &&
            msg.sender_id !== currentUserId &&
            new Date(msg.created_at) > new Date(p.last_read_at || 0)
        ).length || 0;

        return {
          id: conv?.id || p.conversation_id,
          last_message_at: conv?.last_message_at || new Date().toISOString(),
          conversation_type: conv?.conversation_type || 'direct',
          group_name: conv?.group_name,
          other_user: isGroup ? undefined : (otherUserProfile as Profile),
          last_message: lastMsg,
          unread_count: unreadCount,
        };
      }).filter(c => {
        // Keep all group conversations
        if (c.conversation_type === 'group') return true;
        // For direct chats, keep all but log if profile is missing
        if (!c.other_user?.full_name) {
          console.warn('Conversation missing other user profile, will load on select:', c.id);
        }
        // Keep all conversations - profile will be loaded when selected
        return true;
      });

      conversationData.sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      console.log('Final conversation data:', conversationData);
      setConversations(conversationData);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshConversationProfile = async (conversationId: string) => {
    try {
      console.log('Refreshing profile for conversation:', conversationId);
      
      // Get the other participant
      const { data: otherParticipant, error: partError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', currentUserId)
        .single();

      if (partError || !otherParticipant) {
        console.error('Error fetching other participant:', partError);
        return;
      }

      // Fetch their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', otherParticipant.user_id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      console.log('Refreshed profile:', profile);

      // Update the selected conversation with the profile data
      setSelectedConversation(prev => {
        if (prev && prev.id === conversationId) {
          return {
            ...prev,
            other_user: profile as Profile,
          };
        }
        return prev;
      });

      // Also update in the conversations list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, other_user: profile as Profile }
            : conv
        )
      );
    } catch (error: any) {
      console.error('Error refreshing conversation profile:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const markAsRead = async (conversationId: string) => {
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUserId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Check payment status
    if (!hasPaid) {
      setShowPaymentDialog(true);
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
      loadMessages(selectedConversation.id);
      loadConversations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const subscribeToMessages = () => {
    const messagesChannel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (selectedConversation?.id === payload.new.conversation_id) {
            loadMessages(selectedConversation.id);
          }
          loadConversations();
        }
      )
      .subscribe();

    // Subscribe to conversation_participants changes to detect when user is removed
    const participantsChannel = supabase
      .channel('conversation_participants_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('Conversation participants changed:', payload);
          
          // If user was deleted from a conversation
          if (payload.eventType === 'DELETE') {
            const removedConversationId = payload.old.conversation_id;
            
            // If it's the currently selected conversation, clear it
            if (selectedConversation?.id === removedConversationId) {
              setSelectedConversation(null);
              setMessages([]);
              toast({
                title: 'Access Removed',
                description: 'You no longer have access to this conversation',
                variant: 'destructive',
              });
            }
            
            // Remove from conversations list
            setConversations(prev => prev.filter(c => c.id !== removedConversationId));
          } else {
            // User was added to a conversation or participant info changed
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(participantsChannel);
    };
  };

  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery.trim() === '') return true;
    
    const query = searchQuery.toLowerCase();
    
    // For group conversations, search by group name
    if (conv.conversation_type === 'group') {
      return conv.group_name?.toLowerCase().includes(query) || false;
    }
    
    // For direct conversations, search by other user's name
    return conv.other_user?.full_name?.toLowerCase().includes(query) || false;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-0 sm:px-4 py-0 sm:py-6 max-w-7xl mx-auto h-screen sm:h-[calc(100vh-3rem)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4 h-full">
          {/* Conversations List */}
          <Card className={`border-0 md:border rounded-none md:rounded-lg ${selectedConversation ? 'hidden md:block' : 'block'}`}>
            <CardContent className="p-0 h-full flex flex-col">
              {/* Conversation List Header - Mobile Only */}
              <div className="p-3 sm:p-4 border-b md:hidden flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="h-9 w-9"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <MessageCircle className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold">Messages</h1>
              </div>
              
              {/* Search */}
              <div className="p-3 sm:p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <ScrollArea className="flex-1">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Connect with others to start chatting</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => {
                      const isGroup = conv.conversation_type === 'group';
                      const displayName = isGroup 
                        ? (conv.group_name || 'Team Chat')
                        : (conv.other_user?.full_name || 'Loading...');
                      const displayInitial = isGroup 
                        ? (conv.group_name?.charAt(0).toUpperCase() || 'G')
                        : (conv.other_user?.full_name?.charAt(0).toUpperCase() || '?');
                      
                      return (
                        <div
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className={`p-3 sm:p-4 cursor-pointer hover:bg-accent transition-colors ${
                            selectedConversation?.id === conv.id ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                              <AvatarFallback className="text-sm">
                                {displayInitial}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                  {displayName}
                                  {isGroup && <Users className="w-3.5 h-3.5 text-muted-foreground" />}
                                </p>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {formatDistanceToNow(new Date(conv.last_message_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                  {conv.last_message?.sender_id === currentUserId && 'You: '}
                                  {conv.last_message?.content || 'No messages yet'}
                                </p>
                                {conv.unread_count > 0 && (
                                  <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className={`md:col-span-2 border-0 md:border rounded-none md:rounded-lg ${selectedConversation ? 'block' : 'hidden md:block'}`}>
            {selectedConversation ? (
              <CardContent className="p-0 h-full flex flex-col">
                {/* Chat Header */}
                <div className="p-4 sm:p-5 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversation(null)}
                    className="h-10 w-10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-11 h-11 sm:w-12 sm:h-12">
                    <AvatarFallback className="text-base">
                      {selectedConversation.conversation_type === 'group'
                        ? selectedConversation.group_name?.charAt(0).toUpperCase() || 'G'
                        : selectedConversation.other_user?.full_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-base sm:text-lg truncate flex items-center gap-1.5">
                      {selectedConversation.conversation_type === 'group'
                        ? (selectedConversation.group_name || 'Team Chat')
                        : (selectedConversation.other_user?.full_name || 'Loading...')}
                      {selectedConversation.conversation_type === 'group' && (
                        <Users className="w-5 h-5 text-muted-foreground" />
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedConversation.conversation_type === 'group'
                        ? 'Team Group Chat'
                        : selectedConversation.other_user?.role || ''}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3 sm:p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isSent = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] sm:max-w-[70%]`}>
                            {!isSent && (
                              <p className="text-xs text-muted-foreground mb-1 ml-1">
                                {msg.sender?.full_name}
                              </p>
                            )}
                            <div
                              className={`rounded-2xl px-3 sm:px-4 py-2 ${
                                isSent
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-accent'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-1">
                              {formatDistanceToNow(new Date(msg.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 sm:p-4">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-sm placeholder:text-muted-foreground/60"
                    />
                    <Button 
                      onClick={sendMessage} 
                      size="icon" 
                      variant="ghost"
                      className="h-10 w-10 rounded-full hover:bg-transparent flex-shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <PaymentRequiredDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        feature={blockedFeature}
      />
    </div>
  );
};

export default Messages;
