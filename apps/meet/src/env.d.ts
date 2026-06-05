/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_MEET_LOGIN_API_KEY: string;
    readonly VITE_MEET_LOGIN_API_SECRET: string;
    readonly VITE_ENABLE_DYNACAST: string;
    readonly VITE_ENABLE_SIMULCAST: string;
    readonly VITE_VIDEO_CODEC: string;
    readonly VITE_STOP_MIC_TRACK_ON_MUTE: string;
    readonly VITE_FOCUS_ACTIVE_SPEAKER_WEBCAM: string;
    readonly VITE_DISABLE_DARK_MODE: string;
    readonly VITE_DEFAULT_WEBCAM_RESOLUTION: string;
    readonly VITE_DEFAULT_SCREEN_SHARE_RESOLUTION: string;
    readonly VITE_DEFAULT_AUDIO_PRESET: string;
    readonly VITE_STATIC_ASSETS_PATH: string;
    readonly VITE_CUSTOM_LOGO: string;
    readonly VITE_DESIGN_CUSTOMIZATION: string;
    readonly VITE_WHITEBOARD_PRELOADED_LIBRARY_ITEMS: string;
    readonly VITE_VIRTUAL_BACKGROUND_IMAGES: string;
    readonly VITE_DB_MAX_AGE_MS: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
