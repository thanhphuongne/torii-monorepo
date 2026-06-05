import authReducer from './slices/auth-slice.ts';
import {configureStore} from "@reduxjs/toolkit";

export const store = configureStore({
    reducer: {
        auth: authReducer,
    },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

