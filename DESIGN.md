# Design System — HGL Blog

## Product Context
- **What this is:** 二次元毛玻璃风格个人博客——"技术博主的二次元客厅"。暗色房间里，毛玻璃家具摆在暖色灯光下，像邀请同好来客厅分享文章和学习资料。
- **Who it's for:** 技术博主本人 + 访问博客的二次元/技术圈读者
- **Space/industry:** 个人博客 / 技术写作 / 二次元社区
- **Project type:** 内容型个人网站（博客 + 照片墙 + 留言板 + 关于页）
- **Reference:** https://www.xinghuisama.top/ (毛玻璃 + Bento Grid 布局)
- **Domains:** hgl123.icu (博客) / img.hgl123.icu (图床)

## Aesthetic Direction
- **Direction:** Warm Hearth × Glass (暖炉 × 玻璃) — Retro-Futuristic meets Organic
- **Decoration level:** Expressive (光球 + 樱花 + 弹幕 + Live2D + SVG 噪点纹路)
- **Mood:** 暗色房间亮着暖灯的客厅——冷色墙壁围合空间，暖色玻璃是家具，看板娘像房间里的人。温暖、个人化、有技术宅的怪趣，不冷感、不企业化。
- **Key metaphor:** 毛玻璃 = 障子纸，强调色 = LED 灯带，Bento 卡片 = 客厅家具，看板娘 = 房间主人

## Typography

| Role | Font | Fallback | Rationale |
|------|------|----------|-----------|
| Headings H1-H3 | **Smiley Sans (得意黑)** | Source Han Sans SC | 圆润友好，二次元感但不幼稚，适合标题和品牌标识 |
| Body | **Source Han Sans SC (思源黑体)** | Noto Sans SC | 中性舒适，长篇阅读不疲劳，技术博客的"认真写的一本书" |
| Code | **JetBrains Mono** | Iosevka, Source Han Mono SC | 连字开启，开发者身份锚点，三方设计视角一致 |

- **Heading rules:** Smiley Sans 仅用于 H1-H3、导航标签、卡片标题；正文、UI 标签、元信息用 Source Han Sans SC
- **Loading strategy:** 得意黑自托管 (woff2 子集化，只切标题和导航常用字)；思源黑体走 Google Fonts (Noto Sans SC)；JetBrains Mono 走 Google Fonts
- **Scale:** H1 44/52, H2 32/40, H3 24/32, H4 20/28, Body 16/26, Small 14/22, Mono 15/24
- **Line length:** 正文 68-72ch；代码块横向滚动，行号 sticky 且 opacity 0.4

## Color

- **Approach:** Expressive — 4 种强调色各有语义角色，色即是信息

### Background (房间墙壁)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-1` | `#0f0c29` | 最深背景 |
| `--bg-2` | `#302b63` | 渐变中调 |
| `--bg-3` | `#24243e` | 渐变过渡 |
| `--bg-4` | `#1a1a2e` | 较亮区域 |

### Glass Surfaces (家具材质)

| Token | Value | Usage |
|-------|-------|-------|
| `--glass-bg` | `rgba(255,248,240,0.06)` | 标准毛玻璃底 — 微暖，不是纯白 |
| `--glass-bg-strong` | `rgba(255,248,240,0.10)` | 加强毛玻璃底 |
| `--glass-border` | `rgba(255,248,240,0.12)` | 毛玻璃外边框 |
| `--glass-border-strong` | `rgba(255,248,240,0.22)` | 毛玻璃内边框（双层边框设计） |

### Accents with Semantic Roles

| Token | Hex | Role |
|-------|-----|------|
| `--accent-purple` | `#c084fc` | **品牌身份** — logo、主 CTA、选中态、品牌高光 |
| `--accent-pink` | `#ff6b9d` | **社交温度** — 点赞、留言板心跳、友链、live presence |
| `--accent-blue` | `#60a5fa` | **信息链接** — 文章链接、hover 态、聚焦环 (focus ring) |
| `--accent-cyan` | `#22d3ee` | **系统元数据** — 标签、筛选 chip、代码高亮、时间戳 |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--text-strong` | `#ffffff` | 标题、强调文本 |
| `--text-body` | `rgba(255,248,240,0.78)` | 正文 — 微暖白 |
| `--text-muted` | `rgba(255,248,240,0.45)` | 辅助说明、时间戳 |

