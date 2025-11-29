import mongoose, { Schema, model, Document } from "mongoose";

export interface IUserEvent {
    event_id: mongoose.Types.ObjectId;
    ticket_quantity: number;
}

export interface IUserProfile extends Document {
    first_name: string;
    last_name: string | "";
    name: string,
    picture: string,
    email: string;
    phone_number?: number;
    address?: string;
    carted_events?: IUserEvent[];
    purchased_events?: IUserEvent[];
    is_deleted?: Date;
}

const UserEventSchema = new Schema<IUserEvent>({
    event_id: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    ticket_quantity: {
        type: Number,
        required: true,
        min: 1,
    },
});

const UserProfileSchema = new Schema<IUserProfile>({
    first_name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    last_name: {
        type: String,
        minlength: 1,
        maxlength: 255,
    },
    name: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 255,
    },
    picture: {
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
    phone_number: {
        type: Number,
        minlength: 10,
        maxlength: 10,
        default: null,
    },
    address: {
        type: String,
        minlength: 1,
        maxlength: 255,
        default: null,
    },
    carted_events: {
        type: [UserEventSchema],
        default: [],
    },
    purchased_events: {
        type: [UserEventSchema],
        default: [],
    },
    is_deleted: {
        type: Date,
        default: null,
    },
});

export default model<IUserProfile>("UserProfile", UserProfileSchema);
