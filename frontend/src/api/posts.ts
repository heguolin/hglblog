import client from "./client";

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  pinned: boolean;
  viewCount: number;
  likeCount: number;
  readingTime: number | null;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  categoryId: number | null;
  category: { id: number; name: string; slug: string; icon: string | null; color: string | null } | null;
  tags: { id: number; name: string; slug: string; color: string | null }[];
  author: { id: number; username: string; avatar: string | null };
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchPosts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
}): Promise<PostListResponse> {
  const { data } = await client.get("/posts", { params });
  return data;
}

export async function fetchRecentPosts(limit = 5): Promise<Post[]> {
  const { data } = await client.get("/posts/recent", { params: { limit } });
  return data;
}

export async function fetchPostBySlug(slug: string): Promise<Post> {
  const { data } = await client.get(`/posts/${slug}`);
  return data;
}
