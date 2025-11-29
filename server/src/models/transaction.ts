import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
    user_id: mongoose.Types.ObjectId;       // ref StudentProfile
    event_id: mongoose.Types.ObjectId;        // ref Course
    ticket_quantity: Number;
    purchased_at: Date;
}

const TransactionSchema: Schema = new Schema<ITransaction>({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "UserProfile",
        required: true,
    },
    event_id: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    ticket_quantity: {
        type: Number,
        required: true,
    },
    purchased_at: {
        type: Date,
        default: Date.now,
    },
});

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);
