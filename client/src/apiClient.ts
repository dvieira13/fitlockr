import {
    ProductFromUrlResponse,
    // Users
    GetUsersResponse,
    GetUserByEmailResponse,
    GetUserByUsernameResponse,
    CreateUserRequest,
    CreateUserResponse,
    UpdateUserRequest,
    UpdateUserResponse,
    LoginRequest,
    LoginResponse,
    // Pieces
    GetPiecesResponse,
    GetPieceResponse,
    CreatePieceRequest,
    CreatePieceResponse,
    UpdatePieceRequest,
    UpdatePieceResponse,
    // Outfits
    GetOutfitsResponse,
    GetOutfitResponse,
    CreateOutfitRequest,
    CreateOutfitResponse,
    UpdateOutfitRequest,
    UpdateOutfitResponse,
    // Shelves
    GetShelvesResponse,
    GetShelfResponse,
    CreateShelfRequest,
    CreateShelfResponse,
    UpdateShelfRequest,
    UpdateShelfResponse,
    AddShelfItemRequest,
    RemoveShelfItemRequest,
} from "./types/types.api";

const API_BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api";

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`API error: ${JSON.stringify(errorData)}`);
    }

    return res.json();
}

export const apiClient = {
    getProductFromUrl: (payload: { url: string }): Promise<ProductFromUrlResponse> =>
        request<ProductFromUrlResponse>(`${API_BASE}/pieces/scrape-from-url`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    // --- Users ---

    getUsers: (): Promise<GetUsersResponse> =>
        request<GetUsersResponse>(`${API_BASE}/users`),

    getUserByEmail: (email: string): Promise<GetUserByEmailResponse> =>
        request<GetUserByEmailResponse>(
            `${API_BASE}/users/email/${encodeURIComponent(email)}`
        ),

    getUserByUsername: (username: string): Promise<GetUserByUsernameResponse> =>
        request<GetUserByUsernameResponse>(
            `${API_BASE}/users/username/${encodeURIComponent(username)}`
        ),

    createUser: (payload: CreateUserRequest): Promise<CreateUserResponse> =>
        request<CreateUserResponse>(`${API_BASE}/users`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    updateUser: (payload: UpdateUserRequest): Promise<UpdateUserResponse> =>
        request<UpdateUserResponse>(`${API_BASE}/users/${payload.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),

    updateUserPartial: (
        payload: Partial<UpdateUserRequest> & { id: string }
    ): Promise<UpdateUserResponse> =>
        request<UpdateUserResponse>(`${API_BASE}/users/${payload.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),

    updatePassword: (payload: { user_id: string; new_password: string }) =>
        request<void>(`${API_BASE}/users/update-password`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    // (Cloudinary route)
    uploadProfilePicture: (payload: {
        user_id: string;
        image: string; // base64 data URL
    }): Promise<UpdateUserResponse> =>
        request<UpdateUserResponse>(
            `${API_BASE}/users/${payload.user_id}/profile-picture`,
            {
                method: "POST",
                body: JSON.stringify({ image: payload.image }),
            }
        ),

    deleteUser: (id: string): Promise<void> =>
        request<void>(`${API_BASE}/users/${id}`, { method: "DELETE" }),

    loginWithCredentials: (
        payload: LoginRequest
    ): Promise<LoginResponse> =>
        request<LoginResponse>(`${API_BASE}/auth/login`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    // --- User–Piece relations ---
    getUserPieces: (userId: string) =>
        request<{ pieces: any[] }>(`${API_BASE}/users/${userId}/pieces`),

    addPieceToUser: (userId: string, pieceId: string) =>
        request<UpdateUserResponse>(`${API_BASE}/users/${userId}/pieces`, {
            method: "POST",
            body: JSON.stringify({ piece_id: pieceId }),
        }),

    removePieceFromUser: (userId: string, pieceId: string) =>
        request<UpdateUserResponse>(
            `${API_BASE}/users/${userId}/pieces/${pieceId}`,
            { method: "DELETE" }
        ),

    // --- User–Outfit relations ---
    getUserOutfits: (userId: string) =>
        request<{ outfits: any[] }>(`${API_BASE}/users/${userId}/outfits`),

    addOutfitToUser: (userId: string, outfitId: string) =>
        request<UpdateUserResponse>(`${API_BASE}/users/${userId}/outfits`, {
            method: "POST",
            body: JSON.stringify({ outfit_id: outfitId }),
        }),

    removeOutfitFromUser: (userId: string, outfitId: string) =>
        request<UpdateUserResponse>(
            `${API_BASE}/users/${userId}/outfits/${outfitId}`,
            { method: "DELETE" }
        ),

    // --- User–Shelf relations ---
    getUserShelves: (userId: string) =>
        request<{ shelves: any[] }>(`${API_BASE}/users/${userId}/shelves`),

    addShelfToUser: (userId: string, shelfId: string) =>
        request<UpdateUserResponse>(`${API_BASE}/users/${userId}/shelves`, {
            method: "POST",
            body: JSON.stringify({ shelf_id: shelfId }),
        }),

    removeShelfFromUser: (userId: string, shelfId: string) =>
        request<UpdateUserResponse>(
            `${API_BASE}/users/${userId}/shelves/${shelfId}`,
            { method: "DELETE" }
        ),

    // --- Pieces ---
    getPieces: (created_by_id?: string): Promise<GetPiecesResponse> => {
        const query = created_by_id
            ? `?created_by_id=${encodeURIComponent(created_by_id)}`
            : "";
        return request<GetPiecesResponse>(`${API_BASE}/pieces${query}`);
    },

    getPiece: (id: string): Promise<GetPieceResponse> =>
        request<GetPieceResponse>(`${API_BASE}/pieces/${id}`),

    getPieceTags: (): Promise<{
        tags: {
            comfort: { key: string; label: string }[];
            season: { key: string; label: string }[];
        };
    }> => request(`${API_BASE}/pieces/tags`),

    uploadPieceImage: (payload: { image: string }): Promise<{ url: string; public_id?: string }> =>
        request<{ url: string; public_id?: string }>(`${API_BASE}/pieces/upload-image`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    uploadPieceImageFromUrl: (
        payload: { url: string; folder?: string }
    ): Promise<{ url: string }> =>
        request<{ url: string }>(
            `${API_BASE}/pieces/upload-image-from-url`,
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        ),

    createPiece: (payload: CreatePieceRequest): Promise<CreatePieceResponse> =>
        request<CreatePieceResponse>(`${API_BASE}/pieces`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    updatePiece: (payload: UpdatePieceRequest): Promise<UpdatePieceResponse> =>
        request<UpdatePieceResponse>(`${API_BASE}/pieces/${payload.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),

    deletePiece: (id: string): Promise<void> =>
        request<void>(`${API_BASE}/pieces/${id}`, { method: "DELETE" }),

    // --- Outfits ---
    getOutfits: (created_by_id?: string): Promise<GetOutfitsResponse> => {
        const query = created_by_id
            ? `?created_by_id=${encodeURIComponent(created_by_id)}`
            : "";
        return request<GetOutfitsResponse>(`${API_BASE}/outfits${query}`);
    },

    getOutfit: (id: string): Promise<GetOutfitResponse> =>
        request<GetOutfitResponse>(`${API_BASE}/outfits/${id}`),

    createOutfit: (
        payload: CreateOutfitRequest
    ): Promise<CreateOutfitResponse> =>
        request<CreateOutfitResponse>(`${API_BASE}/outfits`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    updateOutfit: (
        payload: UpdateOutfitRequest
    ): Promise<UpdateOutfitResponse> =>
        request<UpdateOutfitResponse>(`${API_BASE}/outfits/${payload.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),

    deleteOutfit: (id: string): Promise<void> =>
        request<void>(`${API_BASE}/outfits/${id}`, { method: "DELETE" }),

    // --- Shelves ---
    getShelves: (created_by_id?: string): Promise<GetShelvesResponse> => {
        const query = created_by_id
            ? `?created_by_id=${encodeURIComponent(created_by_id)}`
            : "";
        return request<GetShelvesResponse>(`${API_BASE}/shelves${query}`);
    },

    getShelf: (id: string): Promise<GetShelfResponse> =>
        request<GetShelfResponse>(`${API_BASE}/shelves/${id}`),

    createShelf: (payload: CreateShelfRequest): Promise<CreateShelfResponse> =>
        request<CreateShelfResponse>(`${API_BASE}/shelves`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    updateShelf: (payload: UpdateShelfRequest): Promise<UpdateShelfResponse> =>
        request<UpdateShelfResponse>(`${API_BASE}/shelves/${payload.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        }),

    deleteShelf: (id: string): Promise<void> =>
        request<void>(`${API_BASE}/shelves/${id}`, { method: "DELETE" }),

    addShelfItem: (payload: AddShelfItemRequest): Promise<UpdateShelfResponse> =>
        request<UpdateShelfResponse>(
            `${API_BASE}/shelves/${payload.shelf_id}/items`,
            {
                method: "POST",
                body: JSON.stringify({
                    item_id: payload.item_id,
                    item_type: payload.item_type,
                }),
            }
        ),

    removeShelfItem: (
        payload: RemoveShelfItemRequest
    ): Promise<UpdateShelfResponse> =>
        request<UpdateShelfResponse>(
            `${API_BASE}/shelves/${payload.shelf_id}/items/${payload.item_id}?item_type=${encodeURIComponent(
                payload.item_type
            )}`,
            { method: "DELETE" }
        ),

    // --- Backend logger ---
    addLogToServer: async (
        level: "info" | "error",
        message: string,
        meta?: any
    ) => {
        try {
            const logEntry = {
                level,
                message,
                meta,
                timestamp: new Date().toISOString(),
            };

            await request(`${API_BASE}/logs`, {
                method: "POST",
                body: JSON.stringify(logEntry),
            });
        } catch (err) {
            console.warn("Failed to send log to server:", err);
        }
    },
};
