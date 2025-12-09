// This file is a central place to define frontend types

export type AuthType = "native" | "google";

// --- Shared Tag Types ---

export interface ComfortTags {
    comfy: boolean;
    casual: boolean;
    classy: boolean;
}

export interface SeasonTags {
    fall: boolean;
    winter: boolean;
    spring: boolean;
    summer: boolean;
}

export interface ItemTags {
    comfort: ComfortTags;
    season: SeasonTags;
}

// --- User Profile ---

export interface UserProfile {
    id: string; // Mongo _id
    first_name: string;
    last_name: string;
    name: string;
    username: string;
    email: string;
    picture?: string | null;
    auth_type: AuthType;
    all_items?: AllItemRef[];
    pieces?: string[];   // piece IDs
    outfits?: string[];  // outfit IDs
    shelves?: string[];  // shelf IDs
    is_deleted?: Date | null;
}

export type AllItemType = "Piece" | "Outfit";

export interface AllItemRef {
    item_id: string; // Mongo ObjectId as string
    item_type: AllItemType;
}

// --- Piece ---

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

export interface Piece {
    id: string; // Mongo _id
    primary_img: string;
    secondary_imgs?: string[];
    name: string;
    notes?: string;
    owned: boolean;
    type: PieceType;
    subtype?: string; // concrete pairing enforced in UI (Hat, Beanie, etc)
    colors: PieceColor[];
    brand?: string;
    size?: string;
    price?: string;
    product_link?: string;
    tags?: ItemTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string; // User _id
    created_date: Date;
}

// --- Outfit ---

export interface Outfit {
    id: string; // Mongo _id
    pieces: string[]; // piece IDs (we can populate separately)
    name: string;
    tags?: ItemTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string; // User _id
    created_date: Date;
}

// --- Shelf ---

export type ShelfItemType = "Piece" | "Outfit";

export interface ShelfItem {
    item_id: string;
    item_type: ShelfItemType;
    item_added_date: Date;
}

export interface Shelf {
    id: string; // Mongo _id
    items: ShelfItem[];
    name: string;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string; // User _id
    created_date: Date;
}
