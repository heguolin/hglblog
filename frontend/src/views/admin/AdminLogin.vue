<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import client from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

// 已登录用户访问登录页 → 直接进后台
onMounted(() => {
  if (localStorage.getItem("token")) {
    router.replace("/admin/dashboard");
  }
});

const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  error.value = "";
  if (!username.value.trim() || !password.value.trim()) {
    error.value = "请输入用户名和密码";
    return;
  }
  loading.value = true;
  try {
    const { data } = await client.post("/auth/login", {
      username: username.value.trim(),
      password: password.value,
    });
    authStore.setAuth(data.token, data.user);
    router.replace("/admin/dashboard");
  } catch {
    error.value = "用户名或密码错误";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <!-- 登录卡片 -->
    <div class="glass-strong rounded-2xl p-8 w-full max-w-sm backdrop-blur-xl">
      <!-- 头部 -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent-pink via-accent-purple to-accent-blue p-[2px]">
          <div class="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-2xl font-bold text-white">
            H
          </div>
        </div>
        <h1 class="text-white text-xl font-bold">管理员登录</h1>
        <p class="text-text-muted text-sm mt-1">HGL Blog Admin</p>
      </div>

      <!-- 表单 -->
      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="block text-xs text-text-muted mb-1.5">用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="admin"
            autocomplete="username"
            class="w-full glass rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted"
          />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1.5">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="········"
            autocomplete="current-password"
            class="w-full glass rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted"
          />
        </div>

        <!-- 错误 -->
        <p v-if="error" class="text-accent-pink text-xs text-center">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full glass-strong rounded-xl py-3 text-sm text-white font-medium hover:bg-white/15 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ loading ? "登录中..." : "登 录" }}
        </button>
      </form>

      <!-- 底部提示 -->
      <p class="text-center text-text-muted text-xs mt-6">
        🔒 仅限博主登录
      </p>
    </div>
  </div>
</template>
