let lastAppRoute = "/";

/**
 * Remembers the last route that was not the loading/error screen. When a thunk
 * fails we use it to send the user back to the page they came from.
 */
export const setLastAppRoute = (path: string) => {
  if (!path || path === "/loading") return;

  lastAppRoute = path;
};

export const getLastAppRoute = () => lastAppRoute;
