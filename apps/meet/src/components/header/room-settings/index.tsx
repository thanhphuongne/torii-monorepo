import React, { useMemo } from 'react';
import sanitizeHtml from 'sanitize-html';

import { store, useAppDispatch, useAppSelector } from '@/store';
import { updateShowRoomSettingsModal } from '@/store/slices/roomSettingsSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Separator } from '@workspace/ui/components/separator';
import { cn } from '@workspace/ui/lib/utils';
import ApplicationSettings from '@/components/header/room-settings/application';
import DataSavings from '@/components/header/room-settings/data-savings';

declare const WAJLC_VERSION: string;

const RoomSettings = () => {
  const dispatch = useAppDispatch();
  const {
    serverVersion,
    currentUser,
    copyright_conf,
  } = useMemo(() => {
    const session = store.getState().session;
    return {
      serverVersion: session.serverVersion,
      currentUser: session.currentUser,
      copyright_conf: session.currentRoom.metadata?.copyrightConf,
    };
  }, []);

  const isShowRoomSettingsModal = useAppSelector(
    (state) => state.roomSettings.isShowRoomSettingsModal,
  );

  const baseCategories: Record<string, { title: string; content: React.ReactNode }> = {
    application: {
      title: 'Ứng dụng',
      content: <ApplicationSettings />,
    },
    dataSavings: {
      title: 'Tiết kiệm dữ liệu',
      content: <DataSavings />,
    },
  };
  const tabItems = Object.keys(baseCategories).map((k) => ({
    id: k,
    title: baseCategories[k].title,
    content: baseCategories[k].content,
  }));

  const closeModal = () => {
    dispatch(updateShowRoomSettingsModal(false));
  };

  if (!isShowRoomSettingsModal) {
    return null;
  }

  const renderModalFooter = () => {
    if (
      !copyright_conf ||
      !copyright_conf.display ||
      copyright_conf.text === ''
    ) {
      return null;
    }

    let text = sanitizeHtml(copyright_conf.text, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: {
        a: ['href', 'target'],
      },
    });

    // Remove branding line entirely (requested)
    text = text.replace(/Powered by\s*MiraiMagicLab/gi, '').trim();
    if (text === '') {
      return null;
    }

    return (
      <div
        className="text-center text-xs text-muted-foreground [&_a]:text-primary [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  };

  const defaultTab = tabItems[0]?.id ?? 'application';

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent
        showCloseButton
        className={cn(
          'header-room-settings flex max-h-[min(90vh,640px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl',
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b px-4 py-3 text-left">
          <DialogTitle className="text-base font-semibold">Cài đặt</DialogTitle>
        </DialogHeader>

        <div className="min-h-[316px] flex-1 overflow-y-auto px-4 py-4">
          <Tabs defaultValue={defaultTab} className="w-full gap-4">
            <TabsList className="mb-1 h-auto w-full flex-wrap justify-start gap-1">
              {tabItems.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="px-3 py-2">
                  {item.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabItems.map((item) => (
              <TabsContent
                key={item.id}
                value={item.id}
                className="mt-0 min-h-[240px] outline-none focus-visible:ring-0"
              >
                {item.content}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {renderModalFooter() && (
          <>
            <Separator />
            <div className="shrink-0 px-4 py-3">{renderModalFooter()}</div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RoomSettings;
