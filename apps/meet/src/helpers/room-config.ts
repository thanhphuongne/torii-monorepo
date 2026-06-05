import { create } from '@bufbuild/protobuf';
import { RoomCreateFeaturesSchema, RoomMetadataSchema } from '@workspace/protocol';

export const getDefaultRoomInfo = (roomId: string) => ({
    roomId: roomId,
    emptyTimeout: 60 * 60 * 2,
    metadata: create(RoomMetadataSchema, {
        roomTitle: 'Demo room',
        welcomeMessage: 'Welcome to Torii Nihongo!<br /> To share microphone click mic icon from bottom left side.',
        roomFeatures: create(RoomCreateFeaturesSchema, {
            allowWebcams: true,
            muteOnStart: false,
            allowScreenShare: true,
            allowRtmp: true,
            adminOnlyWebcams: false,
            allowViewOtherWebcams: true,
            allowViewOtherUsersList: true,
            roomDuration: '0',
            enableAnalytics: true,
            allowVirtualBg: true,
            allowRaiseHand: true,
            recordingFeatures: {
                isAllow: true,
                isAllowCloud: true,
                isAllowLocal: true,
                enableAutoCloudRecording: false,
                onlyRecordAdminWebcams: false,
            },
            chatFeatures: {
                isAllow: true,
                isAllowFileUpload: true,
                maxFileSize: '50',
                allowedFileTypes: ['jpg', 'png', 'zip', 'pdf'],
            },
            whiteboardFeatures: {
                isAllow: true,
            },
            externalMediaPlayerFeatures: {
                isAllow: true,
            },
            waitingRoomFeatures: {
                isActive: true,
            },
            breakoutRoomFeatures: {
                isAllow: true,
                allowedNumberRooms: 6,
            },
            displayExternalLinkFeatures: {
                isAllow: true,
            },
            ingressFeatures: {
                isAllow: true,
            },
            pollsFeatures: {
                isAllow: true,
            },
            insightsFeatures: {
                isAllow: true,
                transcriptionFeatures: {
                    isAllow: true,
                    isAllowTranslation: true,
                    isAllowSpeechSynthesis: true,
                },
                chatTranslationFeatures: {
                    isAllow: true,
                },
                aiFeatures: {
                    isAllow: true,
                    aiTextChatFeatures: {
                        isAllow: true,
                    },
                    meetingSummarizationFeatures: {
                        isAllow: true,
                    }
                },
            },
            endToEndEncryptionFeatures: {
                isEnabled: false,
                includedChatMessages: false,
                includedWhiteboard: false,
                enabledSelfInsertEncryptionKey: false,
            },
        }),
    }),
});
