<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface SystemStatus {
  cpu: { usage: number; cores: number; model: string };
  memory: { used: number; total: number; usage: number };
  uptime: number;
  loadavg: number[];
  platform: string;
  nodeVersion: string;
  runningDays: number;
}

const status = ref<SystemStatus | null>(null);
const error = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

function formatBytes(b: number) {
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + " GB";
  return (b / 1048576).toFixed(1) + " MB";
}

function formatUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/system/status");
    status.value = await res.json();
    error.value = false;
  } catch {
    error.value = true;
  }
}

onMounted(() => {
  fetchStatus();
  timer = setInterval(fetchStatus, 5000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="system-info-card glass card-hover p-5 md:p-6 flex flex-col gap-4 h-full">
    <div class="flex items-center justify-between">
      <h3 class="text-white text-sm font-bold flex items-center gap-2">📊 系统信息</h3>
      <span class="text-[11px] text-accent-cyan font-medium flex items-center gap-1.5">
        <span class="w-[6px] h-[6px] rounded-full bg-green-400 animate-pulse" /> 运行中
      </span>
    </div>

    <div v-if="error" class="flex-1 flex items-center justify-center text-text-muted text-sm">获取失败</div>

    <div v-else-if="status" class="flex-1 flex flex-col gap-3">
      <!-- CPU -->
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-text-muted">CPU</span>
          <span class="text-accent-cyan">{{ status.cpu.usage }}%</span>
        </div>
        <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue transition-all duration-500" :style="{ width: `${status.cpu.usage}%` }" />
        </div>
      </div>

      <!-- 内存 -->
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-text-muted">内存</span>
          <span class="text-accent-purple">{{ status.memory.usage }}%</span>
        </div>
        <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-pink transition-all duration-500" :style="{ width: `${status.memory.usage}%` }" />
        </div>
        <p class="text-text-muted text-[11px] mt-0.5">{{ formatBytes(status.memory.used) }} / {{ formatBytes(status.memory.total) }}</p>
      </div>

      <!-- 负载 + 运行时间 -->
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-text-muted">系统负载</span>
          <p class="text-white font-mono">{{ status.loadavg[0] }}</p>
        </div>
        <div>
          <span class="text-text-muted">运行时长</span>
          <p class="text-white font-mono">{{ formatUptime(status.uptime) }}</p>
        </div>
      </div>

      <!-- 技术栈简标 -->
      <div class="flex items-center gap-3 text-xs text-text-muted mt-auto pt-2 border-t border-white/[0.04]">
        <span>CPU {{ status.cpu.cores }}核</span>
        <span>Node {{ status.nodeVersion }}</span>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-text-muted text-sm">加载中...</div>
  </div>
</template>
