import mongoose from "mongoose";
import { createEvents } from "./scripts/createEvents";

const connectDB = async () => {
    try {
        const { MONGO_USER, MONGO_PASS, MONGO_CLUSTER, MONGO_DB, SEED } = process.env;
        if (!MONGO_USER || !MONGO_PASS || !MONGO_CLUSTER || !MONGO_DB) {
            throw new Error("Missing MongoDB environment variables");
        }

        const uri = `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_CLUSTER}/${MONGO_DB}?retryWrites=true&w=majority`;

        await mongoose.connect(uri);
        console.log("MongoDB Atlas connected");

        // Seed courses in the background (non-blocking)
        if (SEED === "true") {
            console.log("Seeding events...");
            createEvents().catch(err => console.error("Seeding error:", err));
        }
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
};

export default connectDB;
