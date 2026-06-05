import { create, fromJsonString } from '@bufbuild/protobuf';
import {
    ChatMessageSchema,
    NatsMsgServerToClient,
    NatsMsgServerToClientEvents,
    NatsSystemNotificationSchema,
    NatsSystemNotificationTypes,
} from '@workspace/protocol';

import { store } from '@/store';
import {
    addUserNotification,
    updatePlayAudioNotification,
} from '@/store/slices/roomSettingsSlice';
import { pollsApi } from '@/store/services/polls-api';
import { updateReceivedInvitationFor } from '@/store/slices/breakout-room-slice';
import { breakoutRoomApi } from '@/store/services/breakout-room-api';
import { addChatMessage } from '@/store/slices/chat-messages-slice';
import { randomString } from '@/helpers/utils';

export default class HandleSystemData {
    private readonly userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }
    /**
     * To handle various notifications
     * @param data
     */
    public handleNotification = (data: string) => {
        const nt = fromJsonString(NatsSystemNotificationSchema, data);
        switch (nt.type) {
            case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_INFO:
                store.dispatch(
                    addUserNotification({
                        message: nt.msg,
                        typeOption: 'info',
                        newInstance: true,
                    }),
                );

                if (nt.withSound) {
                    this.playNotification();
                }
                break;
            case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_WARNING:
                store.dispatch(
                    addUserNotification({
                        message: nt.msg,
                        typeOption: 'warning',
                        newInstance: true,
                    }),
                );
                if (nt.withSound) {
                    this.playNotification();
                }
                break;
            case NatsSystemNotificationTypes.NATS_SYSTEM_NOTIFICATION_ERROR:
                store.dispatch(
                    addUserNotification({
                        message: nt.msg,
                        typeOption: 'error',
                        newInstance: true,
                    }),
                );
                if (nt.withSound) {
                    this.playNotification();
                }
                break;
        }
    };

    public handlePoll = (payload: NatsMsgServerToClient) => {
        switch (payload.event) {
            case NatsMsgServerToClientEvents.POLL_CREATED:
                store.dispatch(
                    addUserNotification({
                        message: 'Bình chọn mới',
                        typeOption: 'info',
                        notificationCat: 'new-poll-created',
                        autoClose: false,
                    }),
                );
                store.dispatch(pollsApi.util.invalidateTags(['List', 'PollsStats']));
                break;
            case NatsMsgServerToClientEvents.POLL_CLOSED:
                store.dispatch(
                    pollsApi.util.invalidateTags([
                        'List',
                        'PollsStats',
                        {
                            type: 'Count',
                            id: payload.msg,
                        },
                        {
                            type: 'Selected',
                            id: payload.msg,
                        },
                        {
                            type: 'PollResult',
                            id: payload.msg,
                        },
                        {
                            type: 'PollDetails',
                            id: payload.msg,
                        },
                    ]),
                );
                break;
        }
    };

    public handleBreakoutRoom = (payload: NatsMsgServerToClient) => {
        switch (payload.event) {
            case NatsMsgServerToClientEvents.JOIN_BREAKOUT_ROOM:
                if (payload.msg !== '') {
                    store.dispatch(
                        addUserNotification({
                            message: 'Lời mời tham gia phòng thảo luận',
                            typeOption: 'info',
                            notificationCat: 'breakout-room-invitation',
                            data: payload.msg,
                            disableToastNotification: true,
                        }),
                    );
                    store.dispatch(updateReceivedInvitationFor(payload.msg));
                    store.dispatch(breakoutRoomApi.util.invalidateTags(['My_Rooms']));
                }
                break;
            case NatsMsgServerToClientEvents.BREAKOUT_ROOM_ENDED:
                store.dispatch(
                    breakoutRoomApi.util.invalidateTags(['List', 'My_Rooms']),
                );
                break;
        }
    };

    public handleSysChatMsg = (msg: string) => {
        const body = create(ChatMessageSchema, {
            id: randomString(),
            sentAt: Date.now().toString(),
            isPrivate: false,
            fromName: 'system',
            fromUserId: 'system',
            message: msg,
            fromAdmin: true, // system message always from admin
        });

        store.dispatch(
            addChatMessage({ message: body, currentUserId: this.userId }),
        );
        store.dispatch(
            addUserNotification({
                message: 'Có tin nhắn hệ thống mới trong chat',
                typeOption: 'info',
                newInstance: true,
            }),
        );
    };

    private playNotification() {
        store.dispatch(updatePlayAudioNotification(true));
    }
}