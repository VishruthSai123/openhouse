import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Users,
  Trophy,
  Briefcase,
  FileText,
  Settings,
  UserPlus,
  MessageCircle,
  MapPin,
  Link as LinkIcon,
  Github,
  Linkedin,
  Twitter,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  skills: string[] | null;
  builder_coins: number;
  connections_count: number;
  leaderboard_rank: number;
  created_at: string;
}

interface Post {
  id: string;
  post_type: string;
  title: string | null;
  content: string;
  created_at: string;
  tags: string[] | null;
  upvotes: number;
  comments: number;
}

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  visibility: string;
  github_url: string | null;
  demo_url: string | null;
  tags: string[] | null;
  created_at: string;
  is_creator: boolean;
  member_role: string | null;
}

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    skills: [] as string[],
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadProfile();
      loadPosts();
      loadProjects();

      // Set up real-time subscriptions
      const postsChannel = supabase
        .channel('profile-posts-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feed_posts',
            filter: `author_id=eq.${userId}`,
          },
          () => {
            console.log('Posts updated, reloading...');
            loadPosts();
          }
        )
        .subscribe();

      const projectsChannel = supabase
        .channel('profile-projects-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
          },
          () => {
            console.log('Projects updated, reloading...');
            loadProjects();
          }
        )
        .subscribe();

      const membersChannel = supabase
        .channel('profile-members-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_members',
          },
          () => {
            console.log('Project members updated, reloading...');
            loadProjects();
          }
        )
        .subscribe();

      // Subscribe to upvotes changes (interactions table)
      const upvotesChannel = supabase
        .channel('profile-interactions-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feed_post_interactions',
          },
          () => {
            console.log('Interactions updated, reloading posts...');
            loadPosts();
          }
        )
        .subscribe();

      // Subscribe to comments changes
      const commentsChannel = supabase
        .channel('profile-comments-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feed_post_comments',
          },
          () => {
            console.log('Comments updated, reloading posts...');
            loadPosts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(postsChannel);
        supabase.removeChannel(projectsChannel);
        supabase.removeChannel(membersChannel);
        supabase.removeChannel(upvotesChannel);
        supabase.removeChannel(commentsChannel);
      };
    }
  }, [userId, currentUserId]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setIsOwnProfile(user.id === userId);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Load profile with stats
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get connections count
      const { count: connectionsCount } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');

      // Get leaderboard rank
      const { count: higherRanks } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('builder_coins', profileData.builder_coins || 0);

      setProfile({
        ...profileData,
        connections_count: connectionsCount || 0,
        leaderboard_rank: (higherRanks || 0) + 1,
      });

      // Check connection status if not own profile
      if (currentUserId && userId !== currentUserId) {
        const { data: connection } = await supabase
          .from('connections')
          .select('status')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
          .single();

        if (connection) {
          setConnectionStatus(connection.status as 'pending' | 'accepted');
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      console.log('Loading posts for user:', userId);
      
      // Get all posts by this user
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('id, post_type, title, content, created_at, tags')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      console.log('Found posts:', postsData?.length || 0);

      // Get upvotes and comments count for each post
      const postsWithCounts = await Promise.all(
        (postsData || []).map(async (post) => {
          const [interactionsRes, commentsRes] = await Promise.all([
            supabase
              .from('feed_post_interactions')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id)
              .eq('interaction_type', 'upvote'),
            supabase
              .from('feed_post_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id),
          ]);

          return {
            ...post,
            upvotes: interactionsRes.count || 0,
            comments: commentsRes.count || 0,
          };
        })
      );

      console.log('Posts with counts:', postsWithCounts);
      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const loadProjects = async () => {
    try {
      console.log('Loading projects for user:', userId);
      
      // Get all public projects
      const { data: allProjects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Get project memberships for this user
      const { data: memberships, error: membersError } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', userId);

      if (membersError) throw membersError;

      const memberProjectIds = new Set(memberships?.map(m => m.project_id) || []);
      const memberRoles = new Map(memberships?.map(m => [m.project_id, m.role]) || []);

      // Filter to only projects where user is creator or member
      const userProjects = (allProjects || []).filter(project => 
        project.creator_id === userId || memberProjectIds.has(project.id)
      );

      const projectsData = userProjects.map((project) => ({
        ...project,
        is_creator: project.creator_id === userId,
        member_role: memberRoles.get(project.id) || null,
      }));

      console.log('Found projects:', projectsData.length);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleConnect = async () => {
    if (!currentUserId || !userId) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          sender_id: currentUserId,
          receiver_id: userId,
          status: 'pending',
        });

      if (error) throw error;

      setConnectionStatus('pending');
      toast({
        title: 'Connection Request Sent',
        description: 'Your connection request has been sent.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMessage = async () => {
    if (!currentUserId || !userId) return;

    try {
      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('conversation_type', 'direct')
        .limit(1)
        .single();

      if (existingConv) {
        navigate(`/messages?conversation=${existingConv.id}`);
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            conversation_type: 'direct',
          })
          .select()
          .single();

        if (convError) throw convError;

        // Add participants
        await supabase.from('conversation_participants').insert([
          { conversation_id: newConv.id, user_id: currentUserId },
          { conversation_id: newConv.id, user_id: userId },
        ]);

        navigate(`/messages?conversation=${newConv.id}`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    }
  };

  const handleEditProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          skills: editForm.skills,
        })
        .eq('id', currentUserId);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });

      setEditDialogOpen(false);
      loadProfile();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        skills: profile.skills || [],
      });
      setEditDialogOpen(true);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'founder': return 'bg-purple-500';
      case 'developer': return 'bg-blue-500';
      case 'designer': return 'bg-pink-500';
      case 'marketer': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Profile not found</p>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 sm:h-18 items-center gap-4 px-4 sm:px-5">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">{profile.full_name || 'Profile'}</h1>
          </div>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Settings className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </header>

      <main className="container px-4 sm:px-5 py-6 max-w-5xl mx-auto">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 text-2xl">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name || 'Profile'} className="object-cover w-full h-full" />
                ) : (
                  <AvatarFallback className="text-3xl">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">{profile.full_name || 'Anonymous'}</h2>
                    {profile.role && (
                      <Badge className={`${getRoleBadgeColor(profile.role)} text-white`}>
                        {profile.role}
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!isOwnProfile && currentUserId && (
                    <div className="flex gap-2">
                      {connectionStatus === 'none' && (
                        <Button onClick={handleConnect} size="sm">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Connect
                        </Button>
                      )}
                      {connectionStatus === 'pending' && (
                        <Button variant="outline" size="sm" disabled>
                          Request Sent
                        </Button>
                      )}
                      {connectionStatus === 'accepted' && (
                        <>
                          <Button variant="outline" size="sm" disabled>
                            <Users className="w-4 h-4 mr-2" />
                            Connected
                          </Button>
                          <Button onClick={handleMessage} size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{profile.connections_count}</p>
                    <p className="text-sm text-muted-foreground">Connections</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{profile.builder_coins}</p>
                    <p className="text-sm text-muted-foreground">Builder Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">#{profile.leaderboard_rank}</p>
                    <p className="text-sm text-muted-foreground">Rank</p>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-muted-foreground mb-4">{profile.bio}</p>
                )}

                {/* Skills */}
                {profile.skills && profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Posts and Projects */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="posts">
              <FileText className="w-4 h-4 mr-2" />
              Posts ({posts.length})
            </TabsTrigger>
            <TabsTrigger value="projects">
              <Briefcase className="w-4 h-4 mr-2" />
              Projects ({projects.length})
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No posts yet</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/feed/${post.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {post.title && <CardTitle className="mb-2">{post.title}</CardTitle>}
                        <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex gap-4">
                        <span>{post.upvotes} upvotes</span>
                        <span>{post.comments} comments</span>
                      </div>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            {projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No public projects yet</p>
                </CardContent>
              </Card>
            ) : (
              projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{project.title}</CardTitle>
                          {project.is_creator && (
                            <Badge variant="secondary">Creator</Badge>
                          )}
                          {!project.is_creator && project.member_role && (
                            <Badge variant="outline">{project.member_role}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge>{project.category}</Badge>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                    <div className="flex gap-3">
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <Github className="w-4 h-4" />
                          GitHub
                        </a>
                      )}
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Demo
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="skills">Skills (comma separated)</Label>
              <Input
                id="skills"
                value={editForm.skills.join(', ')}
                onChange={(e) =>
                  setEditForm({ ...editForm, skills: e.target.value.split(',').map((s) => s.trim()) })
                }
                placeholder="React, Node.js, Design"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditProfile} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
