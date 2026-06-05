import React from 'react';
import { createSelector } from '@reduxjs/toolkit';

import { Button } from '@workspace/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';

import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { selectChatKeys } from '@/store/slices/chat-messages-slice';
import Messages from '@/components/chat/messages';
import { participantsSelector } from '@/store/slices/participant-slice';
import {
  updateSelectedChatOption,
  updateUnreadMsgFrom,
} from '@/store/slices/roomSettingsSlice';
import { X, MessageSquareDot } from 'lucide-react';
import { setActiveSidePanel } from '@/store/slices/bottom-icons-activity-slice';

interface IChatOption {
  id: string;
  title: string;
  hasUnread: boolean;
}

const selectChatTabsData = createSelector(
  [
    selectChatKeys,
    participantsSelector.selectEntities,
    (state: RootState) => state.roomSettings.initiatePrivateChat,
    (state: RootState) => state.roomSettings.unreadMsgFrom,
    (state: RootState) => state.roomSettings.selectedChatOption,
  ],
  (
    chatKeys,
    participantEntities,
    initiatePrivateChat,
    unreadMsgFrom,
    selectedChatOption,
  ) => {
    const allKeys = [...chatKeys];
    // let's add user from initiatePrivateChat
    if (
      initiatePrivateChat.userId &&
      !allKeys.includes(initiatePrivateChat.userId)
    ) {
      allKeys.push(initiatePrivateChat.userId);
    }

    const options: IChatOption[] = [];
    allKeys.forEach((k) => {
      if (k === 'public') {
        options.push({
          id: 'public',
          title: 'Trò chuyện công khai',
          hasUnread: unreadMsgFrom.includes('public'),
        });
      } else {
        const participant = participantEntities[k];
        let title = k; // Use key as fallback
        if (participant) {
          title = participant.name;
        } else if (initiatePrivateChat.userId === k) {
          title = initiatePrivateChat.name;
        }

        options.push({
          id: k,
          title: title,
          hasUnread: unreadMsgFrom.includes(k),
        });
      }
    });

    const selected = options.find((o) => o.id === selectedChatOption);
    const selectedTitle = selected?.title ?? 'Trò chuyện công khai';

    return {
      chatOptions: options,
      selectedChatOption,
      selectedTitle,
      hasUnreadMessages: unreadMsgFrom.length > 0,
    };
  },
);

const ChatTabs = () => {
  const dispatch = useAppDispatch();

  const { chatOptions, selectedChatOption, selectedTitle, hasUnreadMessages } =
    useAppSelector(selectChatTabsData);

  const onChange = (id: string) => {
    dispatch(updateSelectedChatOption(id));
    dispatch(
      updateUnreadMsgFrom({
        task: 'DEL',
        id: id,
      }),
    );
  };

  const closePanel = () => {
    dispatch(setActiveSidePanel(null));
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="top-chat-header flex items-center gap-2 h-10 px-3 3xl:px-5 justify-between">
        <div className="left flex items-center gap-3">
          <p className="text-sm text-foreground 3xl:font-medium leading-tight">
            {selectedChatOption === 'public'
              ? 'Trò chuyện công khai'
              : 'Trò chuyện riêng tư'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground p-0"
          onClick={closePanel}
          aria-label="Đóng khung chat"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      <Select value={selectedChatOption} onValueChange={onChange}>
        <div className="relative z-10 chat-tabs">
          <SelectTrigger className="flex items-center justify-between border-y border-border h-8 3xl:h-10 w-full outline-hidden px-3 3xl:px-5 text-xs 3xl:text-sm text-muted-foreground cursor-pointer">
            <p className="block truncate min-w-0">
              To:{' '}
              <span className="font-medium text-foreground">
                {selectedTitle}
              </span>
            </p>
            {/* Keep Radix value in DOM for accessibility/state, but we render custom label above. */}
            <SelectValue className="sr-only" />
            {hasUnreadMessages && (
              <span className="pointer-events-none shake pr-1 -mb-1">
                <MessageSquareDot className="w-4 h-4 text-primary shake" />
              </span>
            )}
          </SelectTrigger>
          <SelectContent className="max-h-60 border border-border bg-popover shadow-lg rounded-xl overflow-hidden p-2">
            <div className="title h-8 w-full flex items-center text-xs leading-none text-muted-foreground px-3 uppercase">
              Chọn một cuộc trò chuyện
            </div>
            {chatOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate">{option.title}</span>
                  {option.hasUnread && (
                    <span className="shake">
                      <MessageSquareDot className="w-4 h-4 text-primary shake" />
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </div>
      </Select>
      <div className="flex-1 min-h-0 chat-messages-container">
        <Messages messageKey={selectedChatOption} />
      </div>
    </div>
  );
};

export default React.memo(ChatTabs);
