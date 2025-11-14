import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Coins, Lightbulb, Briefcase, Crown, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  builder_coins?: number;
  ideas_count?: number;
  projects_count?: number;
}

const Leaderboard = () => {
  const [coinsLeaders, setCoinsLeaders] = useState<LeaderboardEntry[]>([]);
  const [ideasLeaders, setIdeasLeaders] = useState<LeaderboardEntry[]>([]);
  const [projectsLeaders, setProjectsLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      setLoading(true);

      // Builder Coins Leaderboard
      const { data: coinsData } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, builder_coins')
        .order('builder_coins', { ascending: false })
        .limit(10);

      setCoinsLeaders(coinsData || []);

      // Ideas Leaderboard
      const { data: ideasData } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          avatar_url,
          ideas:ideas(count)
        `)
        .limit(100);

      const ideasWithCount = (ideasData || [])
        .map(user => ({
          ...user,
          ideas_count: user.ideas?.[0]?.count || 0,
          ideas: undefined
        }))
        .sort((a, b) => (b.ideas_count || 0) - (a.ideas_count || 0))
        .slice(0, 10);

      setIdeasLeaders(ideasWithCount);

      // Projects Leaderboard
      const { data: projectsData } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          avatar_url,
          projects:projects!creator_id(count)
        `)
        .limit(100);

      const projectsWithCount = (projectsData || [])
        .map(user => ({
          ...user,
          projects_count: user.projects?.[0]?.count || 0,
          projects: undefined
        }))
        .sort((a, b) => (b.projects_count || 0) - (a.projects_count || 0))
        .slice(0, 10);

      setProjectsLeaders(projectsWithCount);
    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 2) return <Award className="w-5 h-5 text-orange-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{rank + 1}</span>;
  };

  const renderLeaderboard = (leaders: LeaderboardEntry[], type: 'coins' | 'ideas' | 'projects') => {
    if (loading) {
      return (
        <div className="text-center py-8 sm:py-12">
          <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
        </div>
      );
    }

    if (leaders.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <p className="text-muted-foreground text-sm">No data yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 sm:space-y-3">
        {leaders.map((leader, index) => (
          <Card key={leader.id} className={index < 3 ? 'border-primary/50' : ''}>
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
              <div className="flex items-center justify-center w-8 sm:w-10 flex-shrink-0">
                {getRankIcon(index)}
              </div>
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                <AvatarFallback className="text-xs sm:text-sm">
                  {leader.full_name?.charAt(0).toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">{leader.full_name || 'Anonymous'}</p>
                {leader.role && (
                  <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">{leader.role}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {type === 'coins' && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                    <span className="font-bold text-base sm:text-lg">{leader.builder_coins || 0}</span>
                  </div>
                )}
                {type === 'ideas' && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span className="font-bold text-base sm:text-lg">{leader.ideas_count || 0}</span>
                  </div>
                )}
                {type === 'projects' && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                    <span className="font-bold text-base sm:text-lg">{leader.projects_count || 0}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h1 className="text-base sm:text-xl font-bold">Leaderboards</h1>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-8 max-w-4xl mx-auto">
        <Tabs defaultValue="coins" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="coins" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Builder Coins</span>
              <span className="sm:hidden">Coins</span>
            </TabsTrigger>
            <TabsTrigger value="ideas" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Ideas</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Projects</span>
              <span className="sm:hidden">Build</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="coins">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-base sm:text-xl">Top Builders by Coins</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Earn coins by contributing to the community
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {renderLeaderboard(coinsLeaders, 'coins')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ideas">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-base sm:text-xl">Top Idea Creators</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Most startup ideas shared
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {renderLeaderboard(ideasLeaders, 'ideas')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-base sm:text-xl">Top Project Creators</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Most projects created
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {renderLeaderboard(projectsLeaders, 'projects')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Leaderboard;
