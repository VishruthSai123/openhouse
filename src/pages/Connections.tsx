import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Mail,
  Briefcase,
  Star,
  UserCheck,
  UserMinus,
  UserPlus,
  MessageCircle,
} from 'lucide-react';
import { usePaymentGuard } from '@/hooks/usePaymentGuard';
import PaymentRequiredDialog from '@/components/PaymentRequiredDialog';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  bio: string | null;
  skills: string[] | null;
  interests: string[] | null;
  builder_coins: number;
}

interface Connection {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  receiver?: Profile;
}

const Connections = () => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('following');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPaid } = usePaymentGuard();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [blockedFeature] = useState<'connect'>('connect');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConnections();

      // Set up real-time subscription for connections
      const channel = supabase
        .channel('connections-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connections',
            filter: `sender_id=eq.${currentUser.id},receiver_id=eq.${currentUser.id}`,
          },
          (payload) => {
            console.log('Connection change:', payload);
            // Reload connections when they change
            loadConnections();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setCurrentUser(profile);
    }
  };

  const loadConnections = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          sender:profiles!connections_sender_id_fkey(id, email, full_name, role, bio, skills, interests, builder_coins),
          receiver:profiles!connections_receiver_id_fkey(id, email, full_name, role, bio, skills, interests, builder_coins)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`);

      if (error) throw error;
      setConnections(data as any || []);
    } catch (error) {
      console.error('Error loading connections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load connections',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionResponse = async (connectionId: string, status: 'accepted' | 'rejected') => {
    // Check payment status
    if (!hasPaid) {
      setShowPaymentDialog(true);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId);

      if (updateError) throw updateError;

      // Award 5 Builder Coins to both users if accepted (only if they have paid)
      if (status === 'accepted') {
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
          // Check if both users have paid before awarding coins
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('has_paid')
            .eq('id', connection.sender_id)
            .single();

          const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('has_paid')
            .eq('id', connection.receiver_id)
            .single();

          const coinPromises = [];
          
          if (senderProfile?.has_paid) {
            coinPromises.push(
              supabase.from('coin_transactions').insert({
                user_id: connection.sender_id,
                amount: 5,
                reason: 'Connection accepted',
                reference_type: 'connection',
                reference_id: connectionId,
              }),
              supabase.rpc('increment_builder_coins', { 
                user_id: connection.sender_id, 
                coins: 5 
              })
            );
          }

          if (receiverProfile?.has_paid) {
            coinPromises.push(
              supabase.from('coin_transactions').insert({
                user_id: connection.receiver_id,
                amount: 5,
                reason: 'Connection accepted',
                reference_type: 'connection',
                reference_id: connectionId,
              }),
              supabase.rpc('increment_builder_coins', { 
                user_id: connection.receiver_id, 
                coins: 5 
              })
            );
          }

          await Promise.all(coinPromises);
        }
      }

      toast({
        title: 'Success',
        description: `Connection request ${status}`,
      });

      await loadConnections();
    } catch (error: any) {
      console.error('Error updating connection:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update connection',
        variant: 'destructive',
      });
    }
  };

  const startChat = async (userId: string) => {
    try {
      console.log('Starting chat with user:', userId);
      // Call the Supabase function to get or create conversation
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: currentUser!.id,
        user2_id: userId,
      });

      if (error) throw error;
      console.log('Got conversation ID:', data);

      // Navigate to messages with the conversation
      navigate('/messages', { state: { conversationId: data } });
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  const roleConfig = {
    founder: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    developer: { color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    designer: { color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    editor: { color: 'text-green-500', bgColor: 'bg-green-500/10' },
    marketer: { color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    mentor: { color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  };

  // Filter connections by type
  const following = connections.filter(c => 
    c.status === 'accepted' && (c.sender_id === currentUser?.id || c.receiver_id === currentUser?.id)
  );
  const followers = following; // In this system, connections are bidirectional
  const receivedRequests = connections.filter(c => 
    c.status === 'pending' && c.receiver_id === currentUser?.id
  );
  const sentRequests = connections.filter(c => 
    c.status === 'pending' && c.sender_id === currentUser?.id
  );

  // Apply search filter
  const filterConnections = (conns: Connection[]) => {
    if (!searchQuery) return conns;
    const query = searchQuery.toLowerCase();
    return conns.filter(conn => {
      const otherUser = conn.sender_id === currentUser?.id ? conn.receiver : conn.sender;
      return (
        otherUser?.full_name?.toLowerCase().includes(query) ||
        otherUser?.role?.toLowerCase().includes(query) ||
        otherUser?.bio?.toLowerCase().includes(query)
      );
    });
  };

  const renderUserCard = (conn: Connection, showActions: boolean = false) => {
    const isReceiver = conn.receiver_id === currentUser?.id;
    const otherUser = (isReceiver ? conn.sender : conn.receiver) as Profile;
    const roleInfo = otherUser?.role ? roleConfig[otherUser.role as keyof typeof roleConfig] : roleConfig.founder;

    return (
      <Card key={conn.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3">
          <div className="flex items-start gap-3 sm:gap-4">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
              <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} font-semibold text-sm sm:text-base`}>
                {otherUser?.full_name?.charAt(0).toUpperCase() || otherUser?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg truncate">
                {otherUser?.full_name || 'Anonymous'}
              </CardTitle>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className={`${roleInfo.bgColor} text-xs`}>
                  <Briefcase className={`w-3 h-3 mr-1 ${roleInfo.color}`} />
                  {otherUser?.role || 'User'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1 text-yellow-500" />
                  {otherUser?.builder_coins || 0}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
          {otherUser?.bio && (
            <CardDescription className="text-xs sm:text-sm line-clamp-2">
              {otherUser.bio}
            </CardDescription>
          )}
          
          {otherUser?.skills && otherUser.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {otherUser.skills.slice(0, 3).map((skill, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {otherUser.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{otherUser.skills.length - 3}
                </Badge>
              )}
            </div>
          )}

          {showActions && conn.status === 'pending' && isReceiver && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => handleConnectionResponse(conn.id, 'accepted')}
                className="h-8 text-xs flex-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConnectionResponse(conn.id, 'rejected')}
                className="h-8 text-xs flex-1"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Decline
              </Button>
            </div>
          )}

          {conn.status === 'accepted' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => startChat(otherUser?.id)}
                className="h-8 text-xs flex-1"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                Chat
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-green-500 flex-1 justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Connected</span>
              </div>
            </div>
          )}

          {conn.status === 'pending' && !isReceiver && (
            <div className="flex items-center gap-2 text-xs text-yellow-600">
              <Clock className="w-4 h-4" />
              <span>Request pending</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 sm:h-18 items-center gap-2 sm:gap-4 px-4 sm:px-5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 sm:h-11 sm:w-11 md:hidden" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">My Connections</h1>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-8 max-w-7xl mx-auto">
        {/* Search Bar */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 sm:mb-6 h-auto">
            <TabsTrigger value="following" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2">
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Following</span>
              <span className="sm:hidden">Follow</span>
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 px-1 text-[10px]">
                {following.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2">
              <UserMinus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Followers</span>
              <span className="sm:hidden">Follw</span>
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 px-1 text-[10px]">
                {followers.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Received</span>
              <span className="sm:hidden">Recv</span>
              {receivedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-0.5 sm:ml-1 h-4 px-1 text-[10px]">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-2">
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sent</span>
              <span className="sm:hidden">Sent</span>
              <Badge variant="secondary" className="ml-0.5 sm:ml-1 h-4 px-1 text-[10px]">
                {sentRequests.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Following Tab */}
          <TabsContent value="following" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
              </div>
            ) : filterConnections(following).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No connections found' : 'No connections yet'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      className="mt-4" 
                      onClick={() => navigate('/find-team')}
                      size="sm"
                    >
                      Find Co-Founders
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterConnections(following).map(conn => renderUserCard(conn))}
              </div>
            )}
          </TabsContent>

          {/* Followers Tab */}
          <TabsContent value="followers" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
              </div>
            ) : filterConnections(followers).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <UserMinus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No followers found' : 'No followers yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterConnections(followers).map(conn => renderUserCard(conn))}
              </div>
            )}
          </TabsContent>

          {/* Received Requests Tab */}
          <TabsContent value="received" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
              </div>
            ) : filterConnections(receivedRequests).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No requests found' : 'No pending requests'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterConnections(receivedRequests).map(conn => renderUserCard(conn, true))}
              </div>
            )}
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent" className="space-y-4">
            {loading ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
              </div>
            ) : filterConnections(sentRequests).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    {searchQuery ? 'No requests found' : 'No sent requests'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterConnections(sentRequests).map(conn => renderUserCard(conn))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <PaymentRequiredDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        feature={blockedFeature}
      />
    </div>
  );
};

export default Connections;
