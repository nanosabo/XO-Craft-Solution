import { useEffect } from "react";
import { logWarning } from "@src/helpers/errorLog";
import { setUpdateState } from "@src/store/slices/updater.slice";
import { useAppDispatch } from "@src/store/store";

/**
 * Mirrors the update state owned by the main process into Redux so both the
 * bottom-left notification and the settings page stay in sync.
 */
const UpdaterBridge = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let active = true;
    let receivedEvent = false;

    // Subscribe before requesting the snapshot so a state change that happens
    // during startup cannot be missed.
    const unsubscribe = window.electronAPI.onUpdateState((state) => {
      receivedEvent = true;
      dispatch(setUpdateState(state));
    });

    window.electronAPI
      .getUpdateState()
      .then((state) => {
        if (active && !receivedEvent) dispatch(setUpdateState(state));
      })
      .catch((error) => logWarning("update-state", error));

    return () => {
      active = false;
      unsubscribe();
    };
  }, [dispatch]);

  return null;
};

export default UpdaterBridge;
