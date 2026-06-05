import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  DeviceOrientation,
  IBottomIconsSlice,
  SidePanelType,
} from '@/store/slices/interfaces/bottom-icons';
import {
  BackgroundConfig,
  defaultBackgroundConfig,
} from '@/components/virtual-background/helpers/background-helper';

const initialState: IBottomIconsSlice = {
  isActiveMicrophone: false,
  isActiveWebcam: false,
  isActiveRaisehand: false,
  isActiveRecording: false,
  isActiveScreenshare: false,
  isActiveWhiteboard: false,
  isActiveInsightsAiTextChat: false,

  activeSidePanel: 'PARTICIPANTS',

  isMicMuted: false,
  screenWidth: 1024,
  screenHeight: 500,
  deviceOrientation: 'portrait',

  showMicrophoneModal: false,
  showVideoShareModal: false,
  showLockSettingsModal: false,
  showRtmpModal: false,
  showExternalMediaPlayerModal: false,
  showManageWaitingRoomModal: false,
  showManageBreakoutRoomModal: false,
  showDisplayExternalLinkModal: false,
  showSpeechSettingsModal: false,
  showSpeechSettingOptionsModal: false,
  showInsightsAISettingsModal: false,

  recordingModalOpenNonce: 0,

  totalUnreadChatMsgs: 0,
  virtualBackground: defaultBackgroundConfig,
  isEnabledExtendedVerticalCamView: false,
};

const bottomIconsSlice = createSlice({
  name: 'bottomIconsActivity',
  initialState,
  reducers: {
    setActiveSidePanel: (state, action: PayloadAction<SidePanelType>) => {
      // If the payload is the same as the current active panel, it means we're toggling it off.
      if (state.activeSidePanel === action.payload) {
        state.activeSidePanel = null;
      } else {
        state.activeSidePanel = action.payload;
      }

      // Handle side effects, like clearing unread messages, in one place.
      if (state.activeSidePanel === 'CHAT') {
        state.totalUnreadChatMsgs = 0;
      }
    },
    updateIsActiveMicrophone: (state, action: PayloadAction<boolean>) => {
      state.isActiveMicrophone = action.payload;
    },
    updateIsMicMuted: (state, action: PayloadAction<boolean>) => {
      state.isMicMuted = action.payload;
    },
    updateIsActiveWebcam: (state, action: PayloadAction<boolean>) => {
      state.isActiveWebcam = action.payload;
    },
    updateIsActiveRaisehand: (state, action: PayloadAction<boolean>) => {
      state.isActiveRaisehand = action.payload;
    },
    updateIsActiveRecording: (state, action: PayloadAction<boolean>) => {
      state.isActiveRecording = action.payload;
    },
    updateIsActiveScreenshare: (state, action: PayloadAction<boolean>) => {
      state.isActiveScreenshare = action.payload;

      if (state.isActiveScreenshare) {
        // If screen sharing starts, we should close any open side panel.
        state.activeSidePanel = null;
        state.isActiveWhiteboard = false;
      }
    },

    updateIsActiveWhiteboard: (state, action: PayloadAction<boolean>) => {
      state.isActiveWhiteboard = action.payload;
    },
    updateIsActiveInsightsAiTextChat: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isActiveInsightsAiTextChat = action.payload;
    },
    updateScreenWidth: (state, action: PayloadAction<number>) => {
      state.screenWidth = action.payload;
    },
    updateScreenHeight: (state, action: PayloadAction<number>) => {
      state.screenHeight = action.payload;
    },
    updateDeviceOrientation: (
      state,
      action: PayloadAction<DeviceOrientation>,
    ) => {
      state.deviceOrientation = action.payload;
    },

    // modal related
    updateShowMicrophoneModal: (state, action: PayloadAction<boolean>) => {
      state.showMicrophoneModal = action.payload;
    },
    updateShowVideoShareModal: (state, action: PayloadAction<boolean>) => {
      state.showVideoShareModal = action.payload;
    },
    updateShowLockSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.showLockSettingsModal = action.payload;
    },
    updateShowRtmpModal: (state, action: PayloadAction<boolean>) => {
      state.showRtmpModal = action.payload;
    },
    updateShowExternalMediaPlayerModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showExternalMediaPlayerModal = action.payload;
    },
    updateShowManageWaitingRoomModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showManageWaitingRoomModal = action.payload;
    },
    updateShowManageBreakoutRoomModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showManageBreakoutRoomModal = action.payload;
    },
    updateDisplayExternalLinkRoomModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showDisplayExternalLinkModal = action.payload;
    },
    updateDisplaySpeechSettingsModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showSpeechSettingsModal = action.payload;
    },
    updateDisplaySpeechSettingOptionsModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showSpeechSettingOptionsModal = action.payload;
    },
    updateDisplayInsightsAISettingsModal: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.showInsightsAISettingsModal = action.payload;
    },
    updateTotalUnreadChatMsgs: (state) => {
      if (state.activeSidePanel !== 'CHAT') {
        state.totalUnreadChatMsgs += 1;
      }
    },
    updateVirtualBackground: (
      state,
      action: PayloadAction<BackgroundConfig>,
    ) => {
      state.virtualBackground = action.payload;
    },
    updateIsEnabledExtendedVerticalCamView: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.isEnabledExtendedVerticalCamView = action.payload;
    },
  },
});

export const {
  setActiveSidePanel,
  updateIsActiveMicrophone,
  updateIsMicMuted,
  updateIsActiveWebcam,
  updateIsActiveRaisehand,
  updateIsActiveRecording,
  updateIsActiveScreenshare,
  updateIsActiveWhiteboard,
  updateIsActiveInsightsAiTextChat,
  updateShowMicrophoneModal,
  updateShowVideoShareModal,
  updateShowLockSettingsModal,
  updateShowManageWaitingRoomModal,
  updateShowRtmpModal,
  updateShowExternalMediaPlayerModal,
  updateShowManageBreakoutRoomModal,
  updateDisplayExternalLinkRoomModal,
  updateScreenWidth,
  updateScreenHeight,
  updateDeviceOrientation,
  updateTotalUnreadChatMsgs,
  updateVirtualBackground,
  updateDisplaySpeechSettingsModal,
  updateDisplaySpeechSettingOptionsModal,
  updateIsEnabledExtendedVerticalCamView,
  updateDisplayInsightsAISettingsModal,
} = bottomIconsSlice.actions;

export default bottomIconsSlice.reducer;
