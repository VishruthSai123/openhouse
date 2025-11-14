import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  UserPlus,
  Mail,
  Briefcase,
  Target,
  Star,
} from "lucide-react";

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

const FindTeam = () => {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadUsers();
      loadConnections();
    }
  }, [currentUser]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users, connections]);

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

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id || '')
        .eq('onboarding_completed', true)
        .order('builder_coins', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          sender:sender_id(id, email, full_name, role, bio, skills, interests, builder_coins),
          receiver:receiver_id(id, email, full_name, role, bio, skills, interests, builder_coins)
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.bio?.toLowerCase().includes(query) ||
        user.skills?.some(skill => skill.toLowerCase().includes(query)) ||
        user.interests?.some(interest => interest.toLowerCase().includes(query))
      );
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const getConnectionStatus = (userId: string): Connection | undefined => {
    return connections.find(conn => 
      (conn.sender_id === currentUser?.id && conn.receiver_id === userId) ||
      (conn.sender_id === userId && conn.receiver_id === currentUser?.id)
    );
  };

  const sendConnectionRequest = async () => {
    if (!selectedUser || !currentUser) return;

    try {
      setSendingRequest(true);

      const { error } = await supabase
        .from('connections')
        .insert({
          sender_id: currentUser.id,
          receiver_id: selectedUser.id,
          status: 'pending',
          message: connectionMessage || null,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Connection request sent to ${selectedUser.full_name}`,
      });

      setSelectedUser(null);
      setConnectionMessage("");
      await loadConnections();
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send connection request",
        variant: "destructive",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleConnectionResponse = async (connectionId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId);

      if (updateError) throw updateError;

      // Award 5 Builder Coins to both users if accepted
      if (status === 'accepted') {
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
          await Promise.all([
            // Award sender
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
            }),
            // Award receiver
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
            }),
          ]);
        }
      }

      toast({
        title: "Success",
        description: `Connection request ${status}`,
      });

      await loadConnections();
    } catch (error: any) {
      console.error('Error updating connection:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update connection",
        variant: "destructive",
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

  const pendingRequests = connections.filter(c => 
    c.status === 'pending' && c.receiver_id === currentUser?.id
  );
  const sentRequests = connections.filter(c => 
    c.status === 'pending' && c.sender_id === currentUser?.id
  );
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Find Co-Founders</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="browse" className="gap-2">
              <Search className="w-4 h-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <Mail className="w-4 h-4" />
              Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <UserPlus className="w-4 h-4" />
              My Team ({acceptedConnections.length})
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search by name, skills, interests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="founder">Founder</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="designer">Designer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="marketer">Marketer</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading users...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => {
                  const connection = getConnectionStatus(user.id);
                  const roleInfo = user.role ? roleConfig[user.role as keyof typeof roleConfig] : roleConfig.founder;

                  return (
                    <Card key={user.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} font-semibold`}>
                              {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg truncate">{user.full_name || 'Anonymous'}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`${roleInfo.bgColor} text-xs`}>
                                <Briefcase className={`w-3 h-3 mr-1 ${roleInfo.color}`} />
                                {user.role}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1 text-yellow-500" />
                                {user.builder_coins}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {user.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
                        )}
                        
                        {user.skills && user.skills.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Skills
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {user.skills.slice(0, 3).map((skill, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {user.skills.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{user.skills.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {connection ? (
                          <div className="flex items-center gap-2">
                            {connection.status === 'pending' && (
                              <>
                                <Clock className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-muted-foreground">
                                  {connection.sender_id === currentUser?.id ? 'Request sent' : 'Request received'}
                                </span>
                              </>
                            )}
                            {connection.status === 'accepted' && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-green-500">Connected</span>
                              </>
                            )}
                            {connection.status === 'rejected' && (
                              <>
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-muted-foreground">Request declined</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                className="w-full" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Request
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Send Connection Request</DialogTitle>
                                <DialogDescription>
                                  Send a connection request to {user.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="message">Message (Optional)</Label>
                                  <Textarea
                                    id="message"
                                    placeholder="Introduce yourself and explain why you'd like to connect..."
                                    value={connectionMessage}
                                    onChange={(e) => setConnectionMessage(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                  />
                                  <p className="text-xs text-muted-foreground text-right">
                                    {connectionMessage.length}/500
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={sendConnectionRequest}
                                  disabled={sendingRequest}
                                >
                                  {sendingRequest ? 'Sending...' : 'Send Request'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => {
                  const sender = request.sender as Profile;
                  const roleInfo = sender.role ? roleConfig[sender.role as keyof typeof roleConfig] : roleConfig.founder;

                  return (
                    <Card key={request.id}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row items-start gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} font-semibold`}>
                              {sender.full_name?.charAt(0).toUpperCase() || sender.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div>
                              <h3 className="font-semibold">{sender.full_name || 'Anonymous'}</h3>
                              <Badge variant="secondary" className={`${roleInfo.bgColor} text-xs mt-1`}>
                                {sender.role}
                              </Badge>
                            </div>
                            {request.message && (
                              <p className="text-sm text-muted-foreground">{request.message}</p>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleConnectionResponse(request.id, 'accepted')}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConnectionResponse(request.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {sentRequests.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mt-8">Sent Requests</h2>
                <div className="space-y-4">
                  {sentRequests.map((request) => {
                    const receiver = request.receiver as Profile;
                    const roleInfo = receiver.role ? roleConfig[receiver.role as keyof typeof roleConfig] : roleConfig.founder;

                    return (
                      <Card key={request.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} font-semibold`}>
                                {receiver.full_name?.charAt(0).toUpperCase() || receiver.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h3 className="font-semibold">{receiver.full_name || 'Anonymous'}</h3>
                              <p className="text-sm text-muted-foreground">Request pending</p>
                            </div>
                            <Clock className="w-5 h-5 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-6">
            {acceptedConnections.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">No connections yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start by sending connection requests!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {acceptedConnections.map((connection) => {
                  const isReceiver = connection.receiver_id === currentUser?.id;
                  const otherUser = (isReceiver ? connection.sender : connection.receiver) as Profile;
                  const roleInfo = otherUser.role ? roleConfig[otherUser.role as keyof typeof roleConfig] : roleConfig.founder;

                  return (
                    <Card key={connection.id}>
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} font-semibold`}>
                              {otherUser.full_name?.charAt(0).toUpperCase() || otherUser.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{otherUser.full_name || 'Anonymous'}</CardTitle>
                            <Badge variant="secondary" className={`${roleInfo.bgColor} text-xs mt-1`}>
                              {otherUser.role}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {otherUser.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{otherUser.bio}</p>
                        )}
                        <div className="flex items-center gap-2 mt-4">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-500">Connected</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FindTeam;
