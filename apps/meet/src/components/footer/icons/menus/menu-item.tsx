import React from 'react';

import { Button } from '@workspace/ui/components/button';
import { DropdownMenuItem } from '@workspace/ui/components/dropdown-menu';
import { cn } from '@workspace/ui/lib/utils';

interface IAdminMenuItemProps {
  onClick: () => void;
  icon: React.ReactNode;
  text: React.ReactNode;
  isActive?: boolean;
}

const FooterMenuItem = ({
  onClick,
  icon,
  text,
  isActive,
}: IAdminMenuItemProps) => {
  return (
    <DropdownMenuItem asChild>
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className={cn(
          'relative h-auto min-h-10 w-full justify-start gap-2 rounded-none border-0 px-3 py-2.5 text-left text-sm font-medium leading-snug shadow-none whitespace-normal hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0',
          isActive && 'pr-9',
        )}
      >
        <span className="icon flex h-auto w-5 shrink-0 justify-center text-primary">
          {icon}
        </span>
        <span className="flex-1">{text}</span>
        {isActive && (
          <span className="absolute top-1/2 right-3 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />
        )}
      </Button>
    </DropdownMenuItem>
  );
};

export default FooterMenuItem;
