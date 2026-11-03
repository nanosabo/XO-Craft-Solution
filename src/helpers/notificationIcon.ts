const ICON_SIZE = 128;
const REQUEST_TIMEOUT = 5000;

const iconCache = new Map<number, string | null>();
const pendingIcons = new Map<number, Promise<string | null>>();

const itemImageUrl = (id: number) =>
  `https://nanosabo.github.io/xocs-imgs/images/items/${id}.webp`;

const loadIcon = async (id: number): Promise<string | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(itemImageUrl(id), {
      signal: controller.signal,
      cache: "force-cache",
    });

    if (!response.ok) return null;

    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement("canvas");
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;

    const context = canvas.getContext("2d");

    if (!context) {
      bitmap.close();
      return null;
    }

    const scale = Math.min(
      ICON_SIZE / bitmap.width,
      ICON_SIZE / bitmap.height,
    );
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;

    context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    context.drawImage(
      bitmap,
      (ICON_SIZE - width) / 2,
      (ICON_SIZE - height) / 2,
      width,
      height,
    );
    bitmap.close();

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Returns a PNG data URL for an item, ready to be used as a notification icon.
 * WebP is decoded by the renderer because Electron's nativeImage does not
 * support it on all platforms.
 */
export const getItemNotificationIcon = (
  id: number,
): Promise<string | null> => {
  const cached = iconCache.get(id);

  if (cached !== undefined) return Promise.resolve(cached);

  const pending = pendingIcons.get(id);

  if (pending) return pending;

  const promise = loadIcon(id).then((icon) => {
    iconCache.set(id, icon);
    pendingIcons.delete(id);
    return icon;
  });

  pendingIcons.set(id, promise);
  return promise;
};

/** Reads an already prepared icon without starting a network request. */
export const getCachedItemNotificationIcon = (id: number) =>
  iconCache.get(id) ?? null;
