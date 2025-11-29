import {
    GetUsersResponse,
    GetUserByEmailResponse,
    CreateUserRequest,
    CreateUserResponse,
    UpdateUserRequest,
    UpdateUserResponse,
    GetEventsResponse,
    CreateTransactionRequest,
    CreateTransactionResponse,
    DeleteTransactionRequest,
    DeleteTransactionResponse,
    GetTransactionsResponse,
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
    // --- Users ---
    getUsers: (): Promise<GetUsersResponse> =>
        request<GetUsersResponse>(`${API_BASE}/users`),

    getUserByEmail: async (email: string): Promise<GetUserByEmailResponse> => {
        try {
            return await request<GetUserByEmailResponse>(
                `${API_BASE}/users/email/${encodeURIComponent(email)}`
            );
        } catch (err: any) {
            if (err.message.includes("404")) return { user: null };
            throw err;
        }
    },

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


    deleteUser: (id: string): Promise<void> =>
        request<void>(`${API_BASE}/users/${id}`, { method: "DELETE" }),

    // --- User Cart Actions ---
    addEventToCart: (
        userId: string,
        eventId: string,
        ticket_quantity: number
    ) =>
        request<UpdateUserResponse>(`${API_BASE}/users/${userId}/cart`, {
            method: "POST",
            body: JSON.stringify({ eventId, ticket_quantity }),
        }),

    removeEventFromCart: (userId: string, eventId: string) =>
        request<UpdateUserResponse>(`${API_BASE}/users/${userId}/cart/${eventId}`, {
            method: "DELETE",
        }),

    // --- Events ---
    getEvents: (): Promise<GetEventsResponse> =>
        request<GetEventsResponse>(`${API_BASE}/events`),

    // --- Transactions ---
    createTransaction: (
        payload: CreateTransactionRequest
    ): Promise<CreateTransactionResponse> =>
        request<CreateTransactionResponse>(`${API_BASE}/transactions`, {
            method: "POST",
            body: JSON.stringify(payload),
        }),

    deleteTransaction: (
        payload: DeleteTransactionRequest
    ): Promise<DeleteTransactionResponse> =>
        request<DeleteTransactionResponse>(
            `${API_BASE}/transactions/${payload.transaction_id}`,
            { method: "DELETE" }
        ),

    getTransactions: (user_id: string): Promise<GetTransactionsResponse> =>
        request<GetTransactionsResponse>(
            `${API_BASE}/transactions?user_id=${user_id}`
        ),

    //Route to backend logger function
    addLogToServer: async (level: "info" | "error", message: string, meta?: any) => {
        try {
            const logEntry = {
                level,
                message,
                meta,
                timestamp: new Date().toISOString(),
            };

            // POST to backend log route
            await request(`${API_BASE}/logs`, {
                method: "POST",
                body: JSON.stringify(logEntry),
            });
        } catch (err) {
            // fallback local logging only if server unreachable
            console.warn("Failed to send log to server:", err);
        }
    },

};
