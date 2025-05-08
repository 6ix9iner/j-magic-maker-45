
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Settings as SettingsIcon, ShoppingCart, FileText, Moon, Sun, Laptop } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState('light'); // Default theme

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleThemeChange = (selectedTheme: string) => {
    setTheme(selectedTheme);
    toast({
      title: "Theme Changed",
      description: `Theme set to ${selectedTheme}`,
    });
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
              
              {/* Theme dropdown - Fixed structure */}
              <div>
                <h3 className="text-sm font-medium mb-1">Theme</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Select Theme
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700">
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer" 
                      onClick={() => handleThemeChange('light')}
                    >
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer" 
                      onClick={() => handleThemeChange('dark')}
                    >
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer" 
                      onClick={() => handleThemeChange('system')}
                    >
                      <Laptop className="h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
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
