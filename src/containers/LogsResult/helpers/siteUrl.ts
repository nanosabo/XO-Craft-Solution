const SITE_URL_RU = "https://crossout-info.com";
const SITE_URL_EN = "https://en.crossout-info.com";

export const siteLogUrl = async (logId: string, isRu: boolean) => {
  const mirror = await window.electronAPI.crossoutStatsMirror();
  const base = mirror || !isRu ? SITE_URL_EN : SITE_URL_RU;

  return `${base}/log/${logId}`;
};
