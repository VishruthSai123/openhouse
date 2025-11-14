import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, X, Plus, Globe, Lock } from 'lucide-react';

const CreateProject = () => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('planning');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = [
    'SaaS',
    'E-commerce',
    'EdTech',
    'HealthTech',
    'FinTech',
    'Social',
    'Gaming',
    'AI/ML',
    'Other'
  ];

  const addTag = () => {
    if (newTag && !tags.includes(newTag) && tags.length < 10) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          status,
          visibility,
          github_url: githubUrl.trim() || null,
          demo_url: demoUrl.trim() || null,
          tags: tags.length > 0 ? tags : null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Add creator as owner member
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      // Award coins for creating project
      await Promise.all([
        supabase.from('coin_transactions').insert({
          user_id: user.id,
          amount: 15,
          reason: 'Project created',
          reference_type: 'project',
          reference_id: project.id,
        }),
        supabase.rpc('increment_builder_coins', { user_id: user.id, coins: 15 }),
      ]);

      toast({
        title: 'Success!',
        description: 'Project created successfully (+15 coins)',
      });

      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="text-base sm:text-xl font-bold">Create New Project</h1>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-8 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-lg sm:text-2xl">Project Details</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Create a build space to collaborate with your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">
                  Project Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., AI-Powered Task Manager"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  className="h-9 sm:h-10 text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {title.length}/100
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project, its goals, and what you're building..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  className="text-sm min-h-[100px] sm:min-h-[120px]"
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {description.length}/2000
                </p>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger id="category" className="h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-sm">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm">Current Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="h-9 sm:h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning" className="text-sm">Planning</SelectItem>
                      <SelectItem value="in_progress" className="text-sm">In Progress</SelectItem>
                      <SelectItem value="completed" className="text-sm">Completed</SelectItem>
                      <SelectItem value="on_hold" className="text-sm">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label className="text-sm">Visibility</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card
                    className={`cursor-pointer transition-colors ${
                      visibility === 'public' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setVisibility('public')}
                  >
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm sm:text-base">Public</p>
                        <p className="text-xs text-muted-foreground">
                          Anyone can view
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card
                    className={`cursor-pointer transition-colors ${
                      visibility === 'private' ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setVisibility('private')}
                  >
                    <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm sm:text-base">Private</p>
                        <p className="text-xs text-muted-foreground">
                          Team only
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* URLs */}
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github" className="text-sm">GitHub Repository (Optional)</Label>
                  <Input
                    id="github"
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo" className="text-sm">Live Demo URL (Optional)</Label>
                  <Input
                    id="demo"
                    type="url"
                    placeholder="https://yourproject.com"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="h-9 sm:h-10 text-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm">Tech Stack / Tags (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g., React, Node.js)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    maxLength={20}
                    className="h-9 sm:h-10 text-sm"
                  />
                  <Button type="button" variant="outline" onClick={addTag} disabled={tags.length >= 10} className="h-9 w-9 sm:h-10 sm:w-10 p-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {tags.length}/10 tags
                </p>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/projects')}
                  className="flex-1 h-9 sm:h-10 text-sm"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 h-9 sm:h-10 text-sm">
                  {loading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  );
};

export default CreateProject;
