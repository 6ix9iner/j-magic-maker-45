import React from "react";
import AIAccountantChat from "@/components/ai-accountant/AIAccountantChat";

const AIAccountant = () => {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden min-h-0 pt-2 pb-24 px-1 max-w-4xl mx-auto">
      <AIAccountantChat />
    </div>
  );
};

export default AIAccountant;