### Semantic States

| Token | Hex | Usage |
|-------|-----|-------|
| `--ok` | `#22d3ee` | 成功 — 和 cyan 同色 |
| `--warn` | `#fbbf24` | 警告 |
| `--danger` | `#fb7185` | 错误 — 注意：粉色 (`#ff6b9d`) 不用于错误态 |

### Key Rule
**紫色拥有品牌时刻，粉色传递社交温度，蓝色是默认交互色，青色处理元数据。** 粉色永远不用于错误态，青色永远不用于主 CTA。

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable (博客内容型，需要呼吸感)
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)
- **Card gap:** 16px (Bento Grid), 20px (独立卡片区)
- **Section margin:** 48px top / 24px bottom

## Layout
- **Approach:** Hybrid — 首屏 Poster-first (60/40 不对称)，内容区 Grid-disciplined
- **Grid:** 12-column Bento Grid (首页) + 6-column (平板) + 1-column (手机)
- **Max content width:** 1200px container, 正文 68-72ch (~680px)
- **Border radius hierarchy:** sm(6px) — tags, chips / md(12px) — buttons, inputs / lg(18px) — cards, glass panels / full(9999px) — avatars, pills

### Page Layout Rules
- **首页:** 左侧竖导航 rail (180px) + 右侧 Bento Grid → 平板竖导航折叠为顶栏
- **文章页:** 左侧大纲 (180px) + 中间正文 (68-72ch) + 右侧小部件 (120px, 时钟/音乐) → 平板右侧小部件隐藏
- **内容页:** 居中文档布局，无侧栏
- **Glass backdrop-filter 叠加上限:** 不超过 3 层 (父元素 overflow:hidden / transform / filter 会导致失效)

## Motion
- **Approach:** Intentional — 有意义的过渡，不炫技
- **Easing:** enter `cubic-bezier(0, 0, 0.2, 1)` (ease-out) / exit `cubic-bezier(0.2, 0, 1, 1)` (ease-in) / move `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-in-out)
- **Duration:** micro(50-100ms) — focus ring, underline / short(150-250ms) — hover, toggle / medium(250-400ms) — card lift, page transition / long(400-700ms) — hero entrance

### Interaction Specs
- **Card hover:** translateY(-4px) + box-shadow with purple tint + 2px parallax on cursor, transition 350ms ease-in-out
- **Link hover:** underline slides in from 8px offset + 1px→2px blue outer glow
- **Mascot (Live2D 流萤):** idle loop <1% jitter, reacts to scroll thresholds (nod on section enter)
- **Particles (樱花/光球):** opacity capped at 0.3, pause during text selection, 6-10s drift

## Components (Key Specs)

| Component | Spec |
|-----------|------|
| **Nav Rail** | Vertical, left 180px. Sections: Home, Articles, Notes, Photos, Friends, About. Active = cyan chip, focus = blue ring, brand dot = purple |
| **Bento Card** | Glass surface, 18px radius, dual border (inner + outer). Header = Smiley Sans 700, body = Source Han Sans 400/500, metadata = cyan |
| **Article Header** | "Tabletop" card first 200-240px: title in Smiley Sans 800 (38-44px), tags as cyan chips, reading time in blue, bookmark ribbon animation |
| **Comment Widget** | Nested replies with indent, author badge in purple, reply button ghost-style. Pink "heartbeat" pulse on new messages |
| **Glass Modal** | glass-bg-strong, centered, 30px blur, dual border, escape-to-close, focus trap |

## Anti-Patterns (never use)
- Generic hero sections with "Welcome to my blog"
- 3-column icon grids in colored circles
- Centered everything with uniform spacing
- Purple/violet gradients as the default accent (purple is BRAND only)
- Decorative blobs or stock illustrations
- system-ui as display or body font

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-07 | Initial design system created | Created by /design-consultation. Synthesized Codex (GPT-5) + Claude subagent + Claude main design voices. Direction: Warm Hearth × Glass. Key risk: warm glass undertone vs typical pure-white translucency. |
| 2026-07-07 | Smiley Sans for headings | Round, friendly, anime-adjacent but not childish. Requires self-hosting with subsetting for performance. |
| 2026-07-07 | Semantic color roles | Purple=brand, Pink=social, Blue=links, Cyan=metadata. Each accent has a clear job — never ambiguous. |
