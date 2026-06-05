import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const makeStore = () => {
    return configureStore({
        reducer: {
            auth: authReducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false, // Avoid warnings for Date objects if any in DTOs
            }),
    });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
