<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MdEditor } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import client from "@/api/client";
import { uploadImage, isValidImageUrl, getUploadErrorMessage } from "@/api/upload";

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const error = ref("");
const success = ref("");

// 表单
const title = ref("");
const slug = ref("");
const content = ref("");
const excerpt = ref("");
const coverImage = ref("");
const published = ref(false);
const pinned = ref(false);
const categoryId = ref<number | null>(null);
const selectedTagIds = ref<number[]>([]);

// 选项
const categories = ref<{ id: number; name: string; icon: string }[]>([]);
const tags = ref<{ id: number; name: string }[]>([]);

function autoSlug() {
  if (!slug.value && title.value) {
    slug.value = title.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9一-鿿-]/g, "").slice(0, 80);
  }
}

function toggleTag(id: number) {
  const idx = selectedTagIds.value.indexOf(id);
  if (idx >= 0) selectedTagIds.value.splice(idx, 1);
  else selectedTagIds.value.push(id);
}

const uploading = ref(false);

async function handleCoverUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  error.value = "";
  try {
    const result = await uploadImage(file);
    coverImage.value = result.url;
  } catch (err) {
    error.value = getUploadErrorMessage(err);
  } finally {
    uploading.value = false;
  }
}

async function handleCoverUrl(url: string) {
  if (!url.trim()) return;
  error.value = "";
  if (!isValidImageUrl(url.trim())) {
    error.value = "请输入合法的图片 URL";
    return;
  }
  coverImage.value = url.trim();
}

async function loadPost() {
  if (!isEdit.value) return;
  try {
    const id = Number(route.params.id);
    const { data } = await client.get(`/posts/${id}`);
    const post = data;
    title.value = post.title;
    slug.value = post.slug;
    content.value = post.content;
    excerpt.value = post.excerpt ?? "";
    coverImage.value = post.coverImage ?? "";
    published.value = post.published;
    pinned.value = post.pinned;
    categoryId.value = post.categoryId;
    selectedTagIds.value = post.tags?.map((t: { id: number }) => t.id) ?? [];
  } catch {
    error.value = "加载文章失败";
  }
}

async function handleSave(publish: boolean) {
  error.value = "";
  success.value = "";
  if (!title.value.trim() || !slug.value.trim() || !content.value.trim()) {
    error.value = "标题、slug 和内容为必填";
    return;
  }
  saving.value = true;
  try {
    const payload = {
      title: title.value.trim(),
      slug: slug.value.trim(),
      content: content.value,
      excerpt: excerpt.value || undefined,
      coverImage: coverImage.value || undefined,
      published: publish,
      pinned: pinned.value,
      categoryId: categoryId.value ?? undefined,
      tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
    };

    if (isEdit.value) {
      await client.put(`/posts/${route.params.id}`, payload);
    } else {
      await client.post("/posts", payload);
    }
    success.value = publish ? "文章已发布！" : "草稿已保存！";
    setTimeout(() => router.push("/admin/posts"), 800);
  } catch {
    error.value = "保存失败";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const [catRes, tagRes] = await Promise.all([
    client.get("/categories"),
    client.get("/tags"),
  ]);
  categories.value = catRes.data;
  tags.value = tagRes.data;
  if (isEdit.value) await loadPost();
});
</script>

