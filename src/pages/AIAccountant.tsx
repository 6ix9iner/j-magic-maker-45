
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import AIAccountantChat from "@/components/ai-accountant/AIAccountantChat";

const AIAccountant = () => {
  return (
    <div className="py-2 px-1 sm:py-4 sm:px-2">
      <div className="container mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-100 shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">AI Business Accountant</h1>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">Get professional financial insights and business growth advice</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Features Cards */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 p-5">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-4.5 h-4.5 text-emerald-500" />
                  Profit Analysis
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Get detailed breakdowns of your profits, costs, and margins
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 p-5">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
                  Growth Strategies
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Receive personalized advice on how to grow your business
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 p-5">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-violet-500" />
                  Performance Insights
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Understand your sales trends and product performance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-sm rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200">
              <CardHeader className="p-5">
                <CardTitle className="text-sm font-bold text-indigo-900 dark:text-indigo-300">Sample Questions</CardTitle>
                <CardContent className="p-0 mt-3">
                  <ul className="space-y-2 text-xs text-indigo-800/80 dark:text-indigo-200/80 font-medium">
                    <li>• "How much profit did I make last month?"</li>
                    <li>• "What are my best-selling products?"</li>
                    <li>• "How can I improve my profit margins?"</li>
                    <li>• "Which products should I focus on?"</li>
                    <li>• "What's my monthly sales trend?"</li>
                  </ul>
                </CardContent>
              </CardHeader>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <AIAccountantChat />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAccountant;
