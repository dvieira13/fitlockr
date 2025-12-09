// src/types/types.api.ts
// This file is a central place to define API payloads and responses

import type {
    AuthType,
    PieceType,
    PieceColor,
    ItemTags,
    ShelfItemType,
} from "./types";

export interface ProductFromUrlResponse {
    primaryImage?: string | null;
    secondaryImages?: string[];
    name?: string;
    brand?: string;
    type?: string;        // you'll map this to PieceType on front-end
    colors?: string[];    // use your backend color names here
}

// --- Users ---

export interface UserAPI {
    _id: string;
    first_name: string;
    last_name: string;
    name: string;
    username: string;
    email: string;
    picture?: string | null;
    auth_type: AuthType;
    all_items?: {
        item_id: string;
        item_type: "Piece" | "Outfit";
    }[];
    pieces?: string[];
    outfits?: string[];
    shelves?: string[];
    is_deleted?: string | null;
}

export interface GetUsersResponse {
    users: UserAPI[];
}

export interface GetUserByEmailResponse {
    user: UserAPI | null;
}

export interface GetUserByUsernameResponse {
    user: UserAPI | null;
}

export interface CreateUserRequest {
    first_name: string;
    last_name: string;
    name: string;
    username: string;
    email: string;
    picture?: string;
    auth_type?: AuthType;
    password?: string;
}

export interface CreateUserResponse {
    user: UserAPI;
}

export interface UpdateUserRequest {
    id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    username?: string;
    email?: string;
    picture?: string;
    auth_type?: AuthType;
    all_items?: {
        item_id: string;
        item_type: "Piece" | "Outfit";
    }[];
    pieces?: string[];
    outfits?: string[];
    shelves?: string[];
    is_deleted?: string | null;
}

export interface UpdateUserResponse {
    user: UserAPI;
}

export interface UploadProfilePictureResponse {
    user: UserAPI;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    user: UserAPI;
}

// --- Pieces ---

export interface PieceAPI {
    _id: string;
    primary_img: string;
    secondary_imgs?: string[];
    name: string;
    notes?: string;
    owned: boolean;
    type: PieceType;
    subtype?: string;
    colors: PieceColor[];
    brand?: string;
    size?: string;
    price?: string;
    product_link?: string;
    tags?: ItemTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string;
    created_date: string; // ISO
}

export interface GetPiecesResponse {
    pieces: PieceAPI[];
}

export interface GetPieceResponse {
    piece: PieceAPI;
}

export interface CreatePieceRequest {
    primary_img: string;
    secondary_imgs?: string[];
    name: string;
    notes?: string;
    owned: boolean;
    type: PieceType;
    subtype?: string;
    colors: PieceColor[];
    brand?: string;
    size?: string;
    price?: string;
    product_link?: string;
    tags?: ItemTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string;
    created_date?: string;
}

export interface CreatePieceResponse {
    piece: PieceAPI;
}

export interface UpdatePieceRequest {
    id: string;
    primary_img?: string;
    secondary_imgs?: string[];
    name?: string;
    notes?: string;
    owned?: boolean;
    type?: PieceType;
    subtype?: string;
    colors?: PieceColor[];
    brand?: string;
    size?: string;
    price?: string;
    product_link?: string;
    tags?: ItemTags;
}

export interface UpdatePieceResponse {
    piece: PieceAPI;
}

// --- Outfits ---

export interface OutfitAPI {
    _id: string;
    pieces: string[]; // piece IDs (backend may populate; we treat as IDs)
    name: string;
    tags?: ItemTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string;
    created_date: string;
}

export interface GetOutfitsResponse {
    outfits: OutfitAPI[];
}

export interface GetOutfitResponse {
    outfit: OutfitAPI;
}

export interface CreateOutfitRequest {
    name: string;
    pieces: string[]; // piece IDs
    tags?: ItemTags;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string;
    created_date?: string;
}

export interface CreateOutfitResponse {
    outfit: OutfitAPI;
}

export interface UpdateOutfitRequest {
    id: string;
    name?: string;
    pieces?: string[];
    tags?: ItemTags;
}

export interface UpdateOutfitResponse {
    outfit: OutfitAPI;
}

// --- Shelves ---

export interface ShelfItemAPI {
    item_id: string;
    item_type: ShelfItemType;
    item_added_date: string;
}

export interface ShelfAPI {
    _id: string;
    items: ShelfItemAPI[];
    name: string;
    created_by_name: string;
    created_by_username: string;
    created_by_id: string;
    created_date: string;
}

export interface GetShelvesResponse {
    shelves: ShelfAPI[];
}

export interface GetShelfResponse {
    shelf: ShelfAPI;
}

export interface CreateShelfRequest {
    name: string;
    items?: {
        item_id: string;
        item_type: ShelfItemType;
        item_added_date?: string;
    }[];
    created_by_name: string;
    created_by_username: string;
    created_by_id: string;
    created_date?: string;
}

export interface CreateShelfResponse {
    shelf: ShelfAPI;
}

export interface UpdateShelfRequest {
    id: string;
    name?: string;
    items?: {
        item_id: string;
        item_type: ShelfItemType;
        item_added_date?: string;
    }[];
}

export interface UpdateShelfResponse {
    shelf: ShelfAPI;
}

export interface AddShelfItemRequest {
    shelf_id: string;
    item_id: string;
    item_type: ShelfItemType;
    item_added_date?: string;
}

export interface RemoveShelfItemRequest {
    shelf_id: string;
    item_id: string;
    item_type: ShelfItemType;
}
