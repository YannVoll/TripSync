import api from "./axios";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

export async function uploadImage(file: File) {
  const data = new FormData();
  data.append("image", file);
  const res = await api.post<{ url: string }>("/uploads/image", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
}
