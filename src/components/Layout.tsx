import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Home, BarChart3, Package, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MobilePopover from '@/components/ui/mobile-popover';

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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.email) return '?';
    const parts = user.email.split('@');
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navigation Bar - Enhanced with premium glass effect */}
      <motion.header 
        className="glass-panel shadow-lg border-b z-10 border-white/10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="px-6 h-16 flex items-center justify-between max-w-7xl mx-auto">
          <motion.div 
            className="flex items-center"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">II</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent drop-shadow-md">
                Insight Inventory
              </h1>
            </Link>
          </motion.div>
          
          {user && (
            <motion.div 
              className="flex items-center gap-2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Desktop dropdown */}
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="rounded-full flex items-center gap-2 px-4 h-10 bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Avatar className="h-7 w-7 ring-2 ring-white/30 shadow-lg">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-xs">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {user.email ? user.email.split('@')[0] : 'User'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-64 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-white/20 shadow-xl rounded-xl"
                  >
                    <div className="flex items-center gap-3 p-2 mb-2">
                      <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold">{user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    
                    <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700/50 my-2" />
                    
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center gap-2 my-1 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => navigate('/settings')}
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="cursor-pointer flex items-center gap-2 my-1 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-500 transition-colors"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Mobile user button - Enhanced for better visibility */}
              <div className="sm:hidden">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-full px-2 bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-white/20 hover:bg-white/10 shadow-lg"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Avatar className="h-7 w-7 ring-2 ring-white/40 shadow-lg">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-xs">
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
                    <div className="flex items-center gap-4 mb-6 bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner">
                      <Avatar className="h-14 w-14 ring-2 ring-white/30 shadow-md">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-lg">{user?.email?.split('@')[0]}</p>
                        <p className="text-sm text-blue-200/70">{user?.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <Button 
                        onClick={() => {
                          navigate('/settings');
                          setIsMobileMenuOpen(false);
                        }} 
                        variant="outline" 
                        className="w-full justify-start text-left border-white/10 bg-white/5 hover:bg-white/10 rounded-xl"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Account Settings
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={handleSignOut} 
                      variant="destructive" 
                      className="w-full shadow-lg rounded-xl"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </MobilePopover>
              </div>
            </motion.div>
          )}
        </div>
      </motion.header>
      
      {/* Main Content Area - Enhanced with padding and overflow handling */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-5xl mx-auto p-4">
          <Outlet />
        </div>
      </main>
      
      {/* Bottom Tab Navigation - Enhanced for better visibility */}
      {user && (
        <motion.nav 
          className="fixed bottom-0 left-0 right-0 bg-blue-600 dark:bg-slate-800 border-t border-white/20 shadow-2xl h-16 z-40"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-around items-center h-full max-w-xl mx-auto px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 w-full rounded-xl transition-colors",
                    isActive 
                      ? "bg-white/20 text-white" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn("h-5 w-5 mb-1", isActive ? "text-white" : "text-white/70")} />
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-1 inset-x-0 mx-auto w-1 h-1 bg-white rounded-full"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isActive ? "font-medium" : "font-normal"
                  )}>{item.name}</span>
                </Link>
              );
            })}
          </div>
          {/* Safe area bottom padding for iOS devices */}
          <div className="h-safe-area-bottom bg-blue-600 dark:bg-slate-800" />
        </motion.nav>
      )}
    </div>
  );
};

export default Layout;
