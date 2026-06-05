/**
 * Application Configuration
 * All values are read from environment variables (VITE_*)
 * with fallback to default values.
 */

const getEnv = (key: string, defaultValue: string): string => {
    return import.meta.env[key] || defaultValue;
};

const getBoolEnv = (key: string, defaultValue: boolean): boolean => {
    const val = import.meta.env[key];
    if (val === 'true') return true;
    if (val === 'false') return false;
    return defaultValue;
};

const getJsonEnv = <T>(key: string, defaultValue: T): T => {
    const val = import.meta.env[key];
    if (!val) return defaultValue;
    if (
        (val.startsWith('{') && val.endsWith('}')) ||
        (val.startsWith('[') && val.endsWith(']'))
    ) {
        try {
            return JSON.parse(val) as T;
        } catch (e) {
            console.error(`Failed to parse env variable ${key}:`, e);
        }
    }
    return defaultValue;
};

export const SERVER_URL: string = getEnv('VITE_API_URL', 'http://localhost:8080');
export const STATIC_ASSETS_PATH: string = getEnv('VITE_STATIC_ASSETS_PATH', './assets');

/** Dùng cho màn login dev: khớp với `security.wajlc` trên gateway meet (không hardcode secret trong repo). */
export const MEET_LOGIN_API_KEY: string = getEnv('VITE_MEET_LOGIN_API_KEY', '');
export const MEET_LOGIN_API_SECRET: string = getEnv('VITE_MEET_LOGIN_API_SECRET', '');

export const ENABLE_DYNACAST: boolean = getBoolEnv('VITE_ENABLE_DYNACAST', true);
export const ENABLE_SIMULCAST: boolean = getBoolEnv('VITE_ENABLE_SIMULCAST', true);
export const VIDEO_CODEC: any = getEnv('VITE_VIDEO_CODEC', 'vp8');

export const DEFAULT_WEBCAM_RESOLUTION: string = getEnv('VITE_DEFAULT_WEBCAM_RESOLUTION', 'h720');
export const DEFAULT_SCREEN_SHARE_RESOLUTION: string = getEnv('VITE_DEFAULT_SCREEN_SHARE_RESOLUTION', 'h1080fps15');
export const DEFAULT_AUDIO_PRESET: string = getEnv('VITE_DEFAULT_AUDIO_PRESET', 'music');

export const STOP_MIC_TRACK_ON_MUTE: boolean = getBoolEnv('VITE_STOP_MIC_TRACK_ON_MUTE', true);
export const FOCUS_ACTIVE_SPEAKER_WEBCAM: boolean = getBoolEnv('VITE_FOCUS_ACTIVE_SPEAKER_WEBCAM', true);
export const DISABLE_DARK_MODE: boolean = getBoolEnv('VITE_DISABLE_DARK_MODE', false);

export const CUSTOM_LOGO: any = getJsonEnv('VITE_CUSTOM_LOGO', undefined);
export const DESIGN_CUSTOMIZATION: any = getJsonEnv('VITE_DESIGN_CUSTOMIZATION', undefined);
export const WHITEBOARD_PRELOADED_LIBRARY_ITEMS: string[] = getJsonEnv('VITE_WHITEBOARD_PRELOADED_LIBRARY_ITEMS', []);
export const VIRTUAL_BACKGROUND_IMAGES: string[] = getJsonEnv('VITE_VIRTUAL_BACKGROUND_IMAGES', []);

export const DB_MAX_AGE_MS: number = Number(import.meta.env.VITE_DB_MAX_AGE_MS) || 6 * 60 * 60 * 1000;
