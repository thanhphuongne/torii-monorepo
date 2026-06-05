import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@workspace/ui/components/button';

import { useAppDispatch, useAppSelector } from '@/store';
import { updateTheme } from '@/store/slices/roomSettingsSlice';
import { DISABLE_DARK_MODE } from '@/config';

const DarkThemeSwitcher = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.roomSettings.theme);

  const disableDarkMode = DISABLE_DARK_MODE;
  if (disableDarkMode) {
    updateTheme('light');
    return null;
  }

  const toggleDarkMode = () => {
    dispatch(updateTheme(theme === 'light' ? 'dark' : 'light'));
  };

  return (
    <Button variant="ghost" onClick={toggleDarkMode} className="p-0">
      <div className="bg-muted p-0.5 3xl:p-1 rounded-[14px] overflow-hidden hidden md:flex items-center cursor-pointer transition-all duration-300">
        <div
          className={`item w-7 md:w-8 3xl:w-9 h-7 md:h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center text-primary dark:text-muted-foreground/30 ${theme === 'light' ? 'bg-background shadow-sm' : ''}`}
        >
          <Sun className="w-4 h-4 3xl:w-5 3xl:h-5" />
        </div>
        <div
          className={`item w-7 md:w-8 3xl:w-9 h-7 md:h-8 3xl:h-9 rounded-xl transition-all duration-300 flex items-center justify-center text-primary dark:text-foreground ${theme === 'dark' ? 'bg-background shadow-sm' : ''}`}
        >
          <Moon className="w-4 h-4 3xl:w-5 3xl:h-5" />
        </div>
      </div>
      <div className="mobile inline md:hidden cursor-pointer">
        {theme === 'dark' ? (
          <div className="moon w-8 h-8 rounded-full flex items-center justify-center">
            <Moon className="w-4 h-4 text-primary dark:text-white" />
          </div>
        ) : (
          <div className="sun w-8 h-8 rounded-full flex items-center justify-center">
            <Sun className="w-4 h-4 text-primary dark:text-white" />
          </div>
        )}
      </div>
    </Button>
  );
};

export default DarkThemeSwitcher;
