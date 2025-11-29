// This file is a central place to define frontend types

// --- Event ---
export interface Event {
    _id: string; // Mongo _id
    name: string;
    slogan: string;
    primary_img_src: string;
    alt_img_srcs: string[];
    city: string;
    date: Date;
    time: string;
    transaction_id?: string;
}

// --- Transaction ---
export interface Transaction {
    id: string; // Mongo _id
    user_id: UserProfile;
    event_id: Event;
    ticket_quantity: number;
}

// --- Carted / Purchased Event Objects ---
export interface EventWithQuantity {
    event_id: Event;           // Populated Event object (or ID)
    ticket_quantity: number;   // Quantity selected for that event
}

// --- User Profile ---
export interface UserProfile {
    id: string; // Mongo _id
    first_name: string;
    last_name: string;
    name: string;
    picture: string;
    email: string;
    phone_number?: number;
    address?: string;
    carted_events?: EventWithQuantity[];  
    purchased_events?: EventWithQuantity[];
    is_deleted?: Date;
}
