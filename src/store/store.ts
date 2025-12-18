import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import loaderReducer from "./slices/loader.slice";
import appReducer from "./slices/app.slice";
import solveInputsReducer from "./slices/solveInputs.slice";
import requiredPartsReducer from "./slices/requiredParts.slice";

export const store = configureStore({
  reducer: {
    loader: loaderReducer,
    app: appReducer,
    solveInputs: solveInputsReducer,
    requiredParts: requiredPartsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
