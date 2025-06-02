
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MobileErrorBoundaryProps {
  error: string;
  onRetry: () => void;
  isLoading?: boolean;
}

const MobileErrorBoundary: React.FC<MobileErrorBoundaryProps> = ({ 
  error, 
  onRetry, 
  isLoading = false 
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Dashboard Error</CardTitle>
          <CardDescription>
            There was a problem loading your dashboard data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p>This might be due to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Poor network connection</li>
              <li>Server timeout</li>
              <li>Authentication issues</li>
            </ul>
          </div>
          
          <Button 
            onClick={onRetry} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
          
          <p className="text-xs text-center text-gray-500 mt-4">
            If the problem persists, try refreshing the page or checking your internet connection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileErrorBoundary;
