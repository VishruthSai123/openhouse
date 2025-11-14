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

const ProjectDetail = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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
        <div className="container flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold truncate">{project.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {project.github_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                </a>
              </Button>
            )}
            {project.demo_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={project.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-7xl mx-auto">
        {/* Project Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{project.category}</Badge>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <CardDescription className="text-base mt-2">
                  {project.description}
                </CardDescription>
                {project.tags && project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
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

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="team">Team ({members.length})</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createTask()}
              />
              <Button onClick={createTask}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* To Do */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Circle className="w-4 h-4 text-gray-500" />
                    To Do ({tasksByStatus.todo.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasksByStatus.todo.map((task) => (
                    <Card key={task.id} className="p-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* In Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    In Progress ({tasksByStatus.in_progress.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasksByStatus.in_progress.map((task) => (
                    <Card key={task.id} className="p-3">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'done')}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                        >
                          Move Back
                        </Button>
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>

              {/* Done */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Done ({tasksByStatus.done.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tasksByStatus.done.map((task) => (
                    <Card key={task.id} className="p-3 opacity-75">
                      <p className="text-sm font-medium line-through">{task.title}</p>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a milestone..."
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createMilestone()}
              />
              <Button onClick={createMilestone}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {milestones.map((milestone) => (
                <Card key={milestone.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <button
                      onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                      className="flex-shrink-0"
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${milestone.completed ? 'line-through opacity-75' : ''}`}>
                        {milestone.title}
                      </p>
                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {member.profiles?.full_name?.charAt(0).toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.profiles?.full_name || 'Anonymous'}</p>
                      <p className="text-sm text-muted-foreground">{member.profiles?.role}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProjectDetail;
