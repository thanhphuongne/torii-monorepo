import React from 'react';
import { MenuItem } from '@headlessui/react';
interface IRemoveUserMenuItemProps {
  userId: string;
  onOpenAlert(userId: string, type: string): void;
}

const RemoveUserMenuItem = ({
  userId,
  onOpenAlert,
}: IRemoveUserMenuItemProps) => {
  return (
    <MenuItem>
      {() => (
        <button
          className="min-h-8 w-full text-sm text-left font-medium text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive hover:text-destructive-foreground transition-colors"
          onClick={() => onOpenAlert(userId, 'remove')}
        >
          Xóa thành viên
        </button>
      )}
    </MenuItem>
  );
};

export default RemoveUserMenuItem;
