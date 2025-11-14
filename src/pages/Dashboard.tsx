import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Home,
  Lightbulb, 
  Users, 
  Briefcase, 
  GraduationCap, 
  Trophy,
  Coins,
  LogOut,
  Plus,
  TrendingUp,
  MessageSquare,
  Calendar
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  bio?: string;
  skills?: string[];
  builder_coins?: number;
  has_paid?: boolean;
}

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    ideasCount: 0,
    projectsCount: 0,
    connectionsCount: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        navigate('/onboarding');
        return;
      }

      setProfile(profileData);

      // Load stats
      const [ideasRes, projectsRes] = await Promise.all([
        supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('creator_id', user.id),
      ]);

      setStats({
        ideasCount: ideasRes.count || 0,
        projectsCount: projectsRes.count || 0,
        connectionsCount: 0, // TODO: Implement connections
      });

      // Load recent activity
      await loadRecentActivity(user.id);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async (userId: string) => {
    try {
      const activities: any[] = [];

      // Get recent ideas
      const { data: ideas } = await supabase
        .from('ideas')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      ideas?.forEach(idea => {
        activities.push({
          icon: <Lightbulb className="w-4 h-4 text-yellow-500" />,
          bgColor: 'bg-yellow-500/10',
          title: 'Posted an Idea',
          description: idea.title,
          time: formatDistanceToNow(new Date(idea.created_at), { addSuffix: true }),
          link: `/ideas/${idea.id}`,
        });
      });

      // Get recent projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, created_at')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);

      projects?.forEach(project => {
        activities.push({
          icon: <Briefcase className="w-4 h-4 text-green-500" />,
          bgColor: 'bg-green-500/10',
          title: 'Created a Project',
          description: project.title,
          time: formatDistanceToNow(new Date(project.created_at), { addSuffix: true }),
          link: `/projects/${project.id}`,
        });
      });

      // Get recent connections
      const { data: connections } = await supabase
        .from('connections')
        .select('id, created_at, sender_id, receiver_id, profiles!connections_receiver_id_fkey(full_name)')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(3);

      connections?.forEach(conn => {
        const otherUser = conn.profiles as any;
        activities.push({
          icon: <Users className="w-4 h-4 text-blue-500" />,
          bgColor: 'bg-blue-500/10',
          title: 'New Connection',
          description: `Connected with ${otherUser?.full_name || 'a builder'}`,
          time: formatDistanceToNow(new Date(conn.created_at), { addSuffix: true }),
          link: '/find-team',
        });
      });

      // Sort all activities by time and take top 10
      activities.sort((a, b) => {
        const timeA = a.time.includes('ago') ? 1 : 0;
        const timeB = b.time.includes('ago') ? 1 : 0;
        return timeB - timeA;
      });

      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const roleConfig = {
    founder: { icon: Lightbulb, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    developer: { icon: Home, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    designer: { icon: Trophy, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    editor: { icon: MessageSquare, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    marketer: { icon: TrendingUp, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    mentor: { icon: GraduationCap, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const roleInfo = profile?.role ? roleConfig[profile.role as keyof typeof roleConfig] : roleConfig.founder;
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold">Open House</h1>
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/ideas')}>
                <Lightbulb className="w-4 h-4 mr-2" />
                Ideas
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/find-team')}>
                <Users className="w-4 h-4 mr-2" />
                Find Team
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                <Briefcase className="w-4 h-4 mr-2" />
                Projects
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/mentorship')}>
                <GraduationCap className="w-4 h-4 mr-2" />
                Mentorship
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold">{profile?.builder_coins || 0}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className={`${roleInfo.bgColor} ${roleInfo.color} text-lg font-semibold`}>
                  {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0] || 'Builder'}! 👋</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={`${roleInfo.bgColor}`}>
                    <RoleIcon className={`w-3 h-3 mr-1 ${roleInfo.color}`} />
                    {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
                  </Badge>
                  {!profile?.has_paid && (
                    <Badge variant="destructive">Payment Pending</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Builder Coins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{profile?.builder_coins || 0}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">My Ideas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{stats.ideasCount}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold">{stats.projectsCount}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold">{stats.connectionsCount}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/ideas/new')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Post an Idea</CardTitle>
                  <CardDescription>Share your startup idea</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/find-team')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Find Co-Founders</CardTitle>
                  <CardDescription>Build your dream team</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/projects/new')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Briefcase className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Start a Project</CardTitle>
                  <CardDescription>Create a build space</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate('/leaderboard')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Leaderboard</CardTitle>
                  <CardDescription>Check your ranking</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Stay updated with your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No recent activity yet</p>
                <p className="text-sm">Start by posting an idea or joining a project!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                    <div className={`p-2 rounded-lg ${activity.bgColor}`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                    {activity.link && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(activity.link)}>
                        View
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
