import { ref, onMounted, onUnmounted } from "vue";

// 鼠标光晕 composable — mousemove + rAF 平滑跟随
export function useCursorGlow() {
  const glowX = ref(-200);
  const glowY = ref(-200);
  const targetX = ref(-200);
  const targetY = ref(-200);
  let animationId: number | null = null;

  function onMouseMove(e: MouseEvent) {
    targetX.value = e.clientX;
    targetY.value = e.clientY;
  }

  function animate() {
    // 平滑插值跟随
    glowX.value += (targetX.value - glowX.value) * 0.08;
    glowY.value += (targetY.value - glowY.value) * 0.08;
    animationId = requestAnimationFrame(animate);
  }

  function createGlowEl() {
    if (document.getElementById("cursor-glow")) return;
    const el = document.createElement("div");
    el.id = "cursor-glow";
    el.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 350px;
      height: 350px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1;
      background: radial-gradient(circle, rgba(255, 107, 157, 0.12), rgba(192, 132, 252, 0.06) 40%, transparent 70%);
      transform: translate(-50%, -50%);
      will-change: transform;
    `;
    document.body.appendChild(el);
  }

  function updateGlow() {
    const el = document.getElementById("cursor-glow");
    if (el) {
      el.style.transform = `translate(${glowX.value - 175}px, ${glowY.value - 175}px)`;
    }
  }

  // 每帧更新 DOM
  let updateInterval: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    createGlowEl();
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    animationId = requestAnimationFrame(animate);
    updateInterval = setInterval(updateGlow, 16); // ~60fps
  });

  onUnmounted(() => {
    window.removeEventListener("mousemove", onMouseMove);
    if (animationId) cancelAnimationFrame(animationId);
    if (updateInterval) clearInterval(updateInterval);
    const el = document.getElementById("cursor-glow");
    if (el) el.remove();
  });
}
