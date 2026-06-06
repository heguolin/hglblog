import { onMounted } from "vue";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useGsap() {
  onMounted(() => {
    gsap.registerPlugin(ScrollTrigger);
  });

  /** 元素进入视口时淡入上浮 */
  function fadeInUp(
    target: string | Element | Element[],
    options?: { stagger?: number; duration?: number; distance?: number; delay?: number },
  ) {
    const { stagger = 0.1, duration = 0.8, distance = 30, delay = 0 } = options ?? {};
    gsap.fromTo(target, { opacity: 0, y: distance }, {
      opacity: 1, y: 0, duration, stagger, delay, ease: "power2.out",
      scrollTrigger: { trigger: Array.isArray(target) ? target[0] : (target as Element), start: "top 85%", toggleActions: "play none none reverse" },
    });
  }

  /** 数字跳动动画：从 0 到目标值 */
  function countUp(
    target: Element,
    options?: { endValue: number; duration?: number; suffix?: string; decimals?: number },
  ) {
    const { endValue = 0, duration = 2, suffix = "", decimals = 0 } = options ?? {};
    const obj = { val: 0 };
    gsap.to(obj, {
      val: endValue,
      duration,
      ease: "power2.out",
      scrollTrigger: { trigger: target, start: "top 90%", toggleActions: "play none none reverse" },
      onUpdate() {
        target.textContent = obj.val.toFixed(decimals) + suffix;
      },
    });
  }

  /** 卡片 3D 倾斜效果（在 mousemove 中调用） */
  function applyTilt(card: HTMLElement, e: MouseEvent, maxDeg = 8) {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(card, {
      rotateY: x * maxDeg,
      rotateX: -y * maxDeg,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
    });
  }

  /** 重置 3D 倾斜（在 mouseleave 中调用） */
  function resetTilt(card: HTMLElement) {
    gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out" });
  }

  return { fadeInUp, countUp, applyTilt, resetTilt };
}
