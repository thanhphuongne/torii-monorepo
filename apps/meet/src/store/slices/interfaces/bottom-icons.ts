import { BackgroundConfig } from '@/components/virtual-background/helpers/background-helper';

export type DeviceOrientation = 'landscape' | 'portrait';

export type SidePanelType = 'CHAT' | 'PARTICIPANTS' | 'POLLS' | 'AI_CHAT' | null;

export interface IBottomIconsSlice {
  isActiveMicrophone: boolean;
  isActiveWebcam: boolean;
  isActiveRaisehand: boolean;
  isActiveRecording: boolean;
  isActiveScreenshare: boolean;
  isActiveWhiteboard: boolean;
  isActiveInsightsAiTextChat: boolean;

  activeSidePanel: SidePanelType;

  isMicMuted: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceOrientation: DeviceOrientation;

  // modal related
  showMicrophoneModal: boolean;
  showVideoShareModal: boolean;
  showLockSettingsModal: boolean;
  showRtmpModal: boolean;
  showExternalMediaPlayerModal: boolean;
  showManageWaitingRoomModal: boolean;
  showManageBreakoutRoomModal: boolean;
  showDisplayExternalLinkModal: boolean;
  showSpeechSettingsModal: boolean;
  showSpeechSettingOptionsModal: boolean;
  showInsightsAISettingsModal: boolean;

  totalUnreadChatMsgs: number;
  virtualBackground: BackgroundConfig;
  isEnabledExtendedVerticalCamView: boolean;
  recordingModalOpenNonce: number;
}
