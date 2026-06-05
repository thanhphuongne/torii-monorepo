import React from 'react';
import { MenuItem } from '@headlessui/react';
import { useAppDispatch } from '@/store';
import {
  updateInitiatePrivateChat,
  updateSelectedChatOption,
} from '@/store/slices/roomSettingsSlice';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';

interface IChatMenuItemProps {
  userId: string;
  name: string;
}
const PrivateChatMenuItem = ({ name, userId }: IChatMenuItemProps) => {
  const dispatch = useAppDispatch();

  const initiatePrivateChat = () => {
    dispatch(setActiveSidePanel('CHAT'));
    dispatch(
      updateInitiatePrivateChat({
        name,
        userId,
      }),
    );
    dispatch(updateSelectedChatOption(userId));
  };
  return (
    <div className="" role="none">
      <MenuItem>
        {() => (
          <button
            className="min-h-8 cursor-pointer py-0.5 w-full text-sm text-left leading-none font-medium text-foreground px-3 rounded-lg transition-all duration-300 hover:bg-muted"
            onClick={initiatePrivateChat}
          >
            Trò chuyện riêng
          </button>
        )}
      </MenuItem>
    </div>
  );
};

export default PrivateChatMenuItem;
