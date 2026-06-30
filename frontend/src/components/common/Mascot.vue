<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { Application } from "pixi.js";
import { Live2DModel, InternalModel } from "pixi-live2d-display";
import axios from "axios";

// ====== 状态 ======
const containerRef = ref<HTMLDivElement>();
const bubbleOpen = ref(false);
const bubbleText = ref("");
const chatOpen = ref(false);
const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
const inputText = ref("");
const sending = ref(false);
let bubbleTimer: ReturnType<typeof setInterval> | null = null;
let app: Application | null = null;
let model: Live2DModel<InternalModel> | null = null;

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

  app = new Application({
    width: 200,
    height: 200,
    backgroundAlpha: 0,
    antialias: true,
  });

  containerRef.value.appendChild(app.view as unknown as Node);

  try {
    model = await Live2DModel.from("/live2d/cat.model3.json");

    const scale = Math.min(
      app.screen.width / model.width,
      app.screen.height / model.height,
    ) * 0.85;

    model.scale.set(scale);
    model.x = app.screen.width / 2;
    model.y = app.screen.height / 2;
    model.anchor.set(0.5, 0.5);

    app.stage.addChild(model as any);

    // 交互
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

    // 表情和动作
    (model as any).expression = 0;
    // @ts-ignore - internal API
    const mgr = model.internalModel?.motionManager;
    if (mgr) {
      const keys = Object.keys(mgr.groups || {});
      if (keys.length > 0) {
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        model.motion(randKey);
      }
    }
  } catch (err) {
    console.warn("Live2D 模型加载失败:", err);
  }

  // 冒泡定时器: 30-60 秒随机
  bubbleTimer = setInterval(
    () => {
      bubbleText.value = BUBBLE_QUOTES[Math.floor(Math.random() * BUBBLE_QUOTES.length)];
      bubbleOpen.value = true;
      setTimeout(() => { bubbleOpen.value = false; }, 6000);
    },
    30000 + Math.random() * 30000,
  );
  // 首次 5 秒后冒泡
  setTimeout(() => {
    bubbleText.value = BUBBLE_QUOTES[Math.floor(Math.random() * BUBBLE_QUOTES.length)];
    bubbleOpen.value = true;
    setTimeout(() => { bubbleOpen.value = false; }, 6000);
  }, 5000);
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

    const reply = data.choices?.[0]?.message?.content || "嗯…我不知道该说什么。";
    messages.value.push({ role: "assistant", content: reply });

    // 表情切换
    if (model) {
      const lower = reply.toLowerCase();
      if (lower.includes("开心") || lower.includes("嘿嘿") || lower.includes("喜欢")) {
        (model as any).expression = 4;
      } else if (lower.includes("难过") || lower.includes("对不起") || lower.includes("抱歉")) {
        (model as any).expression = 3;
      } else if (lower.includes("厉害") || lower.includes("好棒") || lower.includes("真")) {
        (model as any).expression = 1;
      } else {
        (model as any).expression = 0;
      }
    }
  } catch {
    messages.value.push({ role: "assistant", content: "唔…连接好像出了点问题。稍等一下再试试好吗？" });
  } finally {
    sending.value = false;
  }
}

function onChatKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
  if (e.key === "Escape") {
    chatOpen.value = false;
  }
}
</script>

<template>
  <div class="fixed bottom-0 left-4 z-40 select-none">
    <!-- 冒泡 -->
    <Transition name="bubble">
      <div
        v-if="bubbleOpen"
        class="glass rounded-2xl px-4 py-2.5 mb-3 max-w-[220px] text-white text-[13px] leading-relaxed shadow-lg shadow-black/20 relative cursor-default animate-fade-in"
      >
        {{ bubbleText }}
        <div class="absolute -bottom-2 left-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white/10" />
      </div>
    </Transition>

    <!-- Live2D 容器 -->
    <div
      ref="containerRef"
      class="w-[200px] h-[200px] cursor-pointer hover:scale-105 transition-transform duration-300"
      title="点击和流萤聊天"
    />

    <!-- ====== 聊天对话框 ====== -->
    <Transition name="chat">
      <div
        v-if="chatOpen"
        class="absolute bottom-[210px] left-0 w-[340px] glass-strong rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/40 border border-white/10"
        :style="{ height: '420px' }"
      >
        <!-- 标题栏 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-lg">💬</span>
            <span class="text-white text-sm font-bold">和流萤聊天</span>
          </div>
          <button
            class="text-text-muted hover:text-white transition-colors text-lg leading-none"
            @click="chatOpen = false"
          >✕</button>
        </div>

        <!-- 消息列表 -->
        <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
          >
            <div
              :class="[
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-accent-cyan/20 text-white rounded-br-md'
                  : 'bg-white/[0.06] text-text-secondary rounded-bl-md',
              ]"
            >{{ msg.content }}</div>
          </div>
          <!-- 打字中 -->
          <div v-if="sending" class="flex justify-start">
            <div class="bg-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
              <span class="inline-flex gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style="animation-delay: 0ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style="animation-delay: 150ms" />
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style="animation-delay: 300ms" />
              </span>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <div class="px-3 py-3 border-t border-white/10 shrink-0 flex gap-2">
          <input
            v-model="inputText"
            type="text"
            placeholder="说点什么..."
            class="flex-1 glass rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors"
            @keydown="onChatKeydown"
            :disabled="sending"
          />
          <button
            class="glass rounded-xl px-4 py-2.5 text-accent-cyan text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40 shrink-0"
            @click="sendMessage"
            :disabled="sending || !inputText.trim()"
          >发送</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.4s ease;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.chat-enter-active {
  transition: all 0.3s ease;
}
.chat-leave-active {
  transition: all 0.2s ease;
}
.chat-enter-from,
.chat-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
</style>
