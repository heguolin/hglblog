import { watchEffect } from "vue";

// SEO 元信息管理 — 每个页面 onMounted 时调用即可
export function useSEO(title: string, description?: string) {
  const defaultDesc = "二次元毛玻璃风格个人博客 — Vue 3 + NestJS 全栈项目，记录技术探索与生活碎片";

  watchEffect(() => {
    document.title = title ? `${title} | HGL Blog 🌸` : "HGL Blog 🌸";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", description || defaultDesc);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description || defaultDesc;
      document.head.appendChild(meta);
    }
  });
}
