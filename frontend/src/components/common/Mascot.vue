<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import * as PIXI from "pixi.js";
// 只走 cubism4 子入口：该 bundle 不含 Cubism2 代码（无 PhysicsHair / SRC_TO_X），
// 因此不会触发 "Cannot read properties of undefined (reading 'SRC_TO_X')"。
// 它在模块求值时仅检查 window.Live2DCubismCore（由 index.html 的 script 标签提供）。
import { Live2DModel } from "pixi-live2d-display/cubism4";
import axios from "axios";

// pixi-live2d-display 需要全局 PIXI（PIXI v6 有 EventEmitter）
(window as any).PIXI = PIXI;

// ====== 状态 ======
const containerRef = ref<HTMLDivElement>();
const bubbleOpen = ref(false);
const bubbleText = ref("");
const chatOpen = ref(false);
const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
const inputText = ref("");
const sending = ref(false);
let bubbleTimer: ReturnType<typeof setInterval> | null = null;
let app: PIXI.Application | null = null;

// ====== 冒泡语录 ======
const BUBBLE_QUOTES = [
  "又在写代码呀~",
  "今天心情怎么样？",
  "要喝水哦，别忘了休息",
  "我在看星星呢…你也要看吗？",
  "这个 bug 一定能解决的！",
  "嘿嘿，陪着你真开心",
  "火萤的光芒虽然微弱…但我会一直亮着",
  "累了吗？我给你讲个匹诺康尼的故事吧",
  "吃完橡木蛋糕卷再写代码吧~",
  "开拓者…我一直在这里哦",
];

// ====== Live2D 初始化 ======
onMounted(async () => {
  await nextTick();
  if (!containerRef.value) return;

  app = new PIXI.Application({
    width: 220,
    height: 220,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  containerRef.value.appendChild(app.view as HTMLCanvasElement);

  try {
    const model = await Live2DModel.from("/live2d/cat.model3.json");

    const scale = Math.min(
      app.screen.width / model.width,
      app.screen.height / model.height,
    ) * 0.6;
    model.scale.set(scale);
    model.x = app.screen.width / 2;
    model.y = app.screen.height / 2 + 10;
    model.anchor.set(0.5, 0.5);

    app.stage.addChild(model as any);

    // 让 Live2D 模型响应点击事件
    model.interactive = true;
    model.cursor = "pointer";

    // 点击打开聊天
    model.on("hit", () => {
      chatOpen.value = !chatOpen.value;
      if (chatOpen.value) {
        bubbleOpen.value = false;
        if (messages.value.length === 0) {
          messages.value.push({
            role: "assistant",
            content: "嗨…又见面啦。叫我「流萤」就好。今天想聊什么？",
          });
        }
      }
    });

    // 默认表情
    (model as any).expression = 0;
  } catch (err) {
    console.warn("Live2D 模型加载失败:", err);
    // CSS 降级角色自动显示（始终在模板中作为背景）
  }

  // 首次冒泡
  setTimeout(() => {
    bubbleText.value = BUBBLE_QUOTES[Math.floor(Math.random() * BUBBLE_QUOTES.length)];
    bubbleOpen.value = true;
    setTimeout(() => { bubbleOpen.value = false; }, 6000);
  }, 5000);

  // 定时冒泡
  bubbleTimer = setInterval(() => {
    bubbleText.value = BUBBLE_QUOTES[Math.floor(Math.random() * BUBBLE_QUOTES.length)];
    bubbleOpen.value = true;
    setTimeout(() => { bubbleOpen.value = false; }, 6000);
  }, 30000 + Math.random() * 30000);
});

onUnmounted(() => {
  if (bubbleTimer) clearInterval(bubbleTimer);
  if (app) app.destroy(true);
});

// ====== 聊天 ======
async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || sending.value) return;
  messages.value.push({ role: "user", content: text });
  inputText.value = "";
  sending.value = true;

  try {
    const { data } = await axios.post("/api/mascot/chat", {
      messages: messages.value.map((m) => ({ role: m.role, content: m.content })),
    });
    const reply = data.choices?.[0]?.message?.content || "唔…我不知道该说什么。";
    messages.value.push({ role: "assistant", content: reply });
  } catch {
    messages.value.push({ role: "assistant", content: "唔…连接好像出了点问题。稍等一下再试试好吗？" });
  } finally {
    sending.value = false;
  }
}

function onChatKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  if (e.key === "Escape") chatOpen.value = false;
}
</script>

<template>
  <div class="fixed bottom-0 left-4 z-40 select-none">
    <!-- 冒泡 -->
    <Transition name="bubble">
      <div
        v-if="bubbleOpen"
        class="glass rounded-2xl px-4 py-2.5 mb-3 max-w-[220px] text-white text-[13px] leading-relaxed shadow-lg shadow-black/20 relative"
      >
        {{ bubbleText }}
        <div class="absolute -bottom-2 left-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white/10" />
      </div>
    </Transition>

    <!-- Live2D 容器 / CSS 降级（点击兜底：Live2D hit 事件不可靠时也能打开聊天） -->
    <div ref="containerRef" class="relative w-[220px] h-[220px] cursor-pointer hover:scale-105 transition-transform duration-300 rounded-full" title="点击和流萤聊天" @click="chatOpen = !chatOpen; bubbleOpen = false; if (chatOpen && messages.length === 0) messages.push({ role: 'assistant', content: '嗨…又见面啦。叫我「流萤」就好。今天想聊什么？' })">
      <!-- Live2D canvas 会覆盖在这里 -->
      <!-- CSS 降级角色（始终在底层，Live2D canvas 覆盖在上面） -->
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-[140px] h-[140px] rounded-full bg-gradient-to-b from-accent-purple/20 via-accent-pink/15 to-accent-blue/10 border border-white/10 animate-pulse flex items-center justify-center text-5xl">
          🌸
        </div>
      </div>
    </div>

    <!-- ====== 聊天对话框 ====== -->
    <Transition name="chat">
      <div
        v-if="chatOpen"
        class="absolute bottom-[230px] left-0 w-[340px] rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/40 border border-white/10"
        style="height:420px;background:rgba(15,12,41,0.94)"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-pink" />
            </span>
            <span class="text-white text-sm font-bold">和流萤聊天</span>
          </div>
          <button class="text-white/60 hover:text-white text-lg leading-none" @click="chatOpen = false">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div v-for="(msg, i) in messages" :key="i" :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
            <div :class="['max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              msg.role === 'user' ? 'bg-accent-pink/20 text-white rounded-br-md' : 'bg-white/8 text-white/80 rounded-bl-md']">
              {{ msg.content }}
            </div>
          </div>
          <div v-if="sending" class="flex justify-start">
            <div class="bg-white/8 rounded-2xl rounded-bl-md px-4 py-3">
              <span class="inline-flex gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style="animation-delay:0ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style="animation-delay:150ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style="animation-delay:300ms" />
              </span>
            </div>
          </div>
        </div>
        <div class="px-3 py-3 border-t border-white/10 shrink-0 flex gap-2" style="background:rgba(15,12,41,1)">
          <input
            v-model="inputText"
            type="text"
            placeholder="说点什么..."
            class="flex-1 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 outline-none border border-white/10 focus:border-accent-pink/50 transition-colors"
            style="background:rgba(255,255,255,0.06)"
            @keydown="onChatKeydown"
            :disabled="sending"
          />
          <button
            class="rounded-xl px-4 py-2.5 text-accent-pink text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40 shrink-0 border border-accent-pink/30"
            style="background:rgba(255,107,157,0.1)"
            @click="sendMessage"
            :disabled="sending || !inputText.trim()"
          >发送</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bubble-enter-active, .bubble-leave-active { transition: all 0.4s ease; }
.bubble-enter-from, .bubble-leave-to { opacity: 0; transform: translateY(8px); }
.chat-enter-active { transition: all 0.3s ease; }
.chat-leave-active { transition: all 0.2s ease; }
.chat-enter-from, .chat-leave-to { opacity: 0; transform: translateY(12px) scale(0.95); }
</style>
