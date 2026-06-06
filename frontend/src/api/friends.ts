import client from "./client";

export interface Friend {
  id: number;
  name: string;
  url: string;
  avatar: string | null;
  description: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchFriends(): Promise<Friend[]> {
  const { data } = await client.get("/friends");
  return data;
}

export async function applyFriend(dto: {
  name: string;
  url: string;
  avatar?: string;
  description?: string;
}): Promise<Friend> {
  const { data } = await client.post("/friends/apply", dto);
  return data;
}
