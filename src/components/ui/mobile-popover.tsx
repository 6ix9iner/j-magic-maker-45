
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
            className="fixed top-0 right-0 bottom-0 w-full sm:w-4/5 md:w-3/5 lg:w-2/5 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl z-50 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.15)] border-l border-slate-200/50 dark:border-slate-800/50"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="sticky top-0 bg-transparent px-5 py-4 flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base tracking-tight">{title}</h3>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-100 dark:hover:bg-slate-850 transition-colors"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-5 flex-1 bg-transparent overflow-hidden flex flex-col min-h-0">
              {children}
            </div>
            
            <div className="h-safe-area-bottom bg-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobilePopover;
