/**
 * Create Room utilities
 *
 * All types mapping based on packages/protocol/src/gen/wajlc_create_room_pb.ts
 */

import {
  CreateRoomReq,
  LockSettingsSchema,
  RecordingFeaturesSchema,
  ChatFeaturesSchema,
  WhiteboardFeaturesSchema,
  ExternalMediaPlayerFeaturesSchema,
  WaitingRoomFeaturesSchema,
  BreakoutRoomFeaturesSchema,
  DisplayExternalLinkFeaturesSchema,
  IngressFeaturesSchema,
  SpeechToTextTranslationFeaturesSchema,
  EndToEndEncryptionFeaturesSchema,
  PollsFeaturesSchema,
  InsightsFeaturesSchema,
  InsightsTranscriptionFeaturesSchema,
  InsightsChatTranslationFeaturesSchema,
  InsightsAIFeaturesSchema,
  InsightsAITextChatFeaturesSchema,
  InsightsAIMeetingSummarizationFeaturesSchema,
  SharedNotePadFeaturesSchema,
} from '@workspace/protocol';
import { create } from '@bufbuild/protobuf';
import { generateSecureRandomString, generateRandomString } from './common';

/**
 * PrepareDefaultRoomFeatures sets default values for room features
 *
 * @param r - CreateRoomReq to prepare
 */
export function prepareDefaultRoomFeatures(r: CreateRoomReq): void {
  const rf = r.metadata!.roomFeatures!;

  if (!rf.recordingFeatures) {
    rf.recordingFeatures = create(RecordingFeaturesSchema, {
      isAllow: true,
      isAllowCloud: true,
      isAllowLocal: true,
      enableAutoCloudRecording: false,
    });
  }

  if (!rf.chatFeatures) {
    rf.chatFeatures = create(ChatFeaturesSchema, {
      isAllow: false,
      isAllowFileUpload: false,
    });
  } else {
    // backward compatibility
    if (rf.chatFeatures.allowChat !== undefined) {
      rf.chatFeatures.isAllow = rf.chatFeatures.allowChat;
    }
    if (rf.chatFeatures.allowFileUpload !== undefined) {
      rf.chatFeatures.isAllowFileUpload = rf.chatFeatures.allowFileUpload;
    }
  }

  if (!rf.sharedNotePadFeatures) {
    rf.sharedNotePadFeatures = create(SharedNotePadFeaturesSchema, {
      isAllow: false,
      isActive: false,
      visible: false,
    });
  } else {
    // backward compatibility
    if (rf.sharedNotePadFeatures.allowedSharedNotePad !== undefined) {
      rf.sharedNotePadFeatures.isAllow =
        rf.sharedNotePadFeatures.allowedSharedNotePad;
    }
  }

  if (!rf.whiteboardFeatures) {
    rf.whiteboardFeatures = create(WhiteboardFeaturesSchema, {
      isAllow: false,
      visible: false,
      whiteboardFileId: 'default',
      fileName: 'default',
      totalPages: 10,
    });
  } else {
    // backward compatibility
    if (rf.whiteboardFeatures.allowedWhiteboard !== undefined) {
      rf.whiteboardFeatures.isAllow = rf.whiteboardFeatures.allowedWhiteboard;
    }
  }

  if (!rf.externalMediaPlayerFeatures) {
    rf.externalMediaPlayerFeatures = create(ExternalMediaPlayerFeaturesSchema, {
      isAllow: false,
      isActive: false,
    });
  } else {
    // backward compatibility
    if (
      rf.externalMediaPlayerFeatures.allowedExternalMediaPlayer !== undefined
    ) {
      rf.externalMediaPlayerFeatures.isAllow =
        rf.externalMediaPlayerFeatures.allowedExternalMediaPlayer;
    }
  }

  if (!rf.waitingRoomFeatures) {
    rf.waitingRoomFeatures = create(WaitingRoomFeaturesSchema, {
      isActive: false,
      waitingRoomMsg: '',
    });
  }

  if (!rf.breakoutRoomFeatures) {
    rf.breakoutRoomFeatures = create(BreakoutRoomFeaturesSchema, {
      isAllow: false,
      isActive: false,
      allowedNumberRooms: 6,
    });
  }

  if (!rf.displayExternalLinkFeatures) {
    rf.displayExternalLinkFeatures = create(DisplayExternalLinkFeaturesSchema, {
      isAllow: false,
      isActive: false,
    });
  }

  if (!rf.ingressFeatures) {
    rf.ingressFeatures = create(IngressFeaturesSchema, {
      isAllow: false,
    });
  }

  if (!rf.speechToTextTranslationFeatures) {
    rf.speechToTextTranslationFeatures = create(
      SpeechToTextTranslationFeaturesSchema,
      {
        isAllow: false,
        isAllowTranslation: false,
      },
    );
  }

  if (!rf.endToEndEncryptionFeatures) {
    rf.endToEndEncryptionFeatures = create(EndToEndEncryptionFeaturesSchema, {
      isEnabled: false,
    });
  }

  if (!rf.pollsFeatures) {
    rf.pollsFeatures = create(PollsFeaturesSchema, {
      isAllow: false,
    });
    // backward compatibility
    if (rf.allowPolls !== undefined) {
      rf.pollsFeatures.isAllow = rf.allowPolls;
    }
  }

  if (!rf.insightsFeatures) {
    rf.insightsFeatures = create(InsightsFeaturesSchema, {
      isAllow: false,
      transcriptionFeatures: create(InsightsTranscriptionFeaturesSchema, {
        isAllow: false,
        isAllowTranslation: false,
        maxSelectedTransLangs: 2,
      }),
      chatTranslationFeatures: create(InsightsChatTranslationFeaturesSchema, {
        isAllow: false,
        maxSelectedTransLangs: 5,
      }),
      aiFeatures: create(InsightsAIFeaturesSchema, {
        isAllow: false,
        aiTextChatFeatures: create(InsightsAITextChatFeaturesSchema, {
          isAllow: false,
        }),
        meetingSummarizationFeatures: create(
          InsightsAIMeetingSummarizationFeaturesSchema,
          {
            isAllow: false,
          },
        ),
      }),
    });
    // backward compatibility
    if (rf.speechToTextTranslationFeatures?.isAllow) {
      rf.insightsFeatures.isAllow = true;
      rf.insightsFeatures.transcriptionFeatures!.isAllow = true;
      rf.insightsFeatures.transcriptionFeatures!.isAllowTranslation =
        rf.speechToTextTranslationFeatures.isAllowTranslation;
    }
  }

  if (!r.metadata!.defaultLockSettings) {
    r.metadata!.defaultLockSettings = create(LockSettingsSchema, {});
  }

  // startedAt is uint64 with JS_STRING = string
  r.metadata!.startedAt = Math.floor(Date.now() / 1000).toString();
  r.metadata!.roomFeatures = rf;
}

