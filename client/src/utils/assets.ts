// utils/assets.ts
// tool to convert image file name into local path to file

export const images = import.meta.glob("../assets/*.{png,jpg,jpeg,gif,webp,avif}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

export const getImageByName = (filename: string): string => {
  if (!filename) return "/assets/default.png";

  // Strip leading slash if present
  const normalized = filename.replace(/^\/+/, "");

  // Find the first key that ends with the filename (any extension)
  const key = Object.keys(images).find((k) =>
    k.includes(normalized) // match filename ignoring extension
  );

  return key ? images[key] : "/assets/default.png";
};
