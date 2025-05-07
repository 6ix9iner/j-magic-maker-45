
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { Home, BarChart3, Package, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  
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

  // Close mobile menu when route changes
  useEffect(() => {
  }, [location.pathname]);

  // If user not authenticated and not at auth page, redirect to auth
  useEffect(() => {
    if (!user && !location.pathname.includes('/auth') && !location.pathname.includes('/reset-password')) {
      navigate('/auth');
    }
  }, [user, location, navigate]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.email) return '?';
    const parts = user.email.split('@');
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-blue-50/90 to-indigo-50/40 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="glassmorphism shadow-md border-b z-10">
        <div className="px-6 h-16 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Insight Inventory
            </h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-blue-100/50">
                    <Avatar className="h-9 w-9 ring-2 ring-white/70 shadow-sm">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] sm:w-[350px] glassmorphism">
                  <SheetHeader>
                    <SheetTitle className="text-xl font-medium text-slate-800">Account</SheetTitle>
                  </SheetHeader>
                  <div className="py-6">
                    <div className="flex items-center gap-4 mb-6 bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">
                      <Avatar className="h-14 w-14 ring-2 ring-white shadow-md">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-medium">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-slate-800">{user.email}</p>
                        <p className="text-sm text-slate-500">User</p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleSignOut} 
                      variant="destructive" 
                      className="w-full shadow-sm"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/90 to-indigo-50/40">
        <Outlet />
      </main>
      
      {/* Bottom Tab Navigation for Mobile */}
      {user && (
        <nav className="glassmorphism shadow-lg border-t">
          <div className="flex justify-around items-center h-16 max-w-xl mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center w-1/4 py-1",
                    isActive ? "text-blue-600" : "text-slate-500"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-500")} />
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute -bottom-2 w-full h-0.5 bg-blue-600 rounded-full"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-1",
                    isActive ? "font-medium" : "font-normal"
                  )}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
