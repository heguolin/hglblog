<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import dayjs from "dayjs";
import { fetchPosts, type Post } from "@/api/posts";
import client from "@/api/client";
import { useSEO } from "@/composables/useSEO";
import LazyImage from "@/components/common/LazyImage.vue";

const posts = ref<Post[]>([]);
const total = ref(0);
const totalPages = ref(0);
const currentPage = ref(1);
const limit = 12;
const loading = ref(true);

// 筛选
const searchQuery = ref("");
const selectedCategory = ref("");
const selectedTag = ref("");
const categories = ref<{ id: number; name: string; slug: string; icon?: string }[]>([]);
const tags = ref<{ id: number; name: string; slug: string }[]>([]);

// 自定义下拉状态
const catOpen = ref(false);
const tagOpen = ref(false);

const placeholderCover = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect fill='%231a1a2e' width='800' height='450'/%3E%3Ctext fill='%23ffffff20' x='400' y='235' text-anchor='middle' font-size='48'%3E📝%3C/text%3E%3C/svg%3E";

async function loadPosts() {
  loading.value = true;
  try {
    const params: Record<string, unknown> = { page: currentPage.value, limit };
    if (selectedCategory.value) params.category = selectedCategory.value;
    if (selectedTag.value) params.tag = selectedTag.value;
    const res = await fetchPosts(params as never);
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      posts.value = res.posts.filter((p) => p.title.toLowerCase().includes(q));
    } else {
      posts.value = res.posts;
    }
    total.value = res.total;
    totalPages.value = res.totalPages;
  } finally {
    loading.value = false;
  }
}

async function loadFilters() {
  try {
    const [catRes, tagRes] = await Promise.all([client.get("/categories"), client.get("/tags")]);
    categories.value = catRes.data;
    tags.value = tagRes.data;
  } catch { /* ignore */ }
}

let searchTimer: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage.value = 1; loadPosts(); }, 300);
});

watch([selectedCategory, selectedTag], () => {
  currentPage.value = 1;
  loadPosts();
  catOpen.value = false;
  tagOpen.value = false;
});

function selectCategory(slug: string) {
  selectedCategory.value = selectedCategory.value === slug ? "" : slug;
}
function selectTag(slug: string) {
  selectedTag.value = selectedTag.value === slug ? "" : slug;
}
function goPage(p: number) {
  currentPage.value = p;
  loadPosts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 点击外部关闭下拉
function clickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest(".cat-dropdown")) catOpen.value = false;
  if (!target.closest(".tag-dropdown")) tagOpen.value = false;
}

onMounted(() => {
  useSEO("Archive");
  loadFilters();
  loadPosts();
  document.addEventListener("click", clickOutside);
});
</script>

