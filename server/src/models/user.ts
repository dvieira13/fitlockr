// models/User.ts
import mongoose, { Schema, model, Document } from "mongoose";

export interface IUserItemRef {
    item_id: mongoose.Types.ObjectId;
    item_type: "Piece" | "Outfit"; // polymorphic reference
}

export type AuthType = "native" | "google";

export interface IUser extends Document {
    first_name: string;
    last_name: string;
    name: string;
    username: string;
    email: string;
    picture?: string;
    auth_type: AuthType;
    password_hash?: string; 
    all_items?: IUserItemRef[];
    pieces?: mongoose.Types.ObjectId[];
    outfits?: mongoose.Types.ObjectId[];
    shelves?: mongoose.Types.ObjectId[];
    is_deleted?: Date | null;
}

const UserItemRefSchema = new Schema<IUserItemRef>({
    item_id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "all_items.item_type",
    },
    item_type: {
        type: String,
        required: true,
        enum: ["Piece", "Outfit"],
    },
});

const UserSchema = new Schema<IUser>({
    first_name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    last_name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    username: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    picture: {
        type: String,
        maxlength: 1024,
        default: null,
    },
    auth_type: {
        type: String,
        required: true,
        enum: ["native", "google"],
        default: "native",
    },
    password_hash: {
        type: String,
        required: false,
        select: false, // doesn't allow to be sent to clients accidentally
    },
    all_items: {
        type: [UserItemRefSchema],
        default: [],
    },
    pieces: [
        {
            type: Schema.Types.ObjectId,
            ref: "Piece",
            default: [],
        },
    ],
    outfits: [
        {
            type: Schema.Types.ObjectId,
            ref: "Outfit",
            default: [],
        },
    ],
    shelves: [
        {
            type: Schema.Types.ObjectId,
            ref: "Shelf",
            default: [],
        },
    ],
    is_deleted: {
        type: Date,
        default: null,
    },
});

export default model<IUser>("User", UserSchema);
