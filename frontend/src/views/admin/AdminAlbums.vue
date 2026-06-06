<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { fetchAlbums, fetchAlbumById, type Album, type Photo } from "@/api/albums";
import { uploadImage, isValidImageUrl, getUploadErrorMessage } from "@/api/upload";
import client from "@/api/client";

const albums = ref<Album[]>([]);
const loading = ref(true);

// 新建/编辑相册弹窗
const showAlbumForm = ref(false);
const editingAlbum = ref<Album | null>(null);
const albumForm = ref({ name: "", description: "", coverImage: "" });
const albumSaving = ref(false);

// 照片管理（选中某个相册进入）
const selectedAlbum = ref<(Album & { photos: Photo[] }) | null>(null);
const photoTitle = ref("");
const photoUrl = ref("");
const photoUploading = ref(false);
const photoError = ref("");

async function loadAlbums() {
  loading.value = true;
  try {
    albums.value = await fetchAlbums();
  } finally {
    loading.value = false;
  }
}

function openCreateAlbum() {
  editingAlbum.value = null;
  albumForm.value = { name: "", description: "", coverImage: "" };
  showAlbumForm.value = true;
}

async function saveAlbum() {
  if (!albumForm.value.name.trim()) return;
  albumSaving.value = true;
  try {
    if (editingAlbum.value) {
      await client.put(`/albums/${editingAlbum.value.id}`, albumForm.value);
    } else {
      await client.post("/albums", { ...albumForm.value, date: new Date().toISOString() });
    }
    showAlbumForm.value = false;
    loadAlbums();
  } finally {
    albumSaving.value = false;
  }
}

async function deleteAlbum(id: number) {
  if (!confirm("确定删除此相册及其所有照片？")) return;
  await client.delete(`/albums/${id}`);
  if (selectedAlbum.value?.id === id) selectedAlbum.value = null;
  loadAlbums();
}

async function openAlbum(id: number) {
  selectedAlbum.value = await fetchAlbumById(id);
}

async function handlePhotoUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !selectedAlbum.value) return;
  photoUploading.value = true;
  photoError.value = "";
  try {
    const result = await uploadImage(file);
    if (result.moderationStatus === "NEED_REVIEW") {
      alert("图片已提交，等待审核通过后展示");
    }
    await client.post("/photos", {
      url: result.url,
      thumbnail: result.thumbUrl ?? result.url,
      title: photoTitle.value || undefined,
      albumId: selectedAlbum.value.id,
    });
    photoTitle.value = "";
    photoUrl.value = "";
    selectedAlbum.value = await fetchAlbumById(selectedAlbum.value.id);
  } catch (err) {
    photoError.value = getUploadErrorMessage(err);
  } finally {
    photoUploading.value = false;
  }
}

async function handlePhotoUrl() {
  if (!photoUrl.value.trim() || !selectedAlbum.value) return;
  photoError.value = "";
  const url = photoUrl.value.trim();
  if (!isValidImageUrl(url)) {
    photoError.value = "请输入合法的图片 URL";
    return;
  }
  try {
    await client.post("/photos", {
      url,
      thumbnail: url,
      title: photoTitle.value || undefined,
      albumId: selectedAlbum.value.id,
    });
    photoTitle.value = "";
    photoUrl.value = "";
    selectedAlbum.value = await fetchAlbumById(selectedAlbum.value.id);
  } catch {
    photoError.value = "保存失败";
  }
}

async function deletePhoto(photoId: number) {
  if (!confirm("确定删除此照片？")) return;
  await client.delete(`/photos/${photoId}`);
  if (selectedAlbum.value) {
    selectedAlbum.value = await fetchAlbumById(selectedAlbum.value.id);
  }
}

onMounted(loadAlbums);
</script>

