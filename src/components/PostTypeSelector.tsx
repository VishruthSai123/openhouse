import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lightbulb, Briefcase, UserPlus, MessageSquare, X } from 'lucide-react';

interface PostTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PostTypeSelector: React.FC<PostTypeSelectorProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  const postTypes = [
    {
      type: 'idea',
      title: 'Post Your Idea',
      description: 'Share your startup idea with the community',
      icon: Lightbulb,
      color: 'from-yellow-500/20 to-yellow-600/10',
      iconColor: 'text-yellow-600',
      path: '/ideas/new?type=idea',
    },
    {
      type: 'job_posting',
      title: 'Post a Job',
      description: 'Find talented workers for your project',
      icon: Briefcase,
      color: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-600',
      path: '/ideas/new?type=job_posting',
    },
    {
      type: 'job_request',
      title: 'Request Work',
      description: 'Looking for opportunities? Post here',
      icon: UserPlus,
      color: 'from-green-500/20 to-green-600/10',
      iconColor: 'text-green-600',
      path: '/ideas/new?type=job_request',
    },
    {
      type: 'discussion',
      title: 'Start Discussion',
      description: 'Ask questions or share knowledge',
      icon: MessageSquare,
      color: 'from-purple-500/20 to-purple-600/10',
      iconColor: 'text-purple-600',
      path: '/ideas/new?type=discussion',
    },
  ];

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">What would you like to post?</DialogTitle>
          <p className="text-sm text-muted-foreground">Choose the type of content you want to share</p>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          {postTypes.map((postType) => {
            const Icon = postType.icon;
            return (
              <button
                key={postType.type}
                onClick={() => handleSelect(postType.path)}
                className="group relative overflow-hidden rounded-lg border border-border p-6 text-left transition-all hover:border-primary hover:shadow-lg"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${postType.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative space-y-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${postType.color} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${postType.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{postType.title}</h3>
                    <p className="text-sm text-muted-foreground">{postType.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostTypeSelector;
