<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import client from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const saving = ref(false);
const message = ref("");
const error = ref("");

// 头像 — computed 确保 store 变化后自动更新
const avatarUrl = ref("");
const currentAvatar = computed(() => authStore.user?.avatar ?? null);

async function handleAvatarSave() {
  const url = avatarUrl.value.trim();
  if (!url) {
    error.value = "请输入头像 URL";
    return;
  }
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    await client.put("/auth/profile", { avatar: url });
    // 1. 更新数据库
    await client.put("/site/config/avatar", { value: JSON.stringify(url) });
    // 2. 更新 store + 持久化
    if (authStore.user) {
      authStore.user.avatar = url;
    } else {
      const persisted = JSON.parse(localStorage.getItem("user") || "{}");
      persisted.avatar = url;
      localStorage.setItem("user", JSON.stringify(persisted));
      authStore.user = persisted;
    }
    localStorage.setItem("user", JSON.stringify(authStore.user));
    avatarUrl.value = "";
    message.value = "✅ 头像已更新";
  } catch {
    error.value = "保存失败";
  } finally {
    saving.value = false;
  }
}

// 博主信息
const bio = ref("");
// 弹幕文字
const danmakuTexts = ref("");
// 改密码
const oldPassword = ref("");
const newPassword = ref("");
const newPassword2 = ref("");

async function loadConfig() {
  try {
    const { data: bioData } = await client.get("/site/config/bio");
    bio.value = JSON.parse(bioData.value);
  } catch { bio.value = ""; }
  try {
    const { data: dmData } = await client.get("/site/config/danmaku_texts");
    const texts = JSON.parse(dmData.value);
    danmakuTexts.value = Array.isArray(texts) ? texts.join("\n") : "";
  } catch { danmakuTexts.value = ""; }
}

async function saveBio() {
  saving.value = true; error.value = ""; message.value = "";
  try {
    await client.put("/site/config/bio", { value: JSON.stringify(bio.value) });
    message.value = "✅ 博主信息已保存";
  } catch { error.value = "保存失败"; }
  finally { saving.value = false; }
}

async function saveDanmaku() {
  saving.value = true; error.value = ""; message.value = "";
  try {
    const texts = danmakuTexts.value.split("\n").map(s => s.trim()).filter(Boolean);
    await client.put("/site/config/danmaku_texts", { value: JSON.stringify(texts) });
    message.value = "✅ 弹幕文字已保存";
  } catch { error.value = "保存失败"; }
  finally { saving.value = false; }
}

async function changePassword() {
  error.value = ""; message.value = "";
  if (!oldPassword.value || !newPassword.value) {
    error.value = "请填写旧密码和新密码";
    return;
  }
  if (newPassword.value !== newPassword2.value) {
    error.value = "两次输入的新密码不一致";
    return;
  }
  if (newPassword.value.length < 6) {
    error.value = "新密码至少 6 位";
    return;
  }
  saving.value = true;
  try {
    // 改密码走专门的 API 或直接用 user update
    // 当前简化：验证旧密码 → 更新密码
    await client.put("/site/config/_change_password", {
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    });
    message.value = "✅ 密码已修改，下次登录请使用新密码";
    oldPassword.value = "";
    newPassword.value = "";
    newPassword2.value = "";
  } catch {
    error.value = "密码修改失败，请检查旧密码是否正确";
  } finally {
    saving.value = false;
  }
}

onMounted(loadConfig);
</script>

<template>
  <div class="max-w-[800px] mx-auto flex flex-col gap-8">
    <h1 class="text-2xl font-bold text-white">⚙️ 站点设置</h1>

    <p v-if="message" class="text-green-400 text-sm">{{ message }}</p>
    <p v-if="error" class="text-accent-pink text-sm">{{ error }}</p>

    <!-- ====== 头像 ====== -->
    <div class="glass rounded-xl p-6 flex flex-col gap-4">
      <h2 class="text-white font-bold text-sm">🖼 头像</h2>
      <div class="flex items-center gap-5">
        <div class="w-20 h-20 rounded-full shrink-0 overflow-hidden border-2 border-white/10">
          <img
            v-if="currentAvatar"
            :src="currentAvatar"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full bg-accent-cyan/20 flex items-center justify-center text-2xl font-bold text-accent-cyan"
          >
            {{ (authStore.user?.username || 'A')[0].toUpperCase() }}
          </div>
        </div>
        <div class="flex-1 space-y-2">
          <div class="flex gap-2">
            <input
              v-model="avatarUrl"
              type="text"
              placeholder="粘贴图床头像 URL"
              class="flex-1 glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted"
            />
            <button
              :disabled="saving || !avatarUrl.trim()"
              class="glass-strong rounded-lg px-4 py-2.5 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-30 transition-all shrink-0"
              @click="handleAvatarSave"
            >
              {{ saving ? '...' : '保存' }}
            </button>
          </div>
          <p class="text-text-muted text-xs">输入图床图片直链，点击保存即可更换头像</p>
        </div>
      </div>
    </div>

    <!-- 博主信息 -->
    <div class="glass rounded-xl p-6 flex flex-col gap-4">
      <h2 class="text-white font-bold text-sm">🙋 博主信息</h2>
      <textarea v-model="bio" rows="3" placeholder="博主简介..." class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted resize-none" />
      <button :disabled="saving" class="self-start glass-strong rounded-xl px-4 py-2 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50" @click="saveBio">💾 保存</button>
    </div>

    <!-- 弹幕管理 -->
    <div class="glass rounded-xl p-6 flex flex-col gap-4">
      <h2 class="text-white font-bold text-sm">💬 弹幕文字</h2>
      <p class="text-text-muted text-xs">每行一条弹幕文字</p>
      <textarea v-model="danmakuTexts" rows="8" placeholder="每行一条弹幕..." class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted resize-none" />
      <button :disabled="saving" class="self-start glass-strong rounded-xl px-4 py-2 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50" @click="saveDanmaku">💾 保存</button>
    </div>

    <!-- 改密码 -->
    <div class="glass rounded-xl p-6 flex flex-col gap-4">
      <h2 class="text-white font-bold text-sm">🔑 修改密码</h2>
      <div class="flex flex-col gap-4 max-w-sm">
        <input v-model="oldPassword" type="password" placeholder="当前密码" autocomplete="current-password" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
        <input v-model="newPassword" type="password" placeholder="新密码（至少6位）" autocomplete="new-password" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
        <input v-model="newPassword2" type="password" placeholder="确认新密码" autocomplete="new-password" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
        <button :disabled="saving" class="self-start glass-strong rounded-xl px-4 py-2 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50" @click="changePassword">🔒 修改密码</button>
      </div>
    </div>
  </div>
</template>
