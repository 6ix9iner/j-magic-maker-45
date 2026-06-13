import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Logo from './Logo';

type LoadingScreenProps = {
  duration?: number; // Duration in milliseconds before hiding
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({ duration = 2000 }) => {
  const [show, setShow] = useState(true);
  
  useEffect(() => {
    // Use the provided duration directly (no cap)
    const timer = setTimeout(() => {
      setShow(false);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);
  
  if (!show) return null;
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mb-8"
      >
        <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/5 flex items-center justify-center border border-slate-100/80 dark:border-slate-800/80">
          <Logo size={52} />
        </div>
        <motion.div 
          className="absolute -inset-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 animate-ping" />
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-col items-center"
      >
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-850 dark:text-slate-100 tracking-tight mb-2">
          Insight Inventory
        </h1>
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-8">
          Powering smarter business decisions
        </p>
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        >
          <Loader2 size={32} className="text-indigo-600 dark:text-indigo-400" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
