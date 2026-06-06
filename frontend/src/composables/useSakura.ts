import { onMounted, onUnmounted } from "vue";

// 樱花飘落 composable
export function useSakura() {
  let sakuraInterval: ReturnType<typeof setInterval> | null = null;

  function createPetal() {
    const petal = document.createElement("div");
    petal.className = "sakura-petal";

    const size = 10 + Math.random() * 16;
    const left = Math.random() * 100;
    const duration = 6 + Math.random() * 8;
    const delay = Math.random() * 3;
    const opacity = 0.3 + Math.random() * 0.4;
    const sway = -20 + Math.random() * 40;

    petal.style.cssText = `
      position: fixed;
      top: -30px;
      left: ${left}vw;
      width: ${size}px;
      height: ${size}px;
      opacity: ${opacity};
      font-size: ${size}px;
      pointer-events: none;
      z-index: 5;
      animation: sakura-fall ${duration}s linear ${delay}s forwards;
      --sway: ${sway}px;
    `;
    petal.textContent = "🌸";

    document.body.appendChild(petal);

    // 动画结束后移除
    setTimeout(() => {
      petal.remove();
    }, (duration + delay) * 1000 + 500);
  }

  function injectStyles() {
    if (document.getElementById("sakura-styles")) return;
    const style = document.createElement("style");
    style.id = "sakura-styles";
    style.textContent = `
      @keyframes sakura-fall {
        0% {
          transform: translateY(0) translateX(0) rotate(0deg);
          opacity: 1;
        }
        25% {
          transform: translateY(25vh) translateX(var(--sway)) rotate(90deg);
        }
        50% {
          transform: translateY(50vh) translateX(calc(var(--sway) * -0.5)) rotate(180deg);
          opacity: 0.7;
        }
        75% {
          transform: translateY(75vh) translateX(var(--sway)) rotate(270deg);
        }
        100% {
          transform: translateY(100vh) translateX(0) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function start() {
    injectStyles();
    sakuraInterval = setInterval(createPetal, 300);
  }

  function stop() {
    if (sakuraInterval) {
      clearInterval(sakuraInterval);
      sakuraInterval = null;
    }
  }

  onMounted(() => start());
  onUnmounted(() => stop());

  return { start, stop };
}
