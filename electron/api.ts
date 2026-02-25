import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { setIsMirror } from "./main";

const BASE_URLS = [
  "https://crossoutcore.ru",
  "https://cross.vas-matrizza.workers.dev",
];

const CACHE_TTL = 10 * 60 * 1000;

let cachedBaseUrl: string | null = null;
let cacheExpiresAt = 0;

const getBaseUrl = () => {
  if (cachedBaseUrl && Date.now() < cacheExpiresAt) {
    return cachedBaseUrl;
  }
  return BASE_URLS[0];
};

const api = axios.create({
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  return config;
});

api.interceptors.response.use(
  (response) => {
    const currentBase = response.config.baseURL;
    if (currentBase) {
      cachedBaseUrl = currentBase;
      cacheExpiresAt = Date.now() + CACHE_TTL;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const currentBase = originalRequest.baseURL;
    const fallbackBase = BASE_URLS.find((u) => u !== currentBase);

    if (!fallbackBase) {
      return Promise.reject(error);
    }

    setIsMirror(fallbackBase === BASE_URLS[1]);

    cachedBaseUrl = fallbackBase;
    cacheExpiresAt = Date.now() + CACHE_TTL;

    originalRequest.baseURL = fallbackBase;

    return api(originalRequest);
  },
);

export default api;