/**
 * SetCreateRoomDefaultValues sets default values based on server config
 *
 * @param r - CreateRoomReq to configure
 * @param maxSize - Max file upload size (bytes) - uint64 with JS_STRING = string
 * @param maxSizeWhiteboardFile - Max whiteboard file size (MB) - uint64 with JS_STRING = string
 * @param allowedTypes - Allowed file types for chat
 * @param allowedNotepad - Whether notepad is allowed
 */
export function setCreateRoomDefaultValues(
  r: CreateRoomReq,
  maxSize: string, // uint64 with JS_STRING
  maxSizeWhiteboardFile: string, // uint64 with JS_STRING
  allowedTypes: string[],
  allowedNotepad: boolean,
): void {
  const rf = r.metadata!.roomFeatures!; // r.metadata is ensured by caller or prepareDefaultRoomFeatures

  if (rf.autoGenUserId === undefined) {
    // by default, auto user id generation will be disabled
    rf.autoGenUserId = false;
  }

  if (rf.sharedNotePadFeatures?.isAllow && !allowedNotepad) {
    rf.sharedNotePadFeatures.isAllow = false;
  }

  if (rf.chatFeatures?.isAllowFileUpload) {
    if (
      !rf.chatFeatures.allowedFileTypes ||
      rf.chatFeatures.allowedFileTypes.length === 0
    ) {
      rf.chatFeatures.allowedFileTypes = allowedTypes;
    }
    rf.chatFeatures.maxFileSize = maxSize; // string type
  }

  if (rf.whiteboardFeatures?.isAllow) {
    let sizeNum = BigInt(maxSizeWhiteboardFile);
    if (sizeNum < 1n) {
      sizeNum = 30n;
    }
    rf.whiteboardFeatures.maxAllowedFileSize = sizeNum.toString(); // string type
  }

  if (
    rf.breakoutRoomFeatures?.isAllow &&
    rf.breakoutRoomFeatures.allowedNumberRooms === 0
  ) {
    rf.breakoutRoomFeatures.allowedNumberRooms = 6;
  }

  if (rf.endToEndEncryptionFeatures?.isEnabled) {
    if (!rf.endToEndEncryptionFeatures.enabledSelfInsertEncryptionKey) {
      try {
        const randomKey = generateSecureRandomString(32);
        rf.endToEndEncryptionFeatures.encryptionKey = randomKey;
      } catch (err) {
        const randomKey = generateRandomString(32);
        rf.endToEndEncryptionFeatures.encryptionKey = randomKey;
      }
    }
  }
}

