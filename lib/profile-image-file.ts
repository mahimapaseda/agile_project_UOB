const MAX_OUTPUT_BYTES = 900_000;
const MAX_DIMENSION = 800;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read image file.'));
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(blob);
  });
}

function compressImageFile(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not process image.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load image.'));
    };
    img.src = objectUrl;
  });
}

/** Read a local image file, resize if needed, and return storage + preview URLs. */
export async function readProfileImageFile(
  file: File,
): Promise<{ dataUrl: string; previewUrl: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose a JPEG, PNG, WebP, or GIF image.');
  }

  const compressed = await compressImageFile(file);
  if (compressed.size > MAX_OUTPUT_BYTES) {
    throw new Error('Image is too large. Use a smaller photo or paste a URL instead.');
  }

  const dataUrl = await blobToDataUrl(compressed);
  const previewUrl = URL.createObjectURL(compressed);
  return { dataUrl, previewUrl };
}

export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const PROFILE_IMAGE_HINT = 'Direct image URL or Drive link or image file';
