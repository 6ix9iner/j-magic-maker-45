
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader } from 'lucide-react';

type LoadingScreenProps = {
  duration?: number; // Duration in milliseconds before hiding
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({ duration = 2000 }) => {
  const [show, setShow] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration]);
  
  if (!show) return null;
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
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
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-black to-gray-800 shadow-lg flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
            <span className="text-3xl font-bold bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent">II</span>
          </div>
        </div>
        <motion.div 
          className="absolute -inset-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-black/30 animate-ping" />
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-col items-center"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Insight Inventory</h1>
        <p className="text-gray-600 text-sm mb-6">Powering smarter business decisions</p>
        
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        >
          <Loader size={36} className="text-black" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