/**
 * SetRoomDefaultLockSettings sets default lock settings
 *
 * @param r - CreateRoomReq to configure
 */
export function setRoomDefaultLockSettings(r: CreateRoomReq): void {
  const lock = true;

  if (r.metadata!.defaultLockSettings!.lockScreenSharing === undefined) {
    r.metadata!.defaultLockSettings!.lockScreenSharing = lock;
  }
  if (r.metadata!.defaultLockSettings!.lockWhiteboard === undefined) {
    r.metadata!.defaultLockSettings!.lockWhiteboard = lock;
  }
  if (r.metadata!.defaultLockSettings!.lockSharedNotepad === undefined) {
    r.metadata!.defaultLockSettings!.lockSharedNotepad = lock;
  }
}

/**
 * Room default settings interface
 */
export interface RoomDefaultSettings {
  maxParticipants?: number; // uint32
  maxDuration?: string; // uint64 with JS_STRING
  maxNumBreakoutRooms?: number; // uint32
}

/**
 * SetDefaultRoomSettings applies default room settings from config
 *
 * @param s - Room default settings from config
 * @param r - CreateRoomReq to configure
 */
export function setDefaultRoomSettings(
  s: RoomDefaultSettings | null,
  r: CreateRoomReq,
): void {
  if (!s) {
    return;
  }

  if (s.maxParticipants !== undefined && s.maxParticipants > 0) {
    if (r.maxParticipants !== undefined) {
      if (r.maxParticipants === 0 || r.maxParticipants > s.maxParticipants) {
        r.maxParticipants = s.maxParticipants;
      }
    } else {
      r.maxParticipants = s.maxParticipants;
    }
  }

  if (s.maxDuration !== undefined && s.maxDuration !== '0') {
    const maxDur = BigInt(s.maxDuration);
    if (r.metadata!.roomFeatures!.roomDuration !== undefined) {
      const reqDuration = BigInt(r.metadata!.roomFeatures!.roomDuration || '0');
      if (reqDuration === 0n || reqDuration > maxDur) {
        r.metadata!.roomFeatures!.roomDuration = s.maxDuration;
      }
    } else {
      r.metadata!.roomFeatures!.roomDuration = s.maxDuration;
    }
  }

  if (r.emptyTimeout === undefined || r.emptyTimeout < 120) {
    const et = 1800; // 1800 seconds = 30 minutes
    r.emptyTimeout = et;
  }

  // at present, we will allow max 16 rooms
  const maxNum = 16;
  if (s.maxNumBreakoutRooms === undefined) {
    s.maxNumBreakoutRooms = maxNum;
  } else if (
    s.maxNumBreakoutRooms !== undefined &&
    s.maxParticipants! > maxNum
  ) {
    s.maxNumBreakoutRooms = maxNum;
  }

  if (
    r.metadata!.roomFeatures!.breakoutRoomFeatures!.allowedNumberRooms >
    s.maxNumBreakoutRooms
  ) {
    r.metadata!.roomFeatures!.breakoutRoomFeatures!.allowedNumberRooms =
      s.maxNumBreakoutRooms!;
  }
}
