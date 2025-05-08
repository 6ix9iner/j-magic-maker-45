
import React from 'react';
import { motion } from 'framer-motion';

const Settings = () => {
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
        <div className="premium-card p-6">
          <h2 className="text-lg font-medium mb-4">Account Settings</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your account preferences and personal information.
          </p>
        </div>
        
        <div className="premium-card p-6">
          <h2 className="text-lg font-medium mb-4">Application Settings</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Configure application behavior and preferences.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
