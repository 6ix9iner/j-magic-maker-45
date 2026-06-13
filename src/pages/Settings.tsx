
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, FileText, LogOut, User, Settings as SettingsIcon, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import InventoryPasswordSettings from "@/components/settings/InventoryPasswordSettings";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [hasInventoryPassword, setHasInventoryPassword] = useState<boolean>(false);
  const [isLoadingPasswordStatus, setIsLoadingPasswordStatus] = useState<boolean>(true);

  useEffect(() => {
    checkInventoryPasswordStatus();
  }, [user]);

  const checkInventoryPasswordStatus = async () => {
    if (!user) {
      setIsLoadingPasswordStatus(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('business_info')
        .select('inventory_password_hash')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      setHasInventoryPassword(!!data?.inventory_password_hash);
    } catch (error) {
      console.error('Error checking inventory password status:', error);
    } finally {
      setIsLoadingPasswordStatus(false);
    }
  };

  const handlePasswordChange = () => {
    checkInventoryPasswordStatus();
  };

  const handleSignOut = async () => {
    try {
      console.log('Sign out button pressed - user:', user?.id);
      
      // Show loading toast
      toast.loading("Signing out...");
      
      await signOut();
      
      // Force navigation after sign out
      setTimeout(() => {
        navigate("/auth", { replace: true });
        window.location.reload(); // Force reload for Android
      }, 500);
      
      console.log('Sign out completed successfully');
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const managementOptions = [
    {
      title: "Sales Management",
      description: "View and manage your sales records and transactions",
      icon: ShoppingBag,
      action: () => navigate("/sales"),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Receipt Generator",
      description: "Generate and customize receipts for your customers",
      icon: FileText,
      action: () => navigate("/receipts"),
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "AI Business Accountant",
      description: "Chat with AI about your business performance and get growth advice",
      icon: Bot,
      action: () => navigate("/ai-accountant"),
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const accountOptions = [
    {
      title: "Account Settings",
      description: "Manage your profile and account preferences",
      icon: User,
      action: () => {
        toast.info("Account settings coming soon!");
      },
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "App Settings",
      description: "Configure app preferences and notifications",
      icon: SettingsIcon,
      action: () => {
        toast.info("App settings coming soon!");
      },
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ];

  return (
    <div className="py-2 px-1 sm:py-4 sm:px-2">
      <div className="container mx-auto max-w-4xl">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">Manage your account and application preferences</p>
        </div>

        {/* Management Section */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">Management</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managementOptions.map((option) => (
              <Card key={option.title} className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 hover:shadow hover:border-slate-200 transition-all duration-300 cursor-pointer group" onClick={option.action}>
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${option.bgColor}`}>
                      <option.icon className={`h-5 w-5 ${option.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">{option.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{option.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="my-6 border-slate-100 dark:border-slate-800" />

        {/* Account Section */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">Account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {accountOptions.map((option) => (
              <Card key={option.title} className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 hover:shadow hover:border-slate-200 transition-all duration-300 cursor-pointer group" onClick={option.action}>
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${option.bgColor}`}>
                      <option.icon className={`h-5 w-5 ${option.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">{option.title}</CardTitle>
                      <CardDescription className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{option.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="my-6 border-slate-100 dark:border-slate-800" />

        {/* Inventory Security Section */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Security</h2>
          {isLoadingPasswordStatus ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-gray-600">Loading security settings...</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <InventoryPasswordSettings
              hasPassword={hasInventoryPassword}
              onPasswordChange={handlePasswordChange}
            />
          )}
        </div>

        <Separator className="my-8" />

        {/* Sign Out Section */}
        <div className="bg-red-50/20 dark:bg-red-950/10 rounded-3xl border border-red-100/50 dark:border-red-900/20 p-5 sm:p-6 flex flex-row items-center justify-between mt-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-red-900 dark:text-red-400">Sign Out</h3>
            <p className="text-xs text-red-700/80 dark:text-red-500/80 mt-0.5 font-medium">Sign out of your account securely</p>
          </div>
          <Button 
            variant="destructive"
            onClick={handleSignOut}
            disabled={!user}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm active:scale-95 transition-all text-xs"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
