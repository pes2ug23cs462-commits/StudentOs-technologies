/* Turns a chosen image into a small square JPEG data URL, small enough to keep
   in the student's profile document. The student picks the square with the
   cropper (components/settings/photo-cropper.tsx); photoFromFile is the plain
   center crop. */

export const PHOTO_SIZE = 200;
const MAX_INPUT = 10 * 1024 * 1024; // 10 MB

/** Checks the file and loads it as an image. Call `done()` when finished with it. */
export async function loadPhoto(file: File): Promise<{ img: HTMLImageElement; done: () => void }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (JPG or PNG).");
  if (file.size > MAX_INPUT) throw new Error("That image is over 10 MB. Please choose a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn’t read that image. Try a JPG or PNG."));
      i.src = url;
    });
    return { img, done: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/** The square (sx, sy, side) of the image, in image pixels, as a small JPEG data URL. */
export function cropPhoto(img: HTMLImageElement, sx: number, sy: number, side: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn’t process the image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  let q = 0.86;
  let data = canvas.toDataURL("image/jpeg", q);
  while (data.length > 60_000 && q > 0.4) {
    q -= 0.12;
    data = canvas.toDataURL("image/jpeg", q);
  }
  return data;
}

/** Center crop, no questions asked. */
export async function photoFromFile(file: File): Promise<string> {
  const { img, done } = await loadPhoto(file);
  try {
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    return cropPhoto(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side);
  } finally {
    done();
  }
}
