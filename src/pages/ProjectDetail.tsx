import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import ProjectChatFab from '@/components/ProjectChatFab';
import {
  ArrowLeft,
  Users,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Github,
  ExternalLink,
  UserPlus,
  Trash2,
  Edit,
} from 'lucide-react';

interface Project {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  visibility: string;
  github_url: string | null;
  demo_url: string | null;
  tags: string[] | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface Follower {
  id: string;
  follower_id: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setCurrentUserId(user.id);

      // Load project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*, profiles!projects_creator_id_fkey(full_name, avatar_url, role)')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData as any);
      setIsOwner(projectData.creator_id === user.id);

      // Load members
      const { data: membersData } = await supabase
        .from('project_members')
        .select('*, profiles!project_members_user_id_fkey(full_name, avatar_url, role)')
        .eq('project_id', id);

      setMembers(membersData as any || []);

      // Load tasks
      const { data: tasksData } = await supabase
        .from('project_tasks')
        .select('*, profiles!project_tasks_assigned_to_fkey(full_name, avatar_url)')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setTasks(tasksData as any || []);

      // Load milestones
      const { data: milestonesData } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', id)
        .order('target_date', { ascending: true });

      setMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: id,
          title: newTaskTitle.trim(),
          status: 'todo',
          priority: 'medium',
        });

      if (error) throw error;

      setNewTaskTitle('');
      await loadProjectData();
      
      toast({
        title: 'Success',
        description: 'Task created',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    try {
      const { error } = await supabase
        .from('project_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      await loadProjectData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const createMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: id,
          title: newMilestoneTitle.trim(),
          completed: false,
        });

      if (error) throw error;

      setNewMilestoneTitle('');
      await loadProjectData();
      
      toast({
        title: 'Success',
        description: 'Milestone created',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('project_milestones')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', milestoneId);

      if (error) throw error;
      await loadProjectData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const loadFollowers = async () => {
    if (!currentUserId) return;
    
    try {
      // Get accepted connections (both directions)
      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select(`
          id,
          sender_id,
          receiver_id,
          sender:profiles!connections_sender_id_fkey (
            id,
            full_name,
            avatar_url,
            role
          ),
          receiver:profiles!connections_receiver_id_fkey (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (connError) throw connError;

      // Get member IDs to filter out
      const memberIds = members.map(m => m.user_id);

      // Transform connections to follower format
      const availableFollowers: Follower[] = connections
        ?.map(conn => {
          // Get the other user (not current user)
          const isCurrentUserSender = conn.sender_id === currentUserId;
          const otherUserId = isCurrentUserSender ? conn.receiver_id : conn.sender_id;
          const otherUserProfile = isCurrentUserSender ? conn.receiver : conn.sender;

          return {
            id: conn.id,
            follower_id: otherUserId,
            profiles: otherUserProfile,
          };
        })
        .filter(f => !memberIds.includes(f.follower_id)) || [];

      setFollowers(availableFollowers);
      setShowInviteDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const inviteFollower = async (followerId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: id,
          user_id: followerId,
          role: 'member',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member added successfully',
      });

      // Refresh data
      await loadProjectData();
      await loadFollowers(); // Refresh followers list
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    // Prevent removing the owner
    if (memberUserId === project?.creator_id) {
      toast({
        title: 'Error',
        description: 'Cannot remove project owner',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });

      // Refresh data
      await loadProjectData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Project not found</p>
            <Button onClick={() => navigate('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="h-9 w-9 sm:h-10 sm:w-10">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold truncate">{project.title}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {project.github_url && (
              <Button variant="outline" size="sm" asChild className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                  <Github className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              </Button>
            )}
            {project.demo_url && (
              <Button variant="outline" size="sm" asChild className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-8 max-w-7xl mx-auto">
        {/* Project Info */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{project.category}</Badge>
                  <Badge variant="outline" className="text-xs">{project.status}</Badge>
                </div>
                <CardDescription className="text-sm sm:text-base mt-2">
                  {project.description}
                </CardDescription>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    {project.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="tasks" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks</TabsTrigger>
            <TabsTrigger value="milestones" className="text-xs sm:text-sm"><span className="hidden sm:inline">Milestones</span><span className="sm:hidden">Goals</span></TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm">Team<span className="hidden sm:inline"> ({members.length})</span></TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-3 sm:space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createTask()}
                className="h-9 sm:h-10 text-sm"
              />
              <Button onClick={createTask} className="h-9 sm:h-10 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3">
              {/* To Do */}
              <Card className="min-w-[280px] flex-1 md:min-w-0">
                <CardHeader className="pb-3 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                    <Circle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                    To Do ({tasksByStatus.todo.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 sm:p-6 pt-0">
                  {tasksByStatus.todo.map((task) => (
                    <Card key={task.id} className="p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm font-medium line-clamp-2">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="h-7 sm:h-8 text-xs"
                        >
                          Start
                        </Button>
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card className="min-w-[280px] flex-1 md:min-w-0">
                <CardHeader className="pb-3 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                    In Progress ({tasksByStatus.in_progress.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 sm:p-6 pt-0">
                  {tasksByStatus.in_progress.map((task) => (
                    <Card key={task.id} className="p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm font-medium line-clamp-2">{task.title}</p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'done')}
                          className="h-7 sm:h-8 text-xs"
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                          className="h-7 sm:h-8 text-xs"
                        >
                          Move Back
                        </Button>
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* Done */}
              <Card className="min-w-[280px] flex-1 md:min-w-0">
                <CardHeader className="pb-3 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                    Done ({tasksByStatus.done.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 sm:p-6 pt-0">
                  {tasksByStatus.done.map((task) => (
                    <Card key={task.id} className="p-2.5 sm:p-3 opacity-75">
                      <p className="text-xs sm:text-sm font-medium line-through line-clamp-2">{task.title}</p>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-3 sm:space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a milestone..."
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createMilestone()}
                className="h-9 sm:h-10 text-sm"
              />
              <Button onClick={createMilestone} className="h-9 sm:h-10 px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {milestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                      className="flex-shrink-0"
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm sm:text-base font-medium ${milestone.completed ? 'line-through opacity-75' : ''}`}>
                        {milestone.title}
                      </p>
                      {milestone.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{milestone.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-3 sm:space-y-4">
            {isOwner && (
              <Button
                onClick={loadFollowers}
                className="w-full sm:w-auto"
                size="sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite from Connections
              </Button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {members.map((member) => {
                const isMemberOwner = member.user_id === project?.creator_id;
                const canRemove = isOwner && !isMemberOwner;
                
                return (
                  <Card key={member.id}>
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                        <AvatarFallback className="text-xs sm:text-sm">
                          {member.profiles?.full_name?.charAt(0).toUpperCase() || 'A'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-medium truncate">{member.profiles?.full_name || 'Anonymous'}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.profiles?.role}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{member.role}</Badge>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeMember(member.id, member.user_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Invite Followers Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Connections to Project</DialogTitle>
            <DialogDescription>
              Select connections to invite to your project team
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {followers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No available connections to invite</p>
                <p className="text-xs mt-1">All your connections are already team members</p>
              </div>
            ) : (
              followers.map((follower) => (
                <Card key={follower.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm">
                        {follower.profiles?.full_name?.charAt(0).toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {follower.profiles?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {follower.profiles?.role || 'User'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => inviteFollower(follower.follower_id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Chat Button */}
      <ProjectChatFab 
        projectId={project.id} 
        isTeamMember={isOwner || members.some(m => m.user_id === currentUserId)}
      />
    </div>
  );
};

export default ProjectDetail;
