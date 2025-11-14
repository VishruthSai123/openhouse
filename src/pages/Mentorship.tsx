import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { toast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  full_name?: string;
  role?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
}

interface MentorshipSession {
  id: string;
  topic: string;
  description?: string;
  scheduled_at?: string;
  status: string;
  created_at: string;
  mentor: Profile;
  mentee: Profile;
}

const Mentorship = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<Profile | null>(null);
  const [bookingData, setBookingData] = useState({
    topic: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(profileData);

      // Load mentors
      const { data: mentorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mentor')
        .neq('id', user.id);

      setMentors(mentorData || []);

      // Load user's sessions
      const { data: sessionsData } = await supabase
        .from('mentorship_sessions')
        .select(`
          *,
          mentor:profiles!mentorship_sessions_mentor_id_fkey(id, full_name, role, bio, skills),
          mentee:profiles!mentorship_sessions_mentee_id_fkey(id, full_name, role, bio, skills)
        `)
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      setSessions(sessionsData as any || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load mentorship data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async () => {
    if (!selectedMentor || !bookingData.topic || !bookingData.scheduledDate || !bookingData.scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${bookingData.scheduledDate}T${bookingData.scheduledTime}`);

      const { error } = await supabase
        .from('mentorship_sessions')
        .insert({
          mentor_id: selectedMentor.id,
          mentee_id: currentUser.id,
          topic: bookingData.topic,
          description: bookingData.description,
          scheduled_at: scheduledAt.toISOString(),
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Session Requested",
        description: "Your mentorship session request has been sent!"
      });

      setSelectedMentor(null);
      setBookingData({
        topic: "",
        description: "",
        scheduledDate: "",
        scheduledTime: "",
      });

      loadData();
    } catch (error) {
      console.error('Error booking session:', error);
      toast({
        title: "Error",
        description: "Failed to book session",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, newStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('mentorship_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session Updated",
        description: `Session ${newStatus === 'confirmed' ? 'confirmed' : newStatus === 'completed' ? 'completed' : 'cancelled'}`,
      });

      loadData();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive"
      });
    }
  };

  const filteredMentors = mentors.filter(mentor => {
    const searchLower = searchQuery.toLowerCase();
    return (
      mentor.full_name?.toLowerCase().includes(searchLower) ||
      mentor.bio?.toLowerCase().includes(searchLower) ||
      mentor.skills?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  });

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    cancelled: { label: 'Cancelled', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between px-4 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mentorship</h1>
              <p className="text-sm text-muted-foreground">Connect with experienced mentors</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-7xl mx-auto">
        <Tabs defaultValue="mentors" className="space-y-6">
          <TabsList>
            <TabsTrigger value="mentors">Find Mentors</TabsTrigger>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="mentors" className="space-y-6">
            <div className="flex gap-4">
              <Input
                placeholder="Search mentors by name, skills, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {filteredMentors.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No mentors found</p>
                  <p className="text-sm">Try adjusting your search criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMentors.map((mentor) => (
                  <Card key={mentor.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-indigo-500/10 text-indigo-500">
                            {mentor.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{mentor.full_name}</CardTitle>
                          <CardDescription className="mt-1">
                            {mentor.bio || 'Experienced mentor ready to help'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {mentor.skills && mentor.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {mentor.skills.slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" onClick={() => setSelectedMentor(mentor)}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Book Session
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Book Mentorship Session</DialogTitle>
                            <DialogDescription>
                              Schedule a session with {mentor.full_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label htmlFor="topic">Topic *</Label>
                              <Input
                                id="topic"
                                placeholder="What would you like to discuss?"
                                value={bookingData.topic}
                                onChange={(e) => setBookingData({ ...bookingData, topic: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="description">Description (Optional)</Label>
                              <Textarea
                                id="description"
                                placeholder="Add more details about what you'd like to learn..."
                                value={bookingData.description}
                                onChange={(e) => setBookingData({ ...bookingData, description: e.target.value })}
                                rows={3}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="date">Date *</Label>
                                <Input
                                  id="date"
                                  type="date"
                                  value={bookingData.scheduledDate}
                                  onChange={(e) => setBookingData({ ...bookingData, scheduledDate: e.target.value })}
                                  min={new Date().toISOString().split('T')[0]}
                                />
                              </div>
                              <div>
                                <Label htmlFor="time">Time *</Label>
                                <Input
                                  id="time"
                                  type="time"
                                  value={bookingData.scheduledTime}
                                  onChange={(e) => setBookingData({ ...bookingData, scheduledTime: e.target.value })}
                                />
                              </div>
                            </div>
                            <Button 
                              className="w-full" 
                              onClick={handleBookSession}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Booking...
                                </>
                              ) : (
                                'Request Session'
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            {sessions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No mentorship sessions yet</p>
                  <p className="text-sm">Book your first session to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const isMentor = session.mentor.id === currentUser?.id;
                  const otherUser = isMentor ? session.mentee : session.mentor;
                  const statusInfo = statusConfig[session.status as keyof typeof statusConfig];

                  return (
                    <Card key={session.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-indigo-500/10 text-indigo-500">
                                {otherUser.full_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <CardTitle className="text-base">{session.topic}</CardTitle>
                              <CardDescription className="mt-1">
                                {isMentor ? 'Mentee' : 'Mentor'}: {otherUser.full_name}
                              </CardDescription>
                              {session.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {session.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {session.scheduled_at && (
                              <>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(session.scheduled_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {new Date(session.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </>
                            )}
                            <div className="text-xs">
                              {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                            </div>
                          </div>
                          {isMentor && session.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateSessionStatus(session.id, 'confirmed')}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateSessionStatus(session.id, 'cancelled')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
                              </Button>
                            </div>
                          )}
                          {session.status === 'confirmed' && (
                            <Button 
                              size="sm"
                              onClick={() => handleUpdateSessionStatus(session.id, 'completed')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Mark Complete
                            </Button>
                          )}
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

export default Mentorship;
