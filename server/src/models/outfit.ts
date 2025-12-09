// models/Outfit.ts
import mongoose, { Schema, model, Document, Types } from "mongoose";
import { IComfortTags, ISeasonTags, IPiece } from "./piece";

export interface IOutfitTags {
    comfort: IComfortTags;
    season: ISeasonTags;
}

export interface IOutfit extends Document {
    _id: Types.ObjectId;
    pieces: mongoose.Types.ObjectId[] | IPiece[];
    name: string;
    tags?: IOutfitTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: mongoose.Types.ObjectId; // User._id
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

const OutfitTagsSchema = new Schema<IOutfitTags>({
    comfort: { type: ComfortTagSchema, default: () => ({}) },
    season: { type: SeasonTagSchema, default: () => ({}) },
});

const OutfitSchema = new Schema<IOutfit>({
    pieces: [
        {
            type: Schema.Types.ObjectId,
            ref: "Piece",
            required: true,
        },
    ],
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    tags: {
        type: OutfitTagsSchema,
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

export default model<IOutfit>("Outfit", OutfitSchema);
