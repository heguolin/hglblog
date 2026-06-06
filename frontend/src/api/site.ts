import client from "./client";

export interface SiteStats {
  posts: number;
  chatters: number;
  photos: number;
  friends: number;
  categories: number;
  tags: number;
  totalViews: number;
}

export async function fetchSiteStats(): Promise<SiteStats> {
  const { data } = await client.get("/site/stats");
  return data;
}

export async function fetchSiteConfig(key: string) {
  const { data } = await client.get(`/site/config/${key}`);
  return data;
}