<template>
  <div class="page-container">
    <!-- ====== Hero 头图区 ====== -->
    <section class="mb-12 md:mb-16">
      <p class="page-label">Archive</p>
      <h1 class="text-3xl md:text-4xl font-bold text-white">📦 文章归档</h1>
      <p class="text-text-muted mt-2">共 {{ total }} 篇文章</p>

      <!-- 筛选栏 -->
      <div class="flex flex-col md:flex-row gap-4 mt-8">
        <!-- 搜索框 -->
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 搜索文章标题..."
            class="w-full glass rounded-xl px-4 py-3 text-white text-sm placeholder:text-text-muted outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors"
          />
        </div>

        <!-- ====== 改动一：毛玻璃下拉 ====== -->
        <!-- 分类下拉 -->
        <div class="cat-dropdown relative shrink-0">
          <button
            class="glass rounded-xl px-5 py-3 text-white text-sm w-40 flex items-center justify-between border border-white/10 hover:border-white/20 transition-colors"
            @click.stop="catOpen = !catOpen; tagOpen = false"
          >
            <span :class="selectedCategory ? 'text-white' : 'text-text-muted'">
              {{ categories.find(c => c.slug === selectedCategory)?.name || '全部分类' }}
            </span>
            <span class="text-text-muted text-xs transition-transform duration-200" :class="catOpen && 'rotate-180'">▼</span>
          </button>
          <Transition name="dropdown">
            <div
              v-if="catOpen"
              class="absolute top-full mt-2 left-0 right-0 glass rounded-xl py-1 z-20 border border-white/10 shadow-xl shadow-black/30"
            >
              <button class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors" :class="!selectedCategory && 'text-accent-cyan bg-white/[0.04]'" @click.stop="selectedCategory = ''; catOpen = false">
                全部分类
              </button>
              <button
                v-for="cat in categories" :key="cat.id"
                class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors"
                :class="selectedCategory === cat.slug && 'text-accent-cyan bg-white/[0.04]'"
                @click.stop="selectCategory(cat.slug)"
              >
                {{ cat.icon }} {{ cat.name }}
              </button>
            </div>
          </Transition>
        </div>

        <!-- 标签下拉 -->
        <div class="tag-dropdown relative shrink-0">
          <button
            class="glass rounded-xl px-5 py-3 text-white text-sm w-40 flex items-center justify-between border border-white/10 hover:border-white/20 transition-colors"
            @click.stop="tagOpen = !tagOpen; catOpen = false"
          >
            <span :class="selectedTag ? 'text-white' : 'text-text-muted'">
              {{ tags.find(t => t.slug === selectedTag)?.name ? '#' + tags.find(t => t.slug === selectedTag)?.name : '全部标签' }}
            </span>
            <span class="text-text-muted text-xs transition-transform duration-200" :class="tagOpen && 'rotate-180'">▼</span>
          </button>
          <Transition name="dropdown">
            <div
              v-if="tagOpen"
              class="absolute top-full mt-2 left-0 right-0 glass rounded-xl py-1 z-20 border border-white/10 shadow-xl shadow-black/30 max-h-64 overflow-y-auto"
            >
              <button class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors" :class="!selectedTag && 'text-accent-cyan bg-white/[0.04]'" @click.stop="selectedTag = ''; tagOpen = false">
                全部标签
              </button>
              <button
                v-for="tag in tags" :key="tag.id"
                class="w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors"
                :class="selectedTag === tag.slug && 'text-accent-cyan bg-white/[0.04]'"
                @click.stop="selectTag(tag.slug)"
              >
                #{{ tag.name }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- ====== 改动二：Hero 与列表之间 48~64px 间距（通过 section mb-12 md:mb-16） ====== -->

    <!-- 加载中 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="i in 6" :key="i" class="glass rounded-xl h-48 animate-pulse p-6">
        <div class="h-3 w-16 bg-white/10 rounded mb-3" />
        <div class="h-5 w-full bg-white/10 rounded mb-2" />
        <div class="h-4 w-3/4 bg-white/10 rounded" />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="posts.length === 0" class="text-center py-20">
      <p class="text-5xl mb-4">📭</p>
      <p class="text-text-secondary">没有找到匹配的文章</p>
    </div>

    <!-- ====== 文章网格 ====== -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <!-- ====== 改动三：每张卡片顶部加封面图 ====== -->
      <router-link
        v-for="post in posts"
        :key="post.id"
        :to="`/posts/${post.slug}`"
        class="glass card-hover flex flex-col group"
      >
        <!-- 封面图区 -->
        <div class="relative aspect-video overflow-hidden">
          <LazyImage
            :src="post.coverImage || placeholderCover"
            :alt="post.title"
            :thumb-width="400"
            class="rounded-xl"
          />
          <!-- 浮在封面上的徽章 -->
          <div class="absolute top-3 left-3 flex items-center gap-2">
            <span v-if="post.pinned" class="glass rounded-full px-2.5 py-0.5 text-xs text-accent-pink backdrop-blur-md">
              📌 置顶
            </span>
            <span v-if="post.category" class="glass rounded-full px-2.5 py-0.5 text-xs text-white/90 backdrop-blur-md">
              {{ post.category.icon }} {{ post.category.name }}
            </span>
          </div>
        </div>

        <!-- 正文区 -->
        <div class="p-5 flex flex-col gap-3 flex-1">
          <!-- 日期 -->
          <p class="text-xs text-text-muted">{{ dayjs(post.createdAt).format("YYYY/MM/DD") }}</p>

          <!-- 标题 -->
          <h3 class="text-white font-bold leading-snug group-hover:text-accent-cyan transition-colors line-clamp-2">
            {{ post.title }}
          </h3>

          <!-- 摘要 -->
          <p class="text-text-secondary text-[13px] leading-relaxed line-clamp-3">
            {{ post.excerpt || post.content.replace(/[#*`\[\]()>!\-_~\n\r]/g, "").slice(0, 120) }}
          </p>

          <!-- 底部信息 -->
          <div class="flex items-center gap-4 mt-auto text-xs text-text-muted">
            <span v-if="post.readingTime">📖 {{ post.readingTime }} 分钟</span>
            <span>👀 {{ post.viewCount }}</span>
          </div>

          <!-- 标签 -->
          <div class="flex gap-1.5 flex-wrap">
            <span
              v-for="tag in post.tags"
              :key="tag.id"
              class="px-2 py-[2px] text-xs rounded-full bg-white/5 border border-white/10 text-text-muted"
            >
              #{{ tag.name }}
            </span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-10">
      <button :disabled="currentPage === 1" class="glass rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" @click="goPage(currentPage - 1)">
        ← 上一页
      </button>
      <div v-for="p in totalPages" :key="p">
        <button
          v-if="p <= 5 || p === totalPages || Math.abs(p - currentPage) <= 1"
          class="w-9 h-9 rounded-lg text-sm font-medium transition-all"
          :class="p === currentPage ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30' : 'text-text-secondary hover:text-white hover:bg-white/5'"
          @click="goPage(p)"
        >
          {{ p }}
        </button>
        <span v-else-if="p === 6 && totalPages > 6" class="text-text-muted">…</span>
      </div>
      <button :disabled="currentPage === totalPages" class="glass rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors" @click="goPage(currentPage + 1)">
        下一页 →
      </button>
    </div>
  </div>
</template>

<style>
/* 下拉动画 */
.dropdown-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.dropdown-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-enter-from { opacity: 0; transform: translateY(-8px); }
.dropdown-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>
