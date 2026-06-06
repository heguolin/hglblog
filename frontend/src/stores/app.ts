import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStore = defineStore("app", () => {
  const siteTitle = ref("HGL Blog");
  const siteDescription = ref("A personal blog with glassmorphism style");

  return {
    siteTitle,
    siteDescription,
  };
});
