interface AppEnv {
  apiBaseUrl: string;
  /** Origin (scheme + host + port) of the backend — apiBaseUrl minus
   *  the `/api` global prefix. Used to build absolute URLs for static
   *  assets served outside the `/api` namespace, e.g. `/uploads/...`
   *  raw-message media that the AI worker stored on disk. */
  backendOrigin: string;
  devInitData: string;
  allowedHosts: string[];
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

export const env: AppEnv = {
  apiBaseUrl: API_BASE_URL,
  backendOrigin: API_BASE_URL.replace(/\/api\/?$/, ""),
  devInitData: import.meta.env.VITE_DEV_INIT_DATA ?? "",
  allowedHosts: import.meta.env.VITE_ALLOWED_HOSTS?.split(",") ?? [],
};
