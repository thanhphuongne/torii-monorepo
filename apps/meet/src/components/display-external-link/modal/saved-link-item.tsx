import React from 'react';
import { File, Trash2 } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

interface ISavedLinkItemProps {
  url: string;
  selectedUrl: string;
  onSelect: (url: string) => void;
  onDelete: (url: string) => void;
}

const SavedLinkItem = ({
  url,
  selectedUrl,
  onSelect,
  onDelete,
}: ISavedLinkItemProps) => {
  let classNames =
    'flex items-center gap-4 py-2 px-3 w-full rounded-xl cursor-pointer transition-all duration-200 border-2';
  if (selectedUrl === url) {
    classNames +=
      ' border-primary bg-secondary/50';
  } else {
    classNames +=
      ' border-border bg-card hover:bg-muted';
  }

  return (
    <div className={classNames}>
      <div
        className="flex flex-1 items-center gap-4 overflow-hidden"
        onClick={() => onSelect(url)}
      >
        <div className="icon w-9 h-9 rounded-full bg-muted text-primary relative inline-flex items-center justify-center shrink-0">
          <File className="w-4 h-4" />
        </div>
        <div className="text flex-1 text-foreground text-sm overflow-hidden">
          <p className="break-all truncate">{url}</p>
        </div>
      </div>
      <Button
        className="delete-btn shrink-0 h-9 w-9 rounded-full hover:bg-destructive/10 text-destructive flex items-center justify-center transition-all duration-200 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(url);
        }}
        variant="ghost"
        size="icon"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default SavedLinkItem;
