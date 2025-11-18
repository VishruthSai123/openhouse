import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, MapPin, DollarSign, Briefcase, Building2, Wifi, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PostMenu from '@/components/PostMenu';

interface JobDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  post_type: string;
  job_type: string;
  location: string;
  salary_range: string | null;
  skills_required: string[] | null;
  is_remote: boolean;
  company_name: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
    email: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    role: string | null;
  };
}

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const jobTypeLabels: { [key: string]: string } = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    'contract': 'Contract',
    'internship': 'Internship',
    'freelance': 'Freelance',
  };

  useEffect(() => {
    checkAuth();
    loadJob();
    loadComments();
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    setCurrentUser(user);
  };

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            email
          )
        `)
        .eq('id', id)
        .in('post_type', ['job_posting', 'job_request'])
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('idea_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('idea_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error loading comments:', error);
    }
  };

  const handleEdit = () => {
    navigate(`/post/${id}/edit`);
  };

  const handleHide = async () => {
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ is_hidden: true })
        .eq('id', id)
        .eq('user_id', currentUser?.id);

      if (error) throw error;

      toast({
        title: 'Post hidden',
        description: 'Your post has been hidden successfully.',
      });

      navigate('/jobs');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser?.id);

      if (error) throw error;

      toast({
        title: 'Post deleted',
        description: 'Your post has been permanently deleted.',
      });

      navigate('/jobs');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('idea_comments')
        .insert({
          idea_id: id,
          user_id: currentUser.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      loadComments();

      toast({
        title: 'Comment posted!',
        description: 'Your comment has been added successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate('/jobs')} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate('/jobs')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        {/* Main Job Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12 sm:w-14 sm:h-14 cursor-pointer" onClick={() => navigate(`/profile/${job.user_id}`)}>
                <AvatarFallback className={`text-lg ${job.post_type === 'job_request' ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                  {job.profiles?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Badge variant={job.post_type === 'job_request' ? 'default' : 'secondary'} className={`text-xs ${job.post_type === 'job_request' ? 'bg-green-500' : ''}`}>
                      {job.post_type === 'job_request' ? 'Looking for Work' : jobTypeLabels[job.job_type] || job.job_type}
                    </Badge>
                    {job.is_remote && (
                      <Badge variant="outline" className="text-xs">
                        <Wifi className="w-3 h-3 mr-1" />
                        Remote
                      </Badge>
                    )}
                  </div>
                  {currentUser && job.user_id === currentUser.id && (
                    <PostMenu
                      postId={job.id}
                      onEdit={handleEdit}
                      onHide={handleHide}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
                <CardTitle className="text-xl sm:text-2xl mb-2">{job.title}</CardTitle>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {job.post_type === 'job_request' ? (
                    <div className="flex items-center gap-1">
                      <span className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${job.user_id}`)}>{job.profiles?.full_name}</span>
                      {job.profiles?.role && <span>• {job.profiles.role}</span>}
                    </div>
                  ) : (
                    job.company_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        <span>{job.company_name}</span>
                      </div>
                    )
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                  {job.salary_range && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{job.salary_range}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category */}
            <div>
              <Badge variant="outline">{job.category}</Badge>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">
                {job.post_type === 'job_request' ? 'About Me' : 'Job Description'}
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Skills Required */}
            {job.skills_required && job.skills_required.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">
                  {job.post_type === 'job_request' ? 'My Skills' : 'Skills Required'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.skills_required.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Posted By */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
              <Calendar className="w-4 h-4" />
              <span>Posted by <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${job.user_id}`)}>{job.profiles?.full_name}</span></span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
            </div>

            {/* Contact Button */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => {
                const subject = encodeURIComponent(`Application for ${job.title}`);
                const body = encodeURIComponent(`Hi ${job.profiles?.full_name},\n\nI'm interested in the ${job.post_type === 'job_request' ? 'opportunity to work with you' : job.title + ' position'}.\n\n`);
                window.location.href = `mailto:${job.profiles?.email}?subject=${subject}&body=${body}`;
              }}
            >
              {job.post_type === 'job_request' ? 'Contact Candidate' : 'Apply for this Job'}
            </Button>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Questions & Answers ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                placeholder="Ask a question about this job..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button type="submit" disabled={submitting || !newComment.trim()}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Posting...' : 'Post Question'}
              </Button>
            </form>

            <Separator />

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No questions yet. Be the first to ask!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8 cursor-pointer" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                      <AvatarFallback className="text-xs">
                        {comment.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                          {comment.profiles?.full_name || 'Unknown User'}
                        </span>
                        {comment.profiles?.role && (
                          <Badge variant="outline" className="text-xs">
                            {comment.profiles.role}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetail;
