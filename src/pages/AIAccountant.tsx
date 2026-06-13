import React from "react";
import AIAccountantChat from "@/components/ai-accountant/AIAccountantChat";

const AIAccountant = () => {
  return (
    <div className="w-full h-[calc(100vh-10rem)] sm:h-[calc(100vh-12rem)] flex flex-col py-2 px-1 sm:py-4 sm:px-2">
      <div className="container mx-auto max-w-4xl flex-1 flex flex-col h-full">
        <AIAccountantChat />
      </div>
    </div>
  );
};

export default AIAccountant;
