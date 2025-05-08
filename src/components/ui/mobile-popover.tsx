
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

interface MobilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const MobilePopover = ({ isOpen, onClose, title, children }: MobilePopoverProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-full sm:w-4/5 md:w-3/5 lg:w-2/5 bg-white dark:bg-slate-900 z-50 flex flex-col shadow-2xl border-l border-white/20"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex justify-between items-center">
              <h3 className="font-semibold text-white text-lg tracking-tight">{title}</h3>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-full text-white hover:bg-white/20 transition-colors"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-5 flex-1 bg-white dark:bg-slate-900">
              {children}
            </div>
            
            <div className="h-safe-area-bottom bg-white dark:bg-slate-900" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobilePopover;
