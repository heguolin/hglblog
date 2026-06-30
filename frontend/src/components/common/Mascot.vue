<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import axios from "axios";

// ====== 状态 ======
const bubbleOpen = ref(false);
const bubbleText = ref("");
const chatOpen = ref(false);
const messages = ref<{ role: "user" | "assistant"; content: string }[]>([]);
const inputText = ref("");
const sending = ref(false);
let bubbleTimer: ReturnType<typeof setInterval> | null = null;

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

onMounted(() => {
  bubbleTimer = setInterval(
    () => {
      bubbleText.value = BUBBLE_QUOTES[Math.floor(Math.random() * BUBBLE_QUOTES.length)];
      bubbleOpen.value = true;
      setTimeout(() => { bubbleOpen.value = false; }, 6000);
    },
    25000 + Math.random() * 25000,
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
});

// ====== 聊天 ======
function toggleChat() {
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
}

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
        class="glass rounded-2xl px-4 py-2.5 mb-3 max-w-[220px] text-white text-[13px] leading-relaxed shadow-lg shadow-black/20 relative"
      >
        {{ bubbleText }}
        <div class="absolute -bottom-2 left-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white/10" />
      </div>
    </Transition>

    <!-- 看板娘角色 -->
    <div
      class="relative w-[160px] h-[160px] cursor-pointer group"
      title="点击和流萤聊天"
      @click="toggleChat"
    >
      <!-- 身体 -->
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120px] h-[90px] rounded-t-[60px] rounded-b-2xl bg-gradient-to-b from-accent-purple/40 via-accent-pink/30 to-accent-blue/20 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm">
        <!-- 眼睛 -->
        <div class="flex justify-center gap-4 mt-6">
          <span class="w-4 h-4 rounded-full bg-white/90 shadow-inner" />
          <span class="w-4 h-4 rounded-full bg-white/90 shadow-inner" />
        </div>
        <!-- 嘴 -->
        <div class="flex justify-center mt-2">
          <span class="w-3 h-3 rounded-full bg-white/50" />
        </div>
      </div>
      <!-- 头 -->
      <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-[100px] h-[85px] rounded-[50px] bg-gradient-to-b from-accent-purple/30 to-accent-pink/20 border border-white/10 shadow-lg shadow-black/30 backdrop-blur-sm animate-float">
        <!-- 眼睛 -->
        <div class="flex justify-center gap-4 mt-7">
          <span class="w-5 h-5 rounded-full bg-white/90 shadow-inner" />
          <span class="w-5 h-5 rounded-full bg-white/90 shadow-inner" />
        </div>
        <!-- 嘴 -->
        <div class="flex justify-center mt-1.5">
          <span class="w-2.5 h-2.5 rounded-full bg-white/60" />
        </div>
        <!-- 腮红 -->
        <span class="absolute top-10 left-3 w-4 h-2.5 rounded-full bg-accent-pink/30 blur-[2px]" />
        <span class="absolute top-10 right-3 w-4 h-2.5 rounded-full bg-accent-pink/30 blur-[2px]" />
      </div>
      <!-- 光晕 -->
      <div class="absolute -inset-2 rounded-full bg-accent-cyan/10 blur-xl animate-pulse" />
    </div>

    <!-- ====== 聊天对话框 ====== -->
    <Transition name="chat">
      <div
        v-if="chatOpen"
        class="absolute bottom-[170px] left-0 w-[340px] glass-strong rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/40 border border-white/10"
        :style="{ height: '400px' }"
      >
        <!-- 标题栏 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
              <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
            </span>
            <span class="text-white text-sm font-bold">和流萤聊天</span>
          </div>
          <button
            class="text-text-muted hover:text-white transition-colors text-lg leading-none"
            @click="chatOpen = false"
          >✕</button>
        </div>

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

@keyframes float {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, -4px); }
}
.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>
