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
import { ArrowLeft, X, Plus } from 'lucide-react';

const CreateIdea = () => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('idea');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
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

  const stages = [
    { value: 'idea', label: '💡 Just an Idea' },
    { value: 'validating', label: '🔍 Validating' },
    { value: 'building', label: '🔨 Building' },
    { value: 'mvp', label: '🚀 MVP Ready' },
    { value: 'launched', label: '✨ Launched' }
  ];

  const suggestedRoles = [
    'Technical Co-Founder',
    'Business Co-Founder',
    'Developer',
    'Designer',
    'Marketer',
    'Sales',
    'Finance Expert',
    'Legal Advisor',
    'Mentor',
    'Investor'
  ];

  const addTag = (tag: string) => {
    if (tag && !lookingFor.includes(tag) && lookingFor.length < 10) {
      setLookingFor([...lookingFor, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setLookingFor(lookingFor.filter(t => t !== tag));
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

      const { data, error } = await supabase
        .from('ideas')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          stage,
          looking_for: lookingFor.length > 0 ? lookingFor : null,
          upvotes: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Award coins for posting idea
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.id,
          amount: 10,
          reason: 'Posted new idea',
          reference_type: 'idea',
          reference_id: data.id
        });

      const { data: profile } = await supabase
        .from('profiles')
        .select('builder_coins')
        .eq('id', user.id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ builder_coins: (profile.builder_coins || 0) + 10 })
          .eq('id', user.id);
      }

      toast({
        title: 'Success! 🎉',
        description: 'Your idea has been posted. +10 Builder Coins!',
      });

      navigate(`/ideas/${data.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/ideas')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Post Your Startup Idea 💡</CardTitle>
            <CardDescription>
              Share your idea with the community and find co-founders, collaborators, or get feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Idea Title *</Label>
                <Input
                  id="title"
                  placeholder="E.g., AI-powered study assistant for college students"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/100 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your idea, the problem it solves, and your vision..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/1000 characters
                </p>
              </div>

              {/* Category & Stage */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage">Current Stage *</Label>
                  <Select value={stage} onValueChange={setStage} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Looking For */}
              <div className="space-y-2">
                <Label>Looking For (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  What kind of people or skills are you looking for?
                </p>
                
                {/* Quick Select Roles */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {suggestedRoles.map(role => (
                    <Badge
                      key={role}
                      variant={lookingFor.includes(role) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => lookingFor.includes(role) ? removeTag(role) : addTag(role)}
                    >
                      {role}
                      {lookingFor.includes(role) && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom role or skill..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(newTag);
                      }
                    }}
                    maxLength={30}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(newTag)}
                    disabled={!newTag.trim() || lookingFor.length >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Selected Tags */}
                {lookingFor.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 p-3 bg-secondary/20 rounded-lg">
                    {lookingFor.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <X
                          className="w-3 h-3 ml-1 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Posting...' : 'Post Idea (+10 Coins)'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/ideas')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateIdea;
