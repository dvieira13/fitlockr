// src/utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadBase64ImageToCloudinary(
    dataUrl: string,
    folder: "users" | "pieces" | "outfits" | string
) {
    const uploadRes = await cloudinary.uploader.upload(dataUrl, {
        folder,
        resource_type: "image",
    });

    return {
        url: uploadRes.secure_url,
        public_id: uploadRes.public_id,
    };
}

// 👈 this is what pieceController is importing
export default cloudinary;
