
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, FileText, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>

        {/* Management Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Management</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {managementOptions.map((option) => (
              <Card key={option.title} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={option.action}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${option.bgColor}`}>
                      <option.icon className={`h-5 w-5 ${option.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">{option.title}</CardTitle>
                      <CardDescription className="text-sm">{option.description}</CardDescription>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {accountOptions.map((option) => (
              <Card key={option.title} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={option.action}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${option.bgColor}`}>
                      <option.icon className={`h-5 w-5 ${option.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">{option.title}</CardTitle>
                      <CardDescription className="text-sm">{option.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
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
