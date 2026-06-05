import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import activeSpeakersSlice from '@/store/slices/active-speakers-slice';
import participantSlice from '@/store/slices/participant-slice';
import sessionSlice from '@/store/slices/session-slice';
import bottomIconsSlice from '@/store/slices/bottom-icons-activity-slice';
import chatMessagesSlice from '@/store/slices/chat-messages-slice';
import roomSettingsSlice from '@/store/slices/roomSettingsSlice';
import whiteboardSlice from '@/store/slices/whiteboard';
import externalMediaPlayerSlice from '@/store/slices/external-media-player';
import { pollsApi } from '@/store/services/polls-api';
import breakoutRoomSlice from '@/store/slices/breakout-room-slice';
import { breakoutRoomApi } from '@/store/services/breakout-room-api';
import speechServicesSlice from '@/store/slices/speech-services-slice';

declare const IS_PRODUCTION: boolean;

export const store = configureStore({
  reducer: {
    participants: participantSlice,
    activeSpeakers: activeSpeakersSlice,
    session: sessionSlice,
    bottomIconsActivity: bottomIconsSlice,
    chatMessages: chatMessagesSlice,
    roomSettings: roomSettingsSlice,
    whiteboard: whiteboardSlice,
    externalMediaPlayer: externalMediaPlayerSlice,
    breakoutRoom: breakoutRoomSlice,
    [pollsApi.reducerPath]: pollsApi.reducer,
    [breakoutRoomApi.reducerPath]: breakoutRoomApi.reducer,
    speechServices: speechServicesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      pollsApi.middleware,
      breakoutRoomApi.middleware,
    ),
  devTools: !IS_PRODUCTION,
});

setupListeners(store.dispatch);
