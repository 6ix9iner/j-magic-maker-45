
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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your account and application preferences</p>
        </div>

        {/* Management Section */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Management</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managementOptions.map((option) => (
              <Card key={option.title} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={option.action}>
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${option.bgColor} shrink-0`}>
                      <option.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${option.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 transition-colors truncate">{option.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{option.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Account Section */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {accountOptions.map((option) => (
              <Card key={option.title} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={option.action}>
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${option.bgColor} shrink-0`}>
                      <option.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${option.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 transition-colors truncate">{option.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">{option.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="my-8" />

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
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Sign Out</h3>
              <p className="text-sm text-gray-600">Sign out of your account securely</p>
            </div>
            <Button 
              variant="destructive"
              onClick={handleSignOut}
              disabled={!user}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
