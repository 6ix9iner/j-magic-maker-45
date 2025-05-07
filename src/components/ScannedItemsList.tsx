
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export interface ScannedItem {
  id: string;
  code: string;
  symbology: string;
  timestamp: Date;
}

interface ScannedItemsListProps {
  items: ScannedItem[];
  onClear: () => void;
  onDelete: (id: string) => void;
}

const ScannedItemsList: React.FC<ScannedItemsListProps> = ({ 
  items, 
  onClear, 
  onDelete 
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No items scanned yet. Start scanning to see results here.
      </div>
    );
  }
  
  return (
    <div className="border rounded-md">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-lg font-medium">Scan History</h3>
        <Button variant="outline" size="sm" onClick={onClear}>Clear All</Button>
      </div>
      <Separator />
      <ScrollArea className="h-[300px]">
        <div className="p-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="font-medium break-all">{item.code}</p>
                <p className="text-sm text-muted-foreground">
                  {item.symbology} • {item.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScannedItemsList;
