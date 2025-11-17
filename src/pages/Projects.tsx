import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Search,
  Plus,
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  Pause,
  Globe,
  Lock,
  Github,
  ExternalLink,
  LogOut,
} from 'lucide-react';

interface Project {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  visibility: 'public' | 'private';
  github_url: string | null;
  demo_url: string | null;
  tags: string[] | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
  project_members?: { id: string; user_id: string }[];
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exitingProject, setExitingProject] = useState<{ id: string; title: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = ['SaaS', 'E-commerce', 'EdTech', 'HealthTech', 'FinTech', 'Social', 'Gaming', 'AI/ML', 'Other'];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };

    fetchUser();
    loadProjects();

    // Set up real-time subscription for projects
    const channel = supabase
      .channel('projects-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        () => {
          // Reload projects when they change
          loadProjects();
        }
      )
      .subscribe();

    // Set up real-time subscription for project_members
    const membersChannel = supabase
      .channel('project-members-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
        },
        () => {
          // Reload projects when memberships change
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, categoryFilter, statusFilter, projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Guest - only show public projects
        const { data, error } = await supabase
          .from('projects')
          .select(`
            *,
            profiles!projects_creator_id_fkey(full_name, avatar_url, role),
            project_members(id, user_id)
          `)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data as any || []);
        return;
      }

      // Get projects where user is owner
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_creator_id_fkey(full_name, avatar_url, role),
          project_members(id, user_id)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Get projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          projects (
            *,
            profiles!projects_creator_id_fkey(full_name, avatar_url, role),
            project_members(id, user_id)
          )
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Get public projects from others
      const { data: publicProjects, error: publicError } = await supabase
        .from('projects')
        .select(`
          *,
          profiles!projects_creator_id_fkey(full_name, avatar_url, role),
          project_members(id, user_id)
        `)
        .eq('visibility', 'public')
        .neq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (publicError) throw publicError;

      // Combine and deduplicate projects
      const memberProjectsList = memberProjects?.map(mp => mp.projects).filter(Boolean) || [];
      const allProjects = [...(ownedProjects || []), ...memberProjectsList, ...(publicProjects || [])];
      
      // Remove duplicates by id
      const uniqueProjects = Array.from(
        new Map(allProjects.map(p => [p.id, p])).values()
      );

      setProjects(uniqueProjects as any || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExitTeam = async () => {
    if (!exitingProject || !currentUserId) return;

    try {
      // Find the membership record
      const project = projects.find(p => p.id === exitingProject.id);
      const membership = project?.project_members?.find(m => m.user_id === currentUserId);

      if (!membership) {
        toast({
          title: 'Error',
          description: 'Membership not found',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', membership.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'You have left the team',
      });

      // Reload projects
      loadProjects();
      setExitingProject(null);
    } catch (error) {
      console.error('Error leaving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave team',
        variant: 'destructive',
      });
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      planning: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Planning' },
      in_progress: { icon: Briefcase, color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'In Progress' },
      completed: { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Completed' },
      on_hold: { icon: Pause, color: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'On Hold' },
    };
    return configs[status as keyof typeof configs] || configs.planning;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 sm:h-18 items-center gap-2 sm:gap-4 px-4 sm:px-5">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Build Spaces</h1>
          </div>
          <div className="ml-auto">
            <Button onClick={() => navigate('/projects/new')} size="sm" className="h-10 sm:h-11 text-xs sm:text-sm">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-8 max-w-7xl mx-auto">
        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-pulse text-muted-foreground text-sm">Loading projects...</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 sm:py-12">
              <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground text-sm sm:text-base">No projects found</p>
              <Button className="mt-4 h-9 sm:h-10 text-sm" onClick={() => navigate('/projects/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((project) => {
              const statusConfig = getStatusConfig(project.status);
              const StatusIcon = statusConfig.icon;
              const memberCount = project.project_members?.length || 0;
              const isOwner = currentUserId && project.creator_id === currentUserId;
              const isMember = currentUserId && project.project_members?.some(m => m.user_id === currentUserId);

              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base sm:text-lg truncate">{project.title}</CardTitle>
                          {isMember && !isOwner && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                              Team Member
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {project.category}
                          </Badge>
                          <Badge variant="outline" className={`${statusConfig.bgColor} text-xs`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${statusConfig.color}`} />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {project.visibility === 'private' ? (
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        )}
                        {isMember && !isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExitingProject({ id: project.id, title: project.title });
                            }}
                          >
                            <LogOut className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent 
                    className="space-y-3 sm:space-y-4 px-3 sm:px-6 cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
                      {project.description}
                    </p>

                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {project.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Avatar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {project.profiles?.full_name?.charAt(0).toUpperCase() || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">
                          {project.profiles?.full_name || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {memberCount + 1}
                        </div>
                        {project.github_url && (
                          <Github className="w-3 h-3" />
                        )}
                        {project.demo_url && (
                          <ExternalLink className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Exit Team Dialog */}
      <AlertDialog open={!!exitingProject} onOpenChange={(open) => !open && setExitingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{exitingProject?.title}"? You will no longer have access to this project unless you are invited again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExitTeam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exit Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;
