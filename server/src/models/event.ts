import mongoose, { Schema, Document } from "mongoose";

export interface IEvent extends Document {
    name: string;
    slogan: string;
    primary_img_src: string;
    alt_img_srcs: string[];
    city: string;
    date: Date;
    time: string;
}

const EventSchema: Schema = new Schema<IEvent>({
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    slogan: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    primary_img_src: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    alt_img_srcs: {
        type: [String],
        required: true,
    },
    city: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    date: {
        type: Date,
        required: true,
    },
    time: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
});

export const Event = mongoose.model<IEvent>("Event", EventSchema);
