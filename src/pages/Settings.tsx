
import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, Settings as SettingsIcon, ShoppingCart, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Debug navigation
  console.log("Rendering Settings page");

  return (
    <div className="container mx-auto py-6">
      <motion.h1 
        className="text-2xl font-bold mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Settings
      </motion.h1>
      
      <motion.div 
        className="grid gap-6 md:grid-cols-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Manage your account preferences and personal information.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button 
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/settings')}
            >
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </Button>
            <Button 
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/sales')}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Sales</span>
            </Button>
            <Button 
              variant="outline"
              className="justify-start"
              onClick={() => navigate('/receipts')}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Receipt Generator</span>
            </Button>
            <Button 
              variant="destructive"
              className="justify-start mt-2"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>
              Configure application behavior and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Appearance</h3>
                <p className="text-sm text-muted-foreground">
                  Customize how the application looks and feels.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Manage how you receive alerts and updates.
                </p>
              </div>
              
              {/* Simple example dropdown using the proper structure */}
              <div>
                <h3 className="text-sm font-medium mb-1">Theme</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Select Theme
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Light</DropdownMenuItem>
                    <DropdownMenuItem>Dark</DropdownMenuItem>
                    <DropdownMenuItem>System</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Settings;
