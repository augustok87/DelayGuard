import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

// Import slices
import appSlice from "./slices/appSlice";
import alertsSlice from "./slices/alertsSlice";
import ordersSlice from "./slices/ordersSlice";
import settingsSlice from "./slices/settingsSlice";
import uiSlice from "./slices/uiSlice";

// Persist configuration
const persistConfig = {
  key: "delayguard",
  storage,
  whitelist: ["settings", "ui"], // Only persist these slices
  blacklist: ["alerts", "orders"], // Don't persist these slices
};

// Root reducer
const rootReducer = combineReducers({
  app: appSlice,
  alerts: alertsSlice,
  orders: ordersSlice,
  settings: settingsSlice,
  ui: uiSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Store hooks
export { useAppDispatch, useAppSelector } from "./hooks";
