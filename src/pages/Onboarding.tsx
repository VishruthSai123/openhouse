import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Code, 
  Palette, 
  Video, 
  TrendingUp, 
  Lightbulb, 
  GraduationCap,
  CheckCircle2,
  X
} from "lucide-react";

const ROLES = [
  { id: 'founder', label: 'Idea Creator / Founder', icon: Lightbulb, desc: 'Lead with vision' },
  { id: 'developer', label: 'Developer', icon: Code, desc: 'Build products' },
  { id: 'designer', label: 'Designer', icon: Palette, desc: 'Craft experiences' },
  { id: 'editor', label: 'Editor / Content Creator', icon: Video, desc: 'Tell stories' },
  { id: 'marketer', label: 'Growth & Marketing', icon: TrendingUp, desc: 'Scale impact' },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap, desc: 'Guide builders' },
];

const SKILL_SUGGESTIONS = {
  founder: ['Product Management', 'Strategy', 'Fundraising', 'Business Development'],
  developer: ['React', 'Node.js', 'Python', 'Mobile Dev', 'AI/ML', 'Backend'],
  designer: ['UI/UX', 'Figma', 'Branding', 'Illustration', 'Motion Design'],
  editor: ['Video Editing', 'Content Writing', 'Social Media', 'Copywriting'],
  marketer: ['SEO', 'Growth Hacking', 'Analytics', 'Performance Marketing'],
  mentor: ['Startup Advice', 'Technical Guidance', 'Career Coaching'],
};

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profile?.onboarding_completed) {
      navigate('/home');
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setCustomSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const addInterest = (interest: string) => {
    if (interest && !interests.includes(interest)) {
      setInterests([...interests, interest]);
      setCustomInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleComplete = async () => {
    if (!selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select your role to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          bio: bio || null,
          skills: skills.length > 0 ? skills : null,
          interests: interests.length > 0 ? interests : null,
          linkedin_url: linkedinUrl || null,
          github_url: githubUrl || null,
          portfolio_url: portfolioUrl || null,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Welcome to Open House! 🎉",
        description: "Your profile is ready. Let's build something amazing!",
      });

      // Check if payment is completed
      const { data: profileData } = await supabase
        .from('profiles')
        .select('has_paid')
        .eq('id', user.id)
        .single();

      if (profileData?.has_paid) {
        navigate('/home');
      } else {
        navigate('/payment');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome to Open House! 👋</h1>
              <p className="text-muted-foreground text-lg">Let's set up your profile. First, what's your role?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ROLES.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`relative p-6 rounded-lg border-2 text-left transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-primary" />
                    )}
                    <Icon className={`w-8 h-8 mb-3 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold mb-1">{role.label}</h3>
                    <p className="text-sm text-muted-foreground">{role.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button 
                size="lg" 
                onClick={() => setStep(2)} 
                disabled={!selectedRole}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Skills & Interests */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Tell us about yourself</h1>
              <p className="text-muted-foreground text-lg">Add your skills and interests to help find the right matches</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your experience, and what you want to build..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{bio.length}/500 characters</p>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <Label>Skills</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedRole && SKILL_SUGGESTIONS[selectedRole as keyof typeof SKILL_SUGGESTIONS]?.map((skill) => (
                    <Badge
                      key={skill}
                      variant={skills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => skills.includes(skill) ? removeSkill(skill) : addSkill(skill)}
                    >
                      {skill}
                      {skills.includes(skill) && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom skill..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill(customSkill))}
                  />
                  <Button variant="outline" onClick={() => addSkill(customSkill)}>Add</Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-lg">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeSkill(skill)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Interests */}
              <div className="space-y-3">
                <Label>Interests (Topics you want to work on)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., AI, HealthTech, EdTech, FinTech..."
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest(customInterest))}
                  />
                  <Button variant="outline" onClick={() => addInterest(customInterest)}>Add</Button>
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-lg">
                    {interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeInterest(interest)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3: Social Links */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Connect your profiles</h1>
              <p className="text-muted-foreground text-lg">Add links to help others know you better (Optional)</p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github">GitHub URL</Label>
                <Input
                  id="github"
                  type="url"
                  placeholder="https://github.com/yourusername"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio / Website</Label>
                <Input
                  id="portfolio"
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button size="lg" onClick={handleComplete} disabled={loading}>
                {loading ? 'Completing...' : 'Complete Setup 🚀'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
