import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

// A shared axios instance used by the generated client.
// You can customize headers, interceptors, or baseURL here.
export const axiosInstance = <R = unknown>(config: AxiosRequestConfig) => {
  const instance: AxiosInstance = axios.create({
    baseURL:
      (import.meta as any)?.env?.VITE_API_BASE_URL ||
      "https://algorand-trades.de-4.biatec.io",
  });
  return instance.request<R>(config as AxiosRequestConfig);
};
