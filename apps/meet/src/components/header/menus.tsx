import React from 'react';
import { MenuItem, MenuItems } from '@headlessui/react';
import { Button } from '@workspace/ui/components/button';

import { useAppDispatch } from '@/store';
import { updateShowRoomSettingsModal } from '@/store/slices/roomSettingsSlice';
// import DarkThemeSwitcher from '@/components/header/darkThemeSwitcher';

import { Settings, LogOut } from 'lucide-react';

interface IHeaderMenusProps {
  onOpenAlert(task: string): void;
}

const HeaderMenus = ({ onOpenAlert }: IHeaderMenusProps) => {
  const dispatch = useAppDispatch();

  return (
    <MenuItems
      unmount={false}
      className="HeaderSettingMenu origin-top-right z-50 bg-popover absolute ltr:right-0 rtl:-left-4 mt-2 w-[244px] shadow-md rounded-2xl overflow-hidden border border-border p-2 ring-0 focus:outline-hidden"
    >
      {/* <div className="dark-mode block md:hidden pt-1 pb-2">
        <DarkThemeSwitcher />
      </div>
      <div className="divider block md:hidden h-1 w-[110%] bg-muted -ml-3 my-0.5"></div> */}
      <MenuItem>
        <Button
          variant="ghost"
          className="h-9 md:h-10 w-full justify-start gap-2 text-sm leading-none font-medium px-2 md:px-3"
          onClick={() => dispatch(updateShowRoomSettingsModal(true))}
        >
          <Settings className="text-primary w-4 h-4 transition ease-in" />
          Cài đặt
        </Button>
      </MenuItem>

      <MenuItem>
        <Button
          variant="ghost"
          className="h-9 md:h-10 w-full justify-start gap-2 text-sm leading-none font-medium px-2 md:px-3"
          onClick={() => onOpenAlert('logout')}
        >
          <LogOut className="text-primary w-4 h-4 transition ease-in" />
          Rời khỏi họp
        </Button>
      </MenuItem>
    </MenuItems>
  );
};

export default React.memo(HeaderMenus);
