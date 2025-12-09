// models/Shelf.ts
import mongoose, { Schema, model, Document, Types } from "mongoose";

export interface IShelfItem {
    item_id: mongoose.Types.ObjectId;
    item_type: "Piece" | "Outfit";
    item_added_date: Date;
}

export interface IShelf extends Document {
    _id: Types.ObjectId;
    items: IShelfItem[];
    name: string;
    created_by_name: string;
    created_by_username: string;
    created_by_id: mongoose.Types.ObjectId; // User._id
    created_date: Date;
}

const ShelfItemSchema = new Schema<IShelfItem>({
    item_id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: "items.item_type",
    },
    item_type: {
        type: String,
        required: true,
        enum: ["Piece", "Outfit"],
    },
    item_added_date: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

const ShelfSchema = new Schema<IShelf>({
    items: {
        type: [ShelfItemSchema],
        default: [],
    },
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
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

export default model<IShelf>("Shelf", ShelfSchema);
