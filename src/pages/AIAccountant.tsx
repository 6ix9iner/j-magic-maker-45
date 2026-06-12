
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import AIAccountantChat from "@/components/ai-accountant/AIAccountantChat";

const AIAccountant = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Business Accountant</h1>
              <p className="text-gray-600">Get professional financial insights and business growth advice</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Features Cards */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Profit Analysis
                </CardTitle>
                <CardDescription>
                  Get detailed breakdowns of your profits, costs, and margins
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Growth Strategies
                </CardTitle>
                <CardDescription>
                  Receive personalized advice on how to grow your business
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Performance Insights
                </CardTitle>
                <CardDescription>
                  Understand your sales trends and product performance
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">Sample Questions</CardTitle>
                <CardContent className="p-0">
                  <ul className="space-y-2 text-sm text-blue-800">
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
            <Card>
              <CardContent className="p-0">
                <AIAccountantChat />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAccountant;
