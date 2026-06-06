import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface User {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  role: "ADMIN" | "USER";
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const savedUser = localStorage.getItem("user");
  const user = ref<User | null>(savedUser ? JSON.parse(savedUser) : null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === "ADMIN");

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }

  function updateUser(data: Partial<User>) {
    if (user.value) {
      Object.assign(user.value, data);
      localStorage.setItem("user", JSON.stringify(user.value));
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  function loadUserFromStorage() {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      token.value = storedToken;
    }
  }

  return {
    token,
    user,
    isLoggedIn,
    isAdmin,
    setAuth,
    updateUser,
    logout,
    loadUserFromStorage,
  };
});
