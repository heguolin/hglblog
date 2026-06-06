// 首页 Bento Grid Mock 数据

export const mockProfile = {
  name: "HGL",
  avatar: "", // 暂时用首字母
  bio: "全栈开发者 · 二次元爱好者 · 开源贡献者",
  description: "写代码、看动漫、听音乐。这里是记录技术探索和生活碎片的数字花园。",
  stats: {
    posts: 42,
    chatters: 128,
    photos: 356,
  },
  socialLinks: [
    { icon: "🐙", label: "GitHub", url: "https://github.com" },
    { icon: "📧", label: "Email", url: "mailto:hello@hgl123.icu" },
    { icon: "🐦", label: "Twitter", url: "https://twitter.com" },
  ],
};

export const mockMusic = {
  cover: "", // 渐变占位
  title: "Blinding Lights",
  artist: "The Weeknd",
  album: "After Hours",
  progress: 62, // 播放进度百分比
  isPlaying: true,
};

export const mockLatestPost = {
  title: "从零构建毛玻璃 Bento Grid 博客 — 全栈开发手记",
  slug: "building-glass-bento-blog",
  excerpt:
    "花了三周时间从零搭建了这个博客，记录一下技术选型、架构设计和毛玻璃特效的实现踩坑过程。涉及 Vue 3、NestJS、Prisma、PostgreSQL 和 Docker 部署。",
  coverImage: "", // 渐变占位
  category: { name: "前端开发", color: "#60a5fa" },
  tags: [{ name: "Vue 3" }, { name: "NestJS" }, { name: "全栈" }],
  readingTime: 8,
  viewCount: 1283,
  createdAt: "2026-06-01T10:00:00Z",
};

export const mockPhotoAlbum = {
  name: "2026 · 春日漫游记",
  description: "樱花、老街、午后的猫 — 用镜头记录春天的每一个温柔瞬间。",
  coverImage: "", // 渐变占位
  photoCount: 24,
};

export const mockLatestChatter = {
  mood: "😌",
  title: "今天重构了后端 API 层",
  content:
    "把 NestJS 的 Service 层全部拆了一遍，每个模块只做一件事。clean architecture 的快乐谁懂啊。顺便把 Prisma schema 也优化了，query 速度肉眼可见地快了。",
  tags: ["日常", "后端", "NestJS"],
  coverImage: "",
  createdAt: "2026-06-04T21:30:00Z",
};

export const mockSystem = {
  techStack: [
    "Vue 3",
    "TypeScript",
    "Tailwind v4",
    "GSAP",
    "NestJS",
    "Prisma",
    "PostgreSQL",
    "Redis",
    "Docker",
    "Nginx",
    "Ubuntu",
  ],
  startDate: "2025-01-01",
};

export const mockTheme = {
  isNight: true,
  greeting: "晚上好",
};
