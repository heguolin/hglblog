<script setup lang="ts">
const emojis = [
  { emoji: "😶", label: "沉默", floatDuration: 4.5, floatDelay: 0 },
  { emoji: "🌸", label: "樱花", floatDuration: 5.5, floatDelay: 1.2 },
  { emoji: "✨", label: "星光", floatDuration: 4, floatDelay: 2.4 },
];
</script>

<template>
  <div class="emoji-widget glass card-hover p-5 md:p-6 flex items-center justify-center gap-4 h-full">
    <span
      v-for="item in emojis"
      :key="item.label"
      class="select-none inline-block will-change-transform"
      :style="{
        fontSize: '2rem',
        animation: `emoji-float ${item.floatDuration}s ease-in-out ${item.floatDelay}s infinite`,
      }"
      :title="item.label"
    >
      {{ item.emoji }}
    </span>
  </div>
</template>

<style scoped>
@keyframes emoji-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50%      { transform: translateY(-10px) scale(1.12); }
}
</style>
