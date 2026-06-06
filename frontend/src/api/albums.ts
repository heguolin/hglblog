import client from "./client";

export interface Photo {
  id: number;
  url: string;
  thumbnail: string | null;
  title: string | null;
  albumId: number;
  createdAt: string;
}

export interface Album {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  photoCount?: number;
  photos?: Photo[];
}

export async function fetchAlbums(): Promise<Album[]> {
  const { data } = await client.get("/albums");
  return data;
}

export async function fetchAlbumById(id: number): Promise<Album & { photos: Photo[] }> {
  const { data } = await client.get(`/albums/${id}`);
  return data;
}
