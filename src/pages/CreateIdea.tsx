import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, X, Plus } from 'lucide-react';

type PostType = 'idea' | 'job_posting' | 'job_request' | 'discussion';

const CreateIdea = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [postType, setPostType] = useState<PostType>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState('idea');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Job-specific fields
  const [jobType, setJobType] = useState('');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const type = searchParams.get('type') as PostType;
    if (type && ['idea', 'job_posting', 'job_request', 'discussion'].includes(type)) {
      setPostType(type);
    }
    
    // Check if in edit mode and load existing post
    if (id) {
      setIsEditMode(true);
      loadPostData();
    }
  }, [searchParams, id]);

  const loadPostData = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Populate form with existing data
      setPostType(data.post_type);
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category);
      
      if (data.post_type === 'idea') {
        setStage(data.stage || 'idea');
        setLookingFor(data.looking_for || []);
      }
      
      if (data.post_type === 'job_posting' || data.post_type === 'job_request') {
        setJobType(data.job_type || '');
        setLocation(data.location || '');
        setSalaryRange(data.salary_range || '');
        setIsRemote(data.is_remote || false);
        setCompanyName(data.company_name || '');
        setSkillsRequired(data.skills_required || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load post data',
        variant: 'destructive',
      });
      navigate('/ideas');
    }
  };

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

  const addSkill = () => {
    if (newSkill.trim() && !skillsRequired.includes(newSkill.trim())) {
      setSkillsRequired([...skillsRequired, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkillsRequired(skillsRequired.filter(skill => skill !== skillToRemove));
  };

  const getPostConfig = () => {
    const baseConfig = {
      job_posting: {
        title: isEditMode ? 'Edit Job Posting' : 'Post a Job',
        description: 'Share your job opening with the community',
        buttonText: isEditMode ? 'Update Job' : 'Post Job',
        coinReward: 15
      },
      job_request: {
        title: isEditMode ? 'Edit Job Request' : 'Request a Job',
        description: 'Let companies know you\'re looking for opportunities',
        buttonText: isEditMode ? 'Update Request' : 'Post Request',
        coinReward: 10
      },
      discussion: {
        title: isEditMode ? 'Edit Discussion' : 'Start a Discussion',
        description: 'Engage with the community on important topics',
        buttonText: isEditMode ? 'Update Discussion' : 'Start Discussion',
        coinReward: 5
      },
      idea: {
        title: isEditMode ? 'Edit Your Idea' : 'Share Your Idea',
        description: 'Present your innovative concept to the community',
        buttonText: isEditMode ? 'Update Idea' : 'Post Idea',
        coinReward: 20
      }
    };
    
    return baseConfig[postType] || baseConfig.idea;
  };

  const config = getPostConfig();

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

    // Job-specific validation
    if (postType === 'job_posting' || postType === 'job_request') {
      if (!jobType || !location) {
        toast({
          title: 'Missing Job Information',
          description: 'Please fill in job type and location',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Prepare the data object
      const ideaData: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        post_type: postType,
      };

      // Add idea-specific fields
      if (postType === 'idea') {
        ideaData.stage = stage;
        ideaData.looking_for = lookingFor;
      }

      // Add job-specific fields
      if (postType === 'job_posting' || postType === 'job_request') {
        ideaData.job_type = jobType;
        ideaData.location = location;
        ideaData.salary_range = salaryRange || null;
        ideaData.skills_required = skillsRequired.length > 0 ? skillsRequired : null;
        ideaData.is_remote = isRemote;
        ideaData.company_name = companyName || null;
      }

      let data;
      let error;

      if (isEditMode && id) {
        // Update existing post
        const result = await supabase
          .from('ideas')
          .update(ideaData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Create new post
        ideaData.user_id = user.id;
        
        const result = await supabase
          .from('ideas')
          .insert(ideaData)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Award coins only for new posts
      if (!isEditMode) {
        await supabase
          .from('coin_transactions')
          .insert({
            user_id: user.id,
            amount: config.coinReward,
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
            .update({ builder_coins: (profile.builder_coins || 0) + config.coinReward })
            .eq('id', user.id);
        }
      }

      toast({
        title: isEditMode ? 'Updated! ✓' : 'Success! 🎉',
        description: isEditMode 
          ? `Your ${postType.replace('_', ' ')} has been updated.`
          : `Your ${postType.replace('_', ' ')} has been posted. +${config.coinReward} Builder Coins!`,
      });

      // Navigate based on post type
      if (postType === 'job_posting' || postType === 'job_request') {
        navigate('/jobs');
      } else if (postType === 'discussion') {
        navigate(`/post/${data.id}`);
      } else {
        navigate(`/post/${data.id}`);
      }
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
            onClick={() => navigate(-1)}
            className="h-9 sm:h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="border-border">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">{config.title}</CardTitle>
            <CardDescription className="text-sm sm:text-base">{config.description}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm sm:text-base">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={postType === 'job_posting' ? "e.g., Senior Full Stack Developer" : postType === 'job_request' ? "e.g., Looking for React Developer Role" : "Give your idea a catchy title"}
                  required
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm sm:text-base">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={postType === 'discussion' ? "What would you like to discuss?" : "Describe in detail..."}
                  required
                  rows={6}
                  className="resize-none text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm sm:text-base">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category" className="h-10 sm:h-11 text-sm sm:text-base">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat.toLowerCase()} className="text-sm sm:text-base">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional rendering based on post type */}
              {postType === 'idea' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="stage" className="text-sm sm:text-base">
                      Current Stage <span className="text-destructive">*</span>
                    </Label>
                    <Select value={stage} onValueChange={setStage} required>
                      <SelectTrigger id="stage" className="h-10 sm:h-11 text-sm sm:text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(s => (
                          <SelectItem key={s.value} value={s.value} className="text-sm sm:text-base">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Looking For (Optional)</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      What kind of people or skills are you looking for?
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
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
                        className="h-9 sm:h-10 text-sm"
                      />
                      <Button type="button" onClick={() => addTag(newTag)} size="sm" className="h-9 sm:h-10">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {lookingFor.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lookingFor.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs h-7 px-3">
                            {tag}
                            <X className="w-3 h-3 ml-1.5 cursor-pointer" onClick={() => removeTag(tag)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(postType === 'job_posting' || postType === 'job_request') && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobType" className="text-sm sm:text-base">
                        Job Type <span className="text-destructive">*</span>
                      </Label>
                      <Select value={jobType} onValueChange={setJobType} required>
                        <SelectTrigger id="jobType" className="h-10 sm:h-11 text-sm sm:text-base">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-sm sm:text-base">
                        Location <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., San Francisco, CA"
                        required
                        className="h-10 sm:h-11 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm sm:text-base">
                      Company Name {postType === 'job_posting' && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Your company name"
                      required={postType === 'job_posting'}
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salaryRange" className="text-sm sm:text-base">
                      Salary Range (Optional)
                    </Label>
                    <Input
                      id="salaryRange"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      placeholder="e.g., $80k - $120k"
                      className="h-10 sm:h-11 text-sm sm:text-base"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRemote"
                      checked={isRemote}
                      onCheckedChange={setIsRemote}
                    />
                    <Label htmlFor="isRemote" className="text-sm sm:text-base cursor-pointer">
                      Remote position
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Skills Required</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        className="h-9 sm:h-10 text-sm"
                      />
                      <Button type="button" onClick={addSkill} size="sm" className="h-9 sm:h-10">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {skillsRequired.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skillsRequired.map(skill => (
                          <Badge key={skill} variant="secondary" className="text-xs h-7 px-3">
                            {skill}
                            <X className="w-3 h-3 ml-1.5 cursor-pointer" onClick={() => removeSkill(skill)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Button type="submit" disabled={loading} className="w-full h-10 sm:h-11">
                {loading ? 'Posting...' : config.buttonText}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateIdea;
