<script setup lang="ts">
import { ref, onMounted } from "vue";

const props = defineProps<{
  src: string;
  alt?: string;
  class?: string;
}>();

const loaded = ref(false);
const inView = ref(false);
const imgRef = ref<HTMLDivElement>();

onMounted(() => {
  // IntersectionObserver 懒加载图片
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        inView.value = true;
        observer.disconnect();
      }
    },
    { rootMargin: "200px" }, // 提前 200px 加载
  );
  if (imgRef.value) observer.observe(imgRef.value);
});

function onLoad() {
  loaded.value = true;
}
</script>

<template>
  <div ref="imgRef" class="relative overflow-hidden bg-white/5" :class="[props.class || 'rounded-xl']">
    <!-- 骨架 -->
    <div v-if="!loaded" class="absolute inset-0 animate-pulse bg-white/[0.03]" />
    <!-- 图片 -->
    <img
      v-if="inView"
      :src="src"
      :alt="alt || ''"
      :class="[props.class || 'rounded-xl', 'w-full h-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0']"
      loading="lazy"
      @load="onLoad"
    />
  </div>
</template>
