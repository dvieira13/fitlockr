// models/Piece.ts
import mongoose, { Schema, model, Document, Types } from "mongoose";

export type PieceType = "Headwear" | "Outerwear" | "Top" | "Bottom" | "Footwear";

export type PieceColor =
    | "Black"
    | "White"
    | "Brown"
    | "Blue"
    | "Green"
    | "Yellow"
    | "Orange"
    | "Tan"
    | "Red"
    | "Purple"
    | "Pink"
    | "Multi";

export interface IComfortTags {
    comfy: boolean;
    casual: boolean;
    classy: boolean;
}

export interface ISeasonTags {
    fall: boolean;
    winter: boolean;
    spring: boolean;
    summer: boolean;
}

export interface IPieceTags {
    comfort: IComfortTags;
    season: ISeasonTags;
}

// 🔹 Central source of truth for tag keys:
export const COMFORT_TAG_KEYS = ["comfy", "casual", "classy"] as const;
export const SEASON_TAG_KEYS = ["fall", "winter", "spring", "summer"] as const;

export interface IPiece extends Document {
    _id: Types.ObjectId;
    primary_img: string;
    secondary_imgs?: string[];
    name: string;
    notes?: string;
    owned: boolean;
    type: PieceType;
    subtype?: string | null;
    colors: PieceColor[];
    brand?: string;
    size?: string;
    price?: string;
    product_link?: string;
    tags?: IPieceTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: mongoose.Types.ObjectId;
    created_date: Date;
}

const ComfortTagSchema = new Schema<IComfortTags>({
    comfy: { type: Boolean, default: false },
    casual: { type: Boolean, default: false },
    classy: { type: Boolean, default: false },
});

const SeasonTagSchema = new Schema<ISeasonTags>({
    fall: { type: Boolean, default: false },
    winter: { type: Boolean, default: false },
    spring: { type: Boolean, default: false },
    summer: { type: Boolean, default: false },
});

const PieceTagsSchema = new Schema<IPieceTags>({
    comfort: { type: ComfortTagSchema, default: () => ({}) },
    season: { type: SeasonTagSchema, default: () => ({}) },
});

const PieceSchema = new Schema<IPiece>({
    primary_img: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 1024,
    },
    secondary_imgs: {
        type: [String],
        default: [],
        validate: {
            validator: function (arr: string[]) {
                return !arr || arr.length <= 6;
            },
            message: "secondary_imgs cannot have more than 6 images",
        },
    },
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    notes: {
        type: String,
        maxlength: 2000,
        default: null,
    },
    owned: {
        type: Boolean,
        required: true,
        default: true,
    },
    type: {
        type: String,
        required: true,
        enum: ["Headwear", "Outerwear", "Top", "Bottom", "Footwear"],
    },
    subtype: {
        type: String,
        minlength: 1,
        maxlength: 255,
        default: null,
    },
    colors: {
        type: [String],
        enum: [
            "Black",
            "White",
            "Grey",
            "Brown",
            "Blue",
            "Green",
            "Yellow",
            "Orange",
            "Tan",
            "Red",
            "Purple",
            "Pink",
            "Multi",
        ],
        required: true,
        default: [],
    },
    brand: {
        type: String,
        maxlength: 255,
        default: null,
    },
    size: {
        type: String,
        maxlength: 50,
        default: null,
    },
    price: {
        type: String,
        maxlength: 50,
        default: null,
    },
    product_link: {
        type: String,
        maxlength: 1024,
        default: null,
    },
    tags: {
        type: PieceTagsSchema,
        default: null,
    },
    created_by_name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    created_by_username: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    created_by_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    created_date: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

export default model<IPiece>("Piece", PieceSchema);
