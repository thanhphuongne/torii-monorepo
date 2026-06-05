import { STATIC_ASSETS_PATH, VIRTUAL_BACKGROUND_IMAGES } from '@/config';

export type BackgroundConfig = {
  type: 'none' | 'blur-sm' | 'image';
  url?: string;
};

const defaultBackgroundConfig: BackgroundConfig = {
  type: 'none',
};

const assetPath = STATIC_ASSETS_PATH;

let backgroundImageUrls = [
  'background_1',
  'background_2',
  'background_3',
  'background_4',
  'background_5',
  'background_6',
  'background_7',
  'background_8',
  'background_9',
].map((imageName) => `${assetPath}/backgrounds/${imageName}.jpg`);

const bgImgUrlsFromCnf = VIRTUAL_BACKGROUND_IMAGES;

if (
  bgImgUrlsFromCnf &&
  Array.isArray(bgImgUrlsFromCnf) &&
  bgImgUrlsFromCnf.length > 0
) {
  const imgUrls: Array<string> = [];

  (async () => {
    for (let i = 0; i < bgImgUrlsFromCnf.length; i++) {
      const url = bgImgUrlsFromCnf[i];
      try {
        const req = await fetch(url, { method: 'HEAD' });
        if (req.ok) {
          imgUrls.push(url);
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (imgUrls.length) {
      backgroundImageUrls = imgUrls;
    }
  })();
}

export { backgroundImageUrls, defaultBackgroundConfig };
