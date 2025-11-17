import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Lightbulb, Plus, Briefcase, Users } from 'lucide-react';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Only show bottom nav on Feed and Dashboard pages
  const allowedPaths = ['/feed', '/dashboard', '/', '/home'];
  const shouldShowNav = allowedPaths.some(path => 
    location.pathname === path || 
    (path === '/feed' && location.pathname === '/')
  );

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Don't render if not on allowed pages
  if (!shouldShowNav) {
    return null;
  }

  const navItems = [
    {
      path: '/feed',
      icon: Home,
      label: 'Home',
    },
    {
      path: '/ideas',
      icon: Lightbulb,
      label: 'Ideas',
    },
    {
      path: '/ideas/new',
      icon: Plus,
      label: 'Post',
      isAction: true,
    },
    {
      path: '/projects',
      icon: Briefcase,
      label: 'Projects',
    },
    {
      path: '/connections',
      icon: Users,
      label: 'Connections',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/feed') {
      return location.pathname === '/' || location.pathname === '/feed';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                item.isAction
                  ? 'scale-110'
                  : active
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {item.isAction ? (
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6" />
                </div>
              ) : (
                <>
                  <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
                  <span className={`text-xs mt-1 ${active ? 'font-semibold' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
