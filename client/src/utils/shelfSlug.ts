// src/utils/shelfSlug.ts
export const slugifyShelfName = (name: string) =>
    name
        .toLowerCase()
        .trim()
        .replace(/['"]/g, "") // strip quotes
        .replace(/[^a-z0-9]+/g, "-") // non-alphanum => dash
        .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
