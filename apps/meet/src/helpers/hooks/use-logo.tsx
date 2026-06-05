import { useEffect, useState } from 'react';

import { useAppSelector } from '@/store';
import { isValidHttpUrl } from '@/helpers/utils';
import { STATIC_ASSETS_PATH, CUSTOM_LOGO } from '@/config';

interface CustomLogo {
  main_logo_light?: string;
  main_logo_dark?: string;
}

const useLogo = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);

  const assetPath = STATIC_ASSETS_PATH;

  const [logo, setLogo] = useState<string>(
    `${assetPath}/imgs/main-logo-light.png`,
  );
  const [darkLogo, setDarkLogo] = useState<string>(
    `${assetPath}/imgs/main-logo-dark.png`,
  );

  useEffect(() => {
    const customLogo: any = CUSTOM_LOGO;

    if (!customLogo) {
      return;
    }

    if (typeof customLogo === 'string' && isValidHttpUrl(customLogo)) {
      setLogo(customLogo);
      setDarkLogo(customLogo);
      return;
    }

    if (typeof customLogo !== 'object') {
      return;
    }

    const customLogoObj = customLogo as CustomLogo;

    // Set light logo
    if (
      customLogoObj.main_logo_light &&
      isValidHttpUrl(customLogoObj.main_logo_light)
    ) {
      setLogo(customLogoObj.main_logo_light);
    }

    // Set dark logo
    if (
      customLogoObj.main_logo_dark &&
      isValidHttpUrl(customLogoObj.main_logo_dark)
    ) {
      setDarkLogo(customLogoObj.main_logo_dark);
    }
  }, []);

  // Return the appropriate logo based on theme
  return theme === 'dark' ? darkLogo : logo;
};

export default useLogo;
