import React from 'react';
import clsx from 'clsx';

import { UserNotification } from '@/store/slices/interfaces/room-settings';
import { Bell } from 'lucide-react';

interface IGenericNotificationProps {
  notification: UserNotification;
}

const GenericNotification = ({ notification }: IGenericNotificationProps) => {
  const formatDate = (timeStamp?: number) => {
    const date = new Date(timeStamp ?? 0);
    return date.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const iconClasses = clsx(
    'icon w-9 h-9 rounded-full relative inline-flex items-center justify-center',
    {
      'bg-muted text-primary': notification.typeOption === 'info',
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': notification.typeOption === 'warning',
      'bg-destructive/10 text-destructive': notification.typeOption === 'error',
    },
  );

  return (
    <div
      className="notification notif-new-poll w-full flex gap-4 py-2 px-4 border-b border-border"
      key={notification.created}
    >
      <div className={iconClasses}>
        <Bell className="w-[15px] h-auto" />
      </div>
      <div className="text flex-1 text-foreground text-sm">
        <p>{notification.message}</p>
        <div className="bottom flex justify-between text-muted-foreground text-xs items-center pt-1">
          <span className="">{formatDate(notification.created)}</span>
        </div>
      </div>
    </div>
  );
};

export default GenericNotification;
