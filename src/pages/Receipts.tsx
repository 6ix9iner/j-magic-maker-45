
import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Receipts = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/settings")}
          className="mr-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Receipt Generator</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Receipt generation functionality will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Receipts;
