import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

  const settingsOptions = [
    {
      title: "Sales Management",
      description: "View and manage your sales records",
      icon: ShoppingBag,
      action: () => navigate("/sales"),
    },
    {
      title: "Receipt Generator",
      description: "Generate and customize receipts",
      icon: FileText,
      action: () => navigate("/receipts"),
    },
    {
      title: "Sign Out",
      description: "Sign out of your account",
      icon: LogOut,
      action: handleSignOut,
      variant: "destructive" as const,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center sm:text-left">Settings</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsOptions.map((option) => (
          <Card key={option.title} className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <option.icon className="h-5 w-5" />
                <span>{option.title}</span>
              </CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant={option.variant || "default"}
                className="w-full" 
                onClick={option.action}
                disabled={option.title === "Sign Out" && !user}
              >
                {option.title === "Sign Out" ? "Sign Out" : "Open"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Settings;

