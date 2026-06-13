
import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Home, BarChart3, Package, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MobilePopover from '@/components/ui/mobile-popover';

import Logo from './Logo';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Home", path: "/scanner", icon: Home },
    { name: "Inventory", path: "/inventory", icon: Package },
    { name: "Dashboard", path: "/dashboard", icon: BarChart3 },
    { name: "Settings", path: "/settings", icon: Settings }
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Debug navigation
  console.log("Current location:", location.pathname);
  console.log("User authenticated:", !!user);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.email) return '?';
    const parts = user.email.split('@');
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar - Transparent floating branding and avatar */}
      <motion.header 
        className="w-full bg-transparent border-0 shadow-none z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="px-6 h-16 flex items-center justify-between max-w-7xl mx-auto bg-transparent">
          <motion.div 
            className="flex items-center"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link to="/" className="flex items-center">
              <Logo size={34} />
            </Link>
          </motion.div>
          
          {user && (
            <motion.div 
              className="flex items-center gap-2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* User profile action trigger */}
              <div className="flex">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full p-0.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm shrink-0"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Avatar className="h-8 w-8 ring-2 ring-indigo-500/20 shadow-sm">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
 
                <MobilePopover 
                  isOpen={isMobileMenuOpen} 
                  onClose={() => setIsMobileMenuOpen(false)} 
                  title="Account"
                >
                  <div className="py-4">
                    <div className="flex items-center gap-4 mb-6 bg-gradient-to-r from-indigo-50/50 via-white/40 to-violet-50/50 dark:from-indigo-950/20 dark:via-slate-900/20 dark:to-violet-950/20 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                      <Avatar className="h-14 w-14 ring-2 ring-indigo-500/10 shadow-sm">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-lg font-bold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-lg">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user?.email}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSignOut} 
                      className="w-full h-11 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold rounded-xl border border-red-100/80 dark:border-red-900/30 shadow-sm active:scale-[0.98] transition-all"
                    >
                      <span className="mr-2">Sign Out</span>
                    </Button>
                  </div>
                </MobilePopover>
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 bg-transparent">
          <Outlet />
        </div>
      </main>
      
      {/* Bottom Tab Navigation - Enhanced floating capsule dock */}
      {user && (
        <motion.nav 
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-100 dark:border-slate-800/80 shadow-[0_12px_40px_rgba(99,102,241,0.08)] h-16 z-40 rounded-2xl max-w-lg mx-auto"
        >
          <div className="flex justify-around items-center h-full px-2">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.div 
                  key={item.path}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * index, duration: 0.3 }}
                >
                  <Link 
                    to={item.path} 
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ease-out group",
                      isActive 
                        ? "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 scale-105" 
                        : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="relative flex flex-col items-center">
                      <Icon className={cn(
                        "h-5 w-5 mb-0.5 transition-transform duration-300 group-hover:scale-110",
                        isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                      )} />
                      <span className={cn(
                        "text-[10px] transition-all duration-200",
                        isActive ? "font-semibold" : "font-medium text-slate-400 dark:text-slate-500"
                      )}>
                        {item.name}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.nav>
      )}
    </div>
  );
};

export default Layout;
