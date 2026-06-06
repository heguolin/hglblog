import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home.vue"),
  },
  {
    path: "/chatter",
    name: "Chatter",
    component: () => import("@/views/Chatter.vue"),
  },
  {
    path: "/chatter/:id",
    name: "ChatterDetail",
    component: () => import("@/views/ChatterDetail.vue"),
  },
  {
    path: "/photowall",
    name: "PhotoWall",
    component: () => import("@/views/PhotoWall.vue"),
  },
  {
    path: "/about",
    name: "About",
    component: () => import("@/views/About.vue"),
  },
  {
    path: "/friends",
    name: "Friends",
    component: () => import("@/views/Friends.vue"),
  },
  {
    path: "/posts/:slug",
    name: "PostDetail",
    component: () => import("@/views/PostDetail.vue"),
  },
  {
    path: "/archive",
    name: "Archive",
    component: () => import("@/views/Archive.vue"),
  },
  // 管理后台路由组
  {
    path: "/admin/login",
    name: "AdminLogin",
    component: () => import("@/views/admin/AdminLogin.vue"),
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/views/admin/AdminLayout.vue"),
    children: [
      {
        path: "",
        redirect: "/admin/dashboard",
      },
      {
        path: "dashboard",
        name: "AdminDashboard",
        component: () => import("@/views/admin/AdminDashboard.vue"),
      },
      {
        path: "posts",
        name: "AdminPosts",
        component: () => import("@/views/admin/AdminPosts.vue"),
      },
      {
        path: "posts/new",
        name: "AdminPostNew",
        component: () => import("@/views/admin/AdminPostEdit.vue"),
      },
      {
        path: "posts/edit/:id",
        name: "AdminPostEdit",
        component: () => import("@/views/admin/AdminPostEdit.vue"),
      },
      {
        path: "chatters",
        name: "AdminChatters",
        component: () => import("@/views/admin/AdminChatters.vue"),
      },
      {
        path: "albums",
        name: "AdminAlbums",
        component: () => import("@/views/admin/AdminAlbums.vue"),
      },
      {
        path: "friends",
        name: "AdminFriends",
        component: () => import("@/views/admin/AdminFriends.vue"),
      },
      {
        path: "settings",
        name: "AdminSettings",
        component: () => import("@/views/admin/AdminSettings.vue"),
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/NotFound.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// 路由守卫：/admin/*（除 /admin/login）需登录
router.beforeEach((to, _from, next) => {
  if (to.path.startsWith("/admin") && to.path !== "/admin/login") {
    const token = localStorage.getItem("token");
    if (!token) {
      next("/admin/login");
      return;
    }
  }
  next();
});

export default router;
