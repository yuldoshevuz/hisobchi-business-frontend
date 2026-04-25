interface AppEnv {
  apiBaseUrl: string;
  devInitData: string;
}

export const env: AppEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  devInitData: import.meta.env.VITE_DEV_INIT_DATA ?? '',
};
