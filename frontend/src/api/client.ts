import axios from "axios";
import { useAuthStore } from "@/stores/auth";
import router from "@/router";

const client = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// 请求拦截器：自动附加 JWT token，处理 Content-Type
client.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    // 只有非 FormData 请求才设置 JSON Content-Type
    // FormData 上传由浏览器自动设置 multipart/form-data（含 boundary）
    if (!(config.data instanceof FormData)) {
      if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json; charset=utf-8";
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器：401 自动清除 token 并跳转登录页
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
      router.push("/admin/login");
    }
    return Promise.reject(error);
  },
);

export default client;