<template>
  <div class="max-w-[1400px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">{{ isEdit ? '✏️ 编辑文章' : '✏️ 新建文章' }}</h1>
      <router-link to="/admin/posts" class="text-text-muted hover:text-white text-sm transition-colors">← 返回列表</router-link>
    </div>

    <p v-if="error" class="text-accent-pink text-sm mb-4">{{ error }}</p>
    <p v-if="success" class="text-green-400 text-sm mb-4">{{ success }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <!-- 左列：编辑器 -->
      <div class="space-y-4 min-w-0">
        <input v-model="title" @input="autoSlug" type="text" placeholder="文章标题" class="w-full glass rounded-xl px-4 py-3 text-white text-lg font-bold outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted" />
        <input v-model="slug" type="text" placeholder="url-slug" class="w-full glass rounded-xl px-4 py-3 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted font-mono" />

        <!-- md-editor-v3 Markdown 编辑器 -->
        <MdEditor
          v-model="content"
          language="en-US"
          :toolbars="['bold', 'italic', 'strikeThrough', 0, 'title', 1, 'quote', 'unorderedList', 'orderedList', 'code', 'codeRow', 'link', 'image', 'table', 0, 'preview', 'fullscreen']"
          :preview-theme="'github-dark'"
          class="rounded-xl overflow-hidden border border-white/10"
          style="min-height:500px"
        />
      </div>

      <!-- 右列：设置 -->
      <div class="space-y-4">
        <div class="flex gap-2">
          <button :disabled="saving" class="flex-1 glass-strong rounded-xl py-2.5 text-sm text-white font-medium hover:bg-white/15 transition-all disabled:opacity-50" @click="handleSave(true)">{{ saving ? '...' : '📢 发布' }}</button>
          <button :disabled="saving" class="flex-1 glass rounded-xl py-2.5 text-sm text-text-secondary hover:text-white transition-all disabled:opacity-50" @click="handleSave(false)">{{ saving ? '...' : '💾 草稿' }}</button>
        </div>

        <div class="glass rounded-xl p-4">
          <label class="text-white text-xs font-bold mb-2 block">🖼 封面图</label>
          <!-- 粘贴 URL -->
          <div class="flex gap-2 mb-2">
            <input v-model="coverImage" type="text" placeholder="粘贴图片 URL 或本地上传" class="flex-1 glass rounded-lg px-3 py-2 text-white text-xs outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted" />
            <button :disabled="!coverImage || uploading" class="glass rounded-lg px-3 py-2 text-xs text-text-secondary hover:text-white disabled:opacity-30 transition-colors shrink-0" @click="handleCoverUrl(coverImage)">🔗 确认</button>
          </div>
          <!-- 本地上传 -->
          <label class="block glass rounded-lg px-3 py-2 text-xs text-text-secondary text-center cursor-pointer hover:text-white transition-colors">
            {{ uploading ? '⏳ 上传中...' : '📁 本地上传' }}
            <input type="file" accept="image/*" class="hidden" @change="handleCoverUpload" :disabled="uploading" />
          </label>
          <div v-if="coverImage" class="mt-2 rounded-lg overflow-hidden bg-white/5 aspect-video">
            <img :src="coverImage" alt="封面预览" class="w-full h-full object-cover" @error="error = '图片加载失败，请检查 URL'" />
          </div>
        </div>

        <div class="glass rounded-xl p-4">
          <label class="text-white text-xs font-bold mb-2 block">📂 分类</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="cat in categories" :key="cat.id" class="px-3 py-1.5 rounded-lg text-xs transition-colors" :class="categoryId === cat.id ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30' : 'glass text-text-secondary hover:text-white'" @click="categoryId = categoryId === cat.id ? null : cat.id">{{ cat.icon }} {{ cat.name }}</button>
          </div>
        </div>

        <div class="glass rounded-xl p-4">
          <label class="text-white text-xs font-bold mb-2 block">🏷 标签</label>
          <div class="flex flex-wrap gap-2">
            <button v-for="tag in tags" :key="tag.id" class="px-3 py-1.5 rounded-lg text-xs transition-colors" :class="selectedTagIds.includes(tag.id) ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30' : 'glass text-text-secondary hover:text-white'" @click="toggleTag(tag.id)">#{{ tag.name }}</button>
          </div>
        </div>

        <div class="glass rounded-xl p-4">
          <label class="text-white text-xs font-bold mb-2 block">📄 摘要</label>
          <textarea v-model="excerpt" rows="3" placeholder="可选，不填则自动截取正文前段" class="w-full glass rounded-lg px-3 py-2 text-white text-xs outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted resize-none" />
        </div>

        <div class="glass rounded-xl p-4 flex items-center justify-between">
          <span class="text-white text-xs font-bold">📌 置顶</span>
          <button class="w-10 h-5 rounded-full transition-colors relative" :class="pinned ? 'bg-accent-cyan' : 'bg-white/10'" @click="pinned = !pinned">
            <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="pinned ? 'left-5' : 'left-0.5'" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
