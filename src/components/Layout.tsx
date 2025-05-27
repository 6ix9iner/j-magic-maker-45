
import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Home, BarChart3, Package, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      {/* Top Navigation Bar - Enhanced with premium glass effect */}
      <motion.header 
        className="glass-panel shadow-lg border-b z-10 border-white/10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="px-6 h-16 flex items-center justify-between max-w-7xl mx-auto bg-gray-50">
          <motion.div 
            className="flex items-center"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link to="/" className="flex items-center space-x-2">
              <motion.div 
                className="w-8 h-8 rounded-full bg-gradient-to-r from-black to-gray-800 flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-white font-bold text-sm">II</span>
              </motion.div>
              <motion.h1 
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
                className="text-xl font-bold bg-gradient-to-r from-gray-600 to-black bg-clip-text drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] text-black"
              ></motion.h1>
            </Link>
          </motion.div>
          
          {user && (
            <motion.div 
              className="flex items-center gap-2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Mobile user button - Enhanced for better visibility */}
              <div className="sm:hidden">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full px-2 bg-gradient-to-r from-black/30 to-gray-900/30 backdrop-blur-sm border border-white/20 hover:bg-white/10 shadow-lg"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Avatar className="h-7 w-7 ring-2 ring-white/40 shadow-lg">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-r from-black to-gray-800 text-white font-medium text-xs">
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
                        <AvatarFallback className="bg-gradient-to-r from-black to-gray-800 text-white text-lg font-medium">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white text-lg">{user?.email?.split('@')[0]}</p>
                        <p className="text-sm text-gray-200/70">{user?.email}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleSignOut} 
                      variant="destructive" 
                      className="w-full shadow-lg rounded-xl"
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
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-5xl mx-auto p-4 bg-gray-50">
          <Outlet />
        </div>
      </main>
      
      {/* Bottom Tab Navigation - Enhanced for better visibility */}
      {user && (
        <motion.nav 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-black to-gray-900 border-t border-white/20 shadow-2xl h-16 z-40 bg-[#070807]/0"
        >
          <div className="flex justify-around items-center h-full max-w-xl mx-auto px-2">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              // For regular tabs
              return (
                <motion.div 
                  key={item.path}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                >
                  <Link 
                    to={item.path} 
                    className={cn(
                      "flex flex-col items-center justify-center py-2 w-full rounded-xl transition-all duration-300 ease-in-out",
                      isActive 
                        ? "bg-white/20 text-white scale-105 shadow-lg" 
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                    style={{ minWidth: "70px", padding: "0.5rem" }}
                  >
                    <div className="relative">
                      <Icon className={cn(
                        "h-5 w-5 mb-1 transition-all duration-300",
                        isActive ? "text-white scale-110" : "text-white/70"
                      )} />
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
                      "text-xs transition-all duration-300",
                      isActive ? "font-medium" : "font-normal"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          {/* Safe area bottom padding for iOS devices */}
          <div className="h-safe-area-bottom bg-gradient-to-r from-black to-gray-900" />
        </motion.nav>
      )}
    </div>
  );
};

export default Layout;
