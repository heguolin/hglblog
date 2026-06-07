<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import client from "@/api/client";

interface CommentItem {
  id: number;
  nickname: string;
  content: string;
  website: string | null;
  createdAt: string;
  parentId: number | null;
  replies?: CommentItem[];
}

const props = defineProps<{ postId: number }>();

const comments = ref<CommentItem[]>([]);
const loading = ref(true);

// GitHub 登录状态
const githubUser = ref<{ nickname: string; avatar: string; token: string } | null>(null);
const loginLoading = ref(false);

function restoreGithubUser() {
  const saved = localStorage.getItem("github_user");
  if (saved) githubUser.value = JSON.parse(saved);
}

function githubLogin() {
  // 保存当前 page 信息，回调后恢复
  localStorage.setItem("comment_postId", String(props.postId));
  window.location.href = "/api/auth/github";
}

function githubLogout() {
  githubUser.value = null;
  localStorage.removeItem("github_user");
}

// 提交表单
const formContent = ref("");
const replyTo = ref<{ id: number; nickname: string } | null>(null);
const submitting = ref(false);
const error = ref("");

async function loadComments() {
  loading.value = true;
  try {
    const { data } = await client.get("/comments", { params: { postId: props.postId } });
    comments.value = data;
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!githubUser.value) return;
  if (!formContent.value.trim()) {
    error.value = "请输入评论内容";
    return;
  }
  submitting.value = true;
  error.value = "";
  try {
    await client.post("/comments", {
      postId: props.postId,
      nickname: githubUser.value.nickname,
      content: formContent.value.trim(),
      website: `https://github.com/${githubUser.value.nickname}`,
      parentId: replyTo.value?.id,
    });
    formContent.value = "";
    replyTo.value = null;
    await loadComments();
  } catch {
    error.value = "提交失败";
  } finally {
    submitting.value = false;
  }
}

function startReply(c: CommentItem) {
  replyTo.value = { id: c.id, nickname: c.nickname };
}

function cancelReply() {
  replyTo.value = null;
}

function onAvatarError(e: Event) {
  (e.target as HTMLImageElement).style.display = "none";
}

// 检测 GitHub 回调
onMounted(() => {
  restoreGithubUser();
  // 如果是 GitHub 回调回来的
  const params = new URLSearchParams(window.location.search);
  const ghToken = params.get("gh_token");
  const ghNick = params.get("gh_nick");
  const ghAvatar = params.get("gh_avatar");
  if (ghToken && ghNick) {
    githubUser.value = { nickname: ghNick, avatar: ghAvatar || "", token: ghToken };
    localStorage.setItem("github_user", JSON.stringify(githubUser.value));
    // 清理 URL
    window.history.replaceState({}, "", window.location.pathname);
    // 回到评论所在的页面
    const savedPostId = localStorage.getItem("comment_postId");
    localStorage.removeItem("comment_postId");
    if (savedPostId) {
      // 刷新以触发评论加载
    }
  }
  loadComments();
});
</script>

<template>
  <div class="glass rounded-xl p-6 md:p-8 space-y-8">
    <div class="flex items-center justify-between">
      <h2 class="text-white font-bold">💬 评论 <span class="text-text-muted text-sm font-normal">({{ comments.length }})</span></h2>
      <!-- GitHub 登录/用户 -->
      <div v-if="githubUser" class="flex items-center gap-2">
        <img :src="githubUser.avatar" class="w-7 h-7 rounded-full" />
        <span class="text-white text-sm">{{ githubUser.nickname }}</span>
        <button class="text-text-muted text-xs hover:text-accent-pink transition-colors ml-1" @click="githubLogout">退出</button>
      </div>
      <button v-else :disabled="loginLoading" class="glass rounded-lg px-4 py-2 text-sm text-white hover:bg-white/10 transition-all flex items-center gap-2" @click="githubLogin">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        GitHub 登录
      </button>
    </div>

    <!-- 评论列表 -->
    <div v-if="loading" class="text-center py-8 text-text-muted text-sm">加载中...</div>
    <div v-else-if="comments.length === 0" class="text-center py-10 text-text-muted text-sm">暂无评论，来抢沙发吧~</div>
    <div v-else class="space-y-6">
      <div v-for="c in comments" :key="c.id">
        <div class="flex gap-3">
          <img :src="`https://github.com/${c.nickname}.png?size=40`" class="w-9 h-9 rounded-full shrink-0 bg-white/5" @error="onAvatarError" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-white text-sm font-bold">{{ c.nickname }}</span>
              <span class="text-text-muted text-xs">{{ dayjs(c.createdAt).format("YYYY-MM-DD HH:mm") }}</span>
            </div>
            <p class="text-text-secondary text-sm leading-relaxed break-words">{{ c.content }}</p>
            <button v-if="githubUser" class="text-xs text-text-muted hover:text-accent-cyan mt-1 transition-colors" @click="startReply(c)">回复</button>
          </div>
        </div>
        <!-- 子回复 -->
        <div v-if="c.replies?.length" class="ml-11 mt-3 space-y-3">
          <div v-for="r in c.replies" :key="r.id" class="flex gap-3">
            <img :src="`https://github.com/${r.nickname}.png?size=24`" class="w-7 h-7 rounded-full shrink-0 bg-white/5" @error="onAvatarError" />
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-white text-xs font-bold">{{ r.nickname }}</span>
                <span class="text-text-muted text-xs">{{ dayjs(r.createdAt).format("MM-DD HH:mm") }}</span>
              </div>
              <p class="text-text-secondary text-xs leading-relaxed">{{ r.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提交表单 -->
    <div v-if="githubUser" class="pt-5 border-t border-white/[0.06]">
      <p v-if="replyTo" class="text-xs text-text-muted mb-3">
        回复 <span class="text-accent-cyan">@{{ replyTo.nickname }}</span>
        <button class="ml-2 hover:text-white" @click="cancelReply">✕</button>
      </p>
      <div class="flex gap-3">
        <img :src="githubUser.avatar" class="w-9 h-9 rounded-full shrink-0" />
        <div class="flex-1 space-y-3">
          <textarea v-model="formContent" rows="3" :placeholder="replyTo ? `回复 @${replyTo.nickname}...` : '写下你的想法...'" maxlength="1000" class="w-full glass rounded-lg p-3 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted resize-none" />
          <div class="flex items-center justify-between">
            <p v-if="error" class="text-accent-pink text-xs">{{ error }}</p>
            <p v-else class="text-text-muted text-xs">使用 GitHub 账号评论</p>
            <button :disabled="submitting" class="glass-strong rounded-xl px-5 py-2 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50 transition-all" @click="submit">
              {{ submitting ? "..." : "提交评论" }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-6 text-text-muted text-sm">
      请先 <button class="text-accent-cyan hover:underline" @click="githubLogin">登录 GitHub</button> 后发表评论
    </div>
  </div>
</template>
