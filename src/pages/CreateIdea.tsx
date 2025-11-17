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
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="h-full max-w-3xl mx-auto px-3 sm:px-4">
        <div className="sticky top-0 z-10 bg-background pt-4 pb-3 sm:pt-8 sm:pb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/ideas')}
            className="h-9 sm:h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ideas
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-140px)] md:max-h-none pb-4">
          <Card>
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <CardTitle className="text-lg sm:text-2xl">Post Your Startup Idea 💡</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Share your idea with the community and find co-founders, collaborators, or get feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm">Idea Title *</Label>
                  <Input
                    id="title"
                    placeholder="E.g., AI-powered study assistant for college students"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    className="h-10 sm:h-10 text-sm"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {title.length}/100 characters
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your idea, the problem it solves, and your vision..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="text-sm min-h-[120px] sm:min-h-[140px] resize-none"
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/1000 characters
                  </p>
                </div>

                {/* Category & Stage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm">Category *</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger className="h-10 sm:h-10 text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-sm">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stage" className="text-sm">Current Stage *</Label>
                    <Select value={stage} onValueChange={setStage} required>
                      <SelectTrigger className="h-10 sm:h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-sm">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Looking For */}
                <div className="space-y-2">
                  <Label className="text-sm">Looking For (Optional)</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    What kind of people or skills are you looking for?
                  </p>
                  
                  {/* Quick Select Roles */}
                  <div className="flex flex-wrap gap-2 mb-3 max-h-[180px] overflow-y-auto">
                    {suggestedRoles.map(role => (
                      <Badge
                        key={role}
                        variant={lookingFor.includes(role) ? "default" : "outline"}
                        className="cursor-pointer text-xs h-7 px-3"
                        onClick={() => lookingFor.includes(role) ? removeTag(role) : addTag(role)}
                      >
                        {role}
                        {lookingFor.includes(role) && <X className="w-3 h-3 ml-1.5" />}
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
                      className="h-10 text-sm"
                      maxLength={30}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addTag(newTag)}
                      disabled={!newTag.trim() || lookingFor.length >= 10}
                      className="h-10 w-10 p-0 flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Selected Tags */}
                  {lookingFor.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-3 bg-secondary/20 rounded-lg max-h-[120px] overflow-y-auto">
                      {lookingFor.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs h-7 px-3">
                          {tag}
                          <X
                            className="w-3 h-3 ml-1.5 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 sm:h-11 text-sm sm:text-base font-medium"
                    disabled={loading}
                  >
                    {loading ? 'Posting...' : 'Post Idea (+10 Coins)'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 sm:h-11 text-sm sm:text-base"
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
    </div>
  );
};

export default CreateIdea;
