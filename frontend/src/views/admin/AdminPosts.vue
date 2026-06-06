<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import { fetchPosts, type Post } from "@/api/posts";
import client from "@/api/client";

const router = useRouter();
const posts = ref<Post[]>([]);
const total = ref(0);
const loading = ref(true);
const search = ref("");
const currentPage = ref(1);

async function loadPosts() {
  loading.value = true;
  try {
    if (search.value) {
      const res = await fetchPosts({ page: 1, limit: 100 });
      const q = search.value.toLowerCase();
      posts.value = res.posts.filter(p => p.title.toLowerCase().includes(q));
      total.value = posts.value.length;
    } else {
      const res = await fetchPosts({ page: currentPage.value, limit: 20 });
      posts.value = res.posts;
      total.value = res.total;
    }
  } finally {
    loading.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage.value = 1; loadPosts(); }, 300);
});

async function togglePinned(post: Post) {
  await client.put(`/posts/${post.id}`, { pinned: !post.pinned });
  post.pinned = !post.pinned;
}

async function togglePublished(post: Post) {
  await client.put(`/posts/${post.id}`, { published: !post.published });
  post.published = !post.published;
}

async function deletePost(post: Post) {
  if (!confirm(`确定删除「${post.title}」？此操作不可恢复。`)) return;
  await client.delete(`/posts/${post.id}`);
  loadPosts();
}

onMounted(loadPosts);
</script>

<template>
  <div class="max-w-[1200px] mx-auto flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">📝 文章管理</h1>
      <router-link to="/admin/posts/new" class="glass-strong rounded-xl px-4 py-2.5 text-sm text-white font-medium hover:bg-white/15 transition-all">
        ✏️ 写文章
      </router-link>
    </div>

    <!-- 搜索 -->
    <input v-model="search" type="text" placeholder="🔍 搜索文章标题..." class="w-full max-w-sm glass rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted" />

    <!-- 表格 -->
    <div v-if="loading" class="glass rounded-xl p-8 text-center text-text-muted">加载中...</div>
    <div v-else-if="posts.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无文章</div>
    <div v-else class="glass rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/5 text-text-muted text-xs">
              <th class="text-left px-5 py-3 font-medium">标题</th>
              <th class="text-left px-5 py-3 font-medium hidden md:table-cell">分类</th>
              <th class="text-center px-5 py-3 font-medium hidden sm:table-cell">状态</th>
              <th class="text-center px-5 py-3 font-medium hidden lg:table-cell">浏览</th>
              <th class="text-left px-5 py-3 font-medium hidden lg:table-cell">日期</th>
              <th class="text-right px-5 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="post in posts"
              :key="post.id"
              class="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
            >
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2 min-w-0">
                  <span v-if="post.pinned" class="text-accent-pink shrink-0">📌</span>
                  <span class="text-white truncate">{{ post.title }}</span>
                </div>
              </td>
              <td class="px-5 py-3.5 hidden md:table-cell">
                <span v-if="post.category" class="text-text-muted text-xs">{{ post.category.icon }} {{ post.category.name }}</span>
                <span v-else class="text-text-muted text-xs">—</span>
              </td>
              <td class="px-5 py-3.5 text-center hidden sm:table-cell">
                <button
                  class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  :class="post.published ? 'bg-green-400/10 text-green-400' : 'bg-white/5 text-text-muted'"
                  @click="togglePublished(post)"
                >
                  {{ post.published ? "已发布" : "草稿" }}
                </button>
              </td>
              <td class="px-5 py-3.5 text-center text-text-muted hidden lg:table-cell">{{ post.viewCount }}</td>
              <td class="px-5 py-3.5 text-text-muted hidden lg:table-cell text-xs">{{ dayjs(post.createdAt).format("MM/DD HH:mm") }}</td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="text-xs text-text-muted hover:text-accent-cyan transition-colors" @click="router.push(`/admin/posts/edit/${post.id}`)">编辑</button>
                  <button class="text-xs text-text-muted hover:text-accent-pink transition-colors" @click="togglePinned(post)" :title="post.pinned ? '取消置顶' : '置顶'">{{ post.pinned ? '📌取消' : '📌' }}</button>
                  <button class="text-xs text-text-muted hover:text-red-400 transition-colors" @click="deletePost(post)">🗑</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-text-muted text-xs">共 {{ total }} 篇文章</p>
  </div>
</template>
