export interface UploadImageResponse {
  success: boolean;
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export const MediaService = {
  /**
   * Upload an image to Cloudinary via the backend API
   */
  async uploadImage(
    file: File,
    folder: 'courses' | 'instructors' = 'courses',
    token?: string | null,
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const response = await fetch(
      `${apiUrl}/media/upload?folder=${encodeURIComponent(folder)}`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload image');
    }

    return response.json();
  },
};
