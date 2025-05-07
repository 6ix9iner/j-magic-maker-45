
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl z-50 max-h-[90vh] overflow-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 flex justify-between items-center">
              <h3 className="font-semibold text-white text-lg">{title}</h3>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
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
