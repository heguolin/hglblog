import client from "./client";

export interface Chatter {
  id: number;
  title: string;
  content: string;
  mood: string | null;
  coverImage: string | null;
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  authorId: number;
  author: { id: number; username: string; avatar: string | null };
}

export interface ChatterListResponse {
  chatters: Chatter[];
  total: number;
  allTags: string[];
}

export async function fetchChatters(tag?: string): Promise<ChatterListResponse> {
  const { data } = await client.get("/chatters", { params: tag ? { tag } : {} });
  return data;
}

export async function fetchChatterById(id: number): Promise<Chatter> {
  const { data } = await client.get(`/chatters/${id}`);
  return data;
}
