import { Event } from "../models/event";

/**
 * Seeding function to create event items in the DB
 */
export async function createEvents() {
    try {
        const sampleEvents = [
            {
                name: "Dijon", slogan: "Baby Tour", primary_img_src: "dijon_primary",
                alt_img_srcs: ["dijon_alt_1", "dijon_alt_2", "dijon_alt_3", "dijon_alt_4", "dijon_alt_5", "dijon_alt_6"],
                city: "Boston, MA", date: "2025-11-29", time: "8 PM"
            },
            {
                name: "Olivia Dean", slogan: "The Art of Loving Tour", primary_img_src: "oliviadean_primary",
                alt_img_srcs: ["oliviadean_alt_1","oliviadean_alt_2","oliviadean_alt_3","oliviadean_alt_4","oliviadean_alt_5","oliviadean_alt_6"],
                city: "San Diego, CA", date: "2025-11-20", time: "8:30 PM"
            },
            {
                name: "Geese", slogan: "Getting Killed Tour", primary_img_src: "geese_primary",
                alt_img_srcs: ["geese_alt_1", "geese_alt_2", "geese_alt_3", "geese_alt_4", "geese_alt_5", "geese_alt_6"],
                city: "Portland, ME", date: "2025-10-18", time: "7:30 PM"
            }, 
            {
                name: "Kacy Hill", slogan: "Bug Tour", primary_img_src: "kacyhill_primary",
                alt_img_srcs: ["kacyhill_alt_1","kacyhill_alt_2","kacyhill_alt_3","kacyhill_alt_4","kacyhill_alt_5","kacyhill_alt_6"],
                city: "Austin, TX", date: "2025-11-08", time: "6 PM"
            },
            {
                name: "Jay-Z", slogan: "Homecoming Tour", primary_img_src: "jayz_primary",
                alt_img_srcs: ["jayz_alt_1","jayz_alt_2","jayz_alt_3","jayz_alt_4","jayz_alt_5","jayz_alt_6"],
                city: "Brooklyn, NY", date: "2025-10-27", time: "9 PM"
            },
            {
                name: "Adele", slogan: "25 Tour", primary_img_src: "adele_primary",
                alt_img_srcs: ["adele_alt_1","adele_alt_2","adele_alt_3","adele_alt_4","adele_alt_5","adele_alt_6"],
                city: "Seattle, WA", date: "2025-11-14", time: "7 PM"
            },
        ];

        for (const course of sampleEvents) {
            await Event.updateOne(
                { name: course.name }, // match unique field
                { $set: course }, // set/update data
                { upsert: true }  // create if it doesn't exist
            );
        }

        console.log("Events seeded successfully.");
    } catch (err) {
        console.error("Error creating events:", err);
    }
}
