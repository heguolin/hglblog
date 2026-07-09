<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";
import axios from "axios";

(window as any).PIXI = PIXI;

// ====== 状态 ======
const containerRef = ref<HTMLDivElement>();
const bubbleOpen = ref(false);
const bubbleText = ref("");
const chatOpen = ref(false);
const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
const inputText = ref("");
const sending = ref(false);
const chatMode = ref<"auto" | "chat" | "knowledge">("auto");
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

    model.interactive = true;
    model.cursor = "pointer";

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

    (model as any).expression = 0;
  } catch (err) {
    console.warn("Live2D 模型加载失败:", err);
  }

  setTimeout(() => {
    bubbleText.value = BUBBLE_QUOTES[Math.floor(Math.random() * BUBBLE_QUOTES.length)];
    bubbleOpen.value = true;
    setTimeout(() => { bubbleOpen.value = false; }, 6000);
  }, 5000);

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
      mode: chatMode.value,
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

    <!-- Live2D 容器 -->
    <div ref="containerRef" class="relative w-[220px] h-[220px] cursor-pointer hover:scale-105 transition-transform duration-300 rounded-full" title="点击和流萤聊天" @click="chatOpen = !chatOpen; bubbleOpen = false; if (chatOpen && messages.length === 0) messages.push({ role: 'assistant', content: '嗨…又见面啦。叫我「流萤」就好。今天想聊什么？' })">
    </div>

    <!-- ====== 聊天对话框 ====== -->
    <Transition name="chat">
      <div
        v-if="chatOpen"
        class="chat-dialog"
      >
        <!-- Header -->
        <div class="chat-header">
          <div class="flex items-center gap-2.5">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-pink opacity-75" />
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-pink" />
            </span>
            <span class="text-white text-sm font-bold tracking-wide">流萤</span>
          </div>

          <!-- 模式切换 -->
          <div class="mode-toggle">
            <button
              :class="['mode-btn', chatMode === 'chat' && 'active-chat']"
              @click="chatMode = 'chat'"
              title="角色聊天——用流萤的语气闲聊"
            >流萤</button>
            <button
              :class="['mode-btn', chatMode === 'auto' && 'active-auto']"
              @click="chatMode = 'auto'"
              title="自动——根据问题自动判断"
            >自动</button>
            <button
              :class="['mode-btn', chatMode === 'knowledge' && 'active-knowledge']"
              @click="chatMode = 'knowledge'"
              title="知识问答——检索博客内容准确回答"
            >知识</button>
            <button class="text-white/40 hover:text-white text-base leading-none ml-2" @click="chatOpen = false">✕</button>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages">
          <div v-for="(msg, i) in messages" :key="i" :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
            <div
              :class="[
                'msg-bubble',
                msg.role === 'user' ? 'msg-user' : 'msg-assistant',
              ]"
            >
              {{ msg.content }}
            </div>
          </div>
          <div v-if="sending" class="flex justify-start">
            <div class="msg-bubble msg-assistant flex items-center gap-1.5 px-4">
              <span class="typing-dot" style="animation-delay:0ms" />
              <span class="typing-dot" style="animation-delay:150ms" />
              <span class="typing-dot" style="animation-delay:300ms" />
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input">
          <input
            v-model="inputText"
            type="text"
            :placeholder="chatMode === 'knowledge' ? '问点博客相关的问题…' : '说点什么…'"
            class="chat-input-field"
            @keydown="onChatKeydown"
            :disabled="sending"
          />
          <button
            class="chat-send-btn"
            @click="sendMessage"
            :disabled="sending || !inputText.trim()"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ====== 对话框容器 ====== */
.chat-dialog {
  position: absolute;
  bottom: 0;
  left: 248px;
  width: 360px;
  height: 440px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255, 248, 240, 0.06);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 248, 240, 0.12);
  box-shadow:
    0 0 0 1px rgba(255, 248, 240, 0.08),
    0 24px 48px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(192, 132, 252, 0.05) inset;
}

/* ====== Header ====== */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 248, 240, 0.08);
  flex-shrink: 0;
}

/* ====== 模式切换 ====== */
.mode-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 2px;
}

.mode-btn {
  border: none;
  background: transparent;
  color: rgba(255, 248, 240, 0.45);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.mode-btn:hover {
  color: rgba(255, 248, 240, 0.75);
}

.mode-btn.active-chat {
  background: rgba(255, 107, 157, 0.2);
  color: #ff6b9d;
}

.mode-btn.active-auto {
  background: rgba(255, 248, 240, 0.08);
  color: rgba(255, 248, 240, 0.85);
}

.mode-btn.active-knowledge {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

/* ====== Messages ====== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-messages::-webkit-scrollbar {
  width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 248, 240, 0.1);
  border-radius: 2px;
}

.msg-bubble {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.msg-user {
  background: rgba(255, 107, 157, 0.18);
  color: #fff;
  border-bottom-right-radius: 6px;
  border: 1px solid rgba(255, 107, 157, 0.12);
}

.msg-assistant {
  background: rgba(255, 248, 240, 0.06);
  color: rgba(255, 248, 240, 0.82);
  border-bottom-left-radius: 6px;
  border: 1px solid rgba(255, 248, 240, 0.06);
}

/* ====== Typing dots ====== */
.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 248, 240, 0.3);
  animation: dotBounce 1.2s infinite ease-in-out;
}

@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-4px); opacity: 0.6; }
}

/* ====== Input ====== */
.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 248, 240, 0.08);
  flex-shrink: 0;
  background: rgba(15, 12, 41, 0.5);
}

.chat-input-field {
  flex: 1;
  border-radius: 14px;
  padding: 10px 16px;
  background: rgba(255, 248, 240, 0.04);
  border: 1px solid rgba(255, 248, 240, 0.08);
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.chat-input-field::placeholder {
  color: rgba(255, 248, 240, 0.25);
}

.chat-input-field:focus {
  border-color: rgba(255, 107, 157, 0.35);
  background: rgba(255, 248, 240, 0.06);
}

.chat-input-field:disabled {
  opacity: 0.4;
}

.chat-send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 107, 157, 0.25);
  background: rgba(255, 107, 157, 0.1);
  color: #ff6b9d;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  background: rgba(255, 107, 157, 0.2);
  border-color: rgba(255, 107, 157, 0.4);
}

.chat-send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ====== Transitions ====== */
.bubble-enter-active, .bubble-leave-active { transition: all 0.4s ease; }
.bubble-enter-from, .bubble-leave-to { opacity: 0; transform: translateY(8px); }
.chat-enter-active { transition: all 0.3s cubic-bezier(0, 0, 0.2, 1); }
.chat-leave-active { transition: all 0.2s cubic-bezier(0.2, 0, 1, 1); }
.chat-enter-from, .chat-leave-to { opacity: 0; transform: translateY(12px) scale(0.95); }
</style>
