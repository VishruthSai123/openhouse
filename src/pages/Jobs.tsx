import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Search,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building,
  Filter,
} from 'lucide-react';

interface JobPost {
  id: string;
  title: string;
  description: string;
  post_type: 'job_posting' | 'job_request';
  job_type: string | null;
  location: string | null;
  salary_range: string | null;
  skills_required: string[] | null;
  is_remote: boolean;
  company_name: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
  };
}

const Jobs = () => {
  const [jobPostings, setJobPostings] = useState<JobPost[]>([]);
  const [jobRequests, setJobRequests] = useState<JobPost[]>([]);
  const [filteredJobPostings, setFilteredJobPostings] = useState<JobPost[]>([]);
  const [filteredJobRequests, setFilteredJobRequests] = useState<JobPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();

    // Real-time subscription
    const channel = supabase
      .channel('jobs-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas',
          filter: 'post_type=in.(job_posting,job_request)',
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterJobs();
  }, [searchQuery, jobPostings, jobRequests]);

  const loadJobs = async () => {
    try {
      setLoading(true);

      // Load job postings
      const { data: { user } } = await supabase.auth.getUser();
      const { data: postings, error: postingsError } = await supabase
        .from('ideas')
        .select(`
          *,
          profiles!ideas_user_id_fkey(full_name, avatar_url, role)
        `)
        .eq('post_type', 'job_posting')
        .or(`is_hidden.eq.false,is_hidden.is.null,user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (postingsError) throw postingsError;

      // Load job requests
      const { data: requests, error: requestsError } = await supabase
        .from('ideas')
        .select(`
          *,
          profiles!ideas_user_id_fkey(full_name, avatar_url, role)
        `)
        .eq('post_type', 'job_request')
        .or(`is_hidden.eq.false,is_hidden.is.null,user_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setJobPostings(postings as any || []);
      setJobRequests(requests as any || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterJobs = () => {
    const query = searchQuery.toLowerCase();

    if (!query) {
      setFilteredJobPostings(jobPostings);
      setFilteredJobRequests(jobRequests);
      return;
    }

    const filterList = (jobs: JobPost[]) =>
      jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query) ||
          job.company_name?.toLowerCase().includes(query) ||
          job.skills_required?.some((skill) => skill.toLowerCase().includes(query))
      );

    setFilteredJobPostings(filterList(jobPostings));
    setFilteredJobRequests(filterList(jobRequests));
  };

  const renderJobCard = (job: JobPost) => (
    <Card
      key={job.id}
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/post/${job.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 flex-shrink-0">
              {job.profiles?.avatar_url ? (
                <img src={job.profiles.avatar_url} alt={job.profiles.full_name || 'User'} className="object-cover w-full h-full" />
              ) : (
                <AvatarFallback className="text-sm">
                  {job.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{job.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {job.profiles?.full_name || 'Anonymous'}
                {job.company_name && ` • ${job.company_name}`}
              </p>
            </div>
          </div>
          {job.is_remote && (
            <Badge variant="secondary" className="flex-shrink-0">Remote</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription className="line-clamp-2">{job.description}</CardDescription>
        
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {job.job_type && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="capitalize">{job.job_type.replace('-', ' ')}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
            </div>
          )}
          {job.salary_range && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              <span>{job.salary_range}</span>
            </div>
          )}
        </div>

        {job.skills_required && job.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.skills_required.slice(0, 5).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {job.skills_required.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{job.skills_required.length - 5} more
              </Badge>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Posted {new Date(job.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 sm:h-18 items-center gap-2 sm:gap-4 px-4 sm:px-5">
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-11 sm:w-11" onClick={() => navigate('/feed')}>
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Jobs</h1>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, skills, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="find-jobs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="find-jobs">
              Find Jobs
              {filteredJobPostings.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredJobPostings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="find-workers">
              Find Workers
              {filteredJobRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {filteredJobRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Find Jobs Tab */}
          <TabsContent value="find-jobs" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading jobs...</div>
              </div>
            ) : filteredJobPostings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No jobs found matching your search' : 'No job postings yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobPostings.map(renderJobCard)}
              </div>
            )}
          </TabsContent>

          {/* Find Workers Tab */}
          <TabsContent value="find-workers" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse text-muted-foreground">Loading worker requests...</div>
              </div>
            ) : filteredJobRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No workers found matching your search' : 'No work requests yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredJobRequests.map(renderJobCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Jobs;