<template>
  <div class="max-w-[1200px] mx-auto flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">📷 相册管理</h1>
      <button class="glass-strong rounded-xl px-4 py-2.5 text-sm text-white font-medium hover:bg-white/15 transition-all" @click="openCreateAlbum">＋ 新建相册</button>
    </div>

    <!-- 面包屑 -->
    <div v-if="selectedAlbum" class="flex items-center gap-2 text-sm">
      <button class="text-text-muted hover:text-white transition-colors" @click="selectedAlbum = null">← 返回相册列表</button>
      <span class="text-text-muted">/</span>
      <span class="text-white font-medium">{{ selectedAlbum.name }}</span>
      <span class="text-text-muted text-xs">({{ selectedAlbum.photos.length }} 张)</span>
    </div>

    <!-- 相册列表 -->
    <div v-if="!selectedAlbum">
      <div v-if="loading" class="glass rounded-xl p-8 text-center text-text-muted">加载中...</div>
      <div v-else-if="albums.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无相册</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div v-for="a in albums" :key="a.id" class="glass rounded-xl p-5 flex gap-4 cursor-pointer hover:bg-white/[0.04] transition-colors" @click="openAlbum(a.id)">
          <div class="w-20 h-20 rounded-lg overflow-hidden bg-white/5 shrink-0">
            <img v-if="a.coverImage" :src="a.coverImage" :alt="a.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-bold text-sm">{{ a.name }}</h3>
            <p class="text-text-secondary text-xs mt-1.5 line-clamp-2">{{ a.description }}</p>
            <div class="flex items-center gap-3 mt-2 text-xs text-text-muted">
              <span>{{ dayjs(a.date).format("YYYY/MM/DD") }}</span>
              <span>📸 {{ a.photoCount ?? 0 }}</span>
            </div>
          </div>
          <button class="shrink-0 text-text-muted hover:text-red-400 text-sm" @click.stop="deleteAlbum(a.id)">🗑</button>
        </div>
      </div>
    </div>

    <!-- 照片管理 -->
    <div v-else class="flex flex-col gap-5">
      <!-- 上传区 -->
      <div class="glass rounded-xl p-5 space-y-4">
        <div class="flex gap-2">
          <input v-model="photoUrl" type="text" placeholder="粘贴图片 URL（如 img.hgl123.icu/i/xxx.webp）" class="flex-1 glass rounded-lg px-3 py-2.5 text-white text-xs outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
          <button :disabled="!photoUrl" class="glass rounded-lg px-4 py-2.5 text-xs text-text-secondary hover:text-white disabled:opacity-30 transition-colors shrink-0" @click="handlePhotoUrl">🔗 添加</button>
        </div>
        <div class="flex items-center gap-3">
          <input v-model="photoTitle" type="text" placeholder="照片标题（可选）" class="flex-1 glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
          <label class="glass-strong rounded-lg px-4 py-2.5 text-sm text-white cursor-pointer hover:bg-white/15 transition-colors shrink-0">
            {{ photoUploading ? '⏳...' : '📁 上传' }}
            <input type="file" accept="image/*" class="hidden" @change="handlePhotoUpload" :disabled="photoUploading" />
          </label>
        </div>
        <p v-if="photoError" class="text-accent-pink text-xs">{{ photoError }}</p>
      </div>

      <!-- 照片网格 -->
      <div v-if="selectedAlbum.photos.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无照片</div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="p in selectedAlbum.photos" :key="p.id" class="glass rounded-xl overflow-hidden group relative aspect-square">
          <img :src="p.thumbnail || p.url" :alt="p.title || ''" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
            <div class="w-full flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-white text-xs truncate">{{ p.title || '无标题' }}</span>
              <button class="text-white/80 hover:text-red-400 text-xs shrink-0" @click="deletePhoto(p.id)">🗑</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建/编辑相册弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAlbumForm" class="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" @click.self="showAlbumForm = false">
          <div class="glass-strong rounded-2xl p-6 w-full max-w-md">
            <h2 class="text-white text-lg font-bold mb-4">{{ editingAlbum ? '✏️ 编辑' : '📷 新建' }}相册</h2>
            <div class="space-y-4">
              <input v-model="albumForm.name" type="text" placeholder="相册名称" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              <textarea v-model="albumForm.description" rows="2" placeholder="描述（可选）" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted resize-none" />
              <input v-model="albumForm.coverImage" type="text" placeholder="封面图 URL（可选）" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              <div class="flex gap-2">
                <button :disabled="albumSaving" class="flex-1 glass-strong rounded-xl py-2.5 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50" @click="saveAlbum">{{ albumSaving ? '...' : '保存' }}</button>
                <button class="flex-1 glass rounded-xl py-2.5 text-sm text-text-secondary hover:text-white" @click="showAlbumForm = false">取消</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
