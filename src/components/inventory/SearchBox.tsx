
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBoxProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const SearchBox = ({ searchTerm, onSearchChange }: SearchBoxProps) => {
  return (
    <Card className="mb-8">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search by name, barcode, or category..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="max-w-sm"
          />
          <Button 
            variant="outline"
            onClick={() => onSearchChange('')}
            disabled={!searchTerm}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchBox;
