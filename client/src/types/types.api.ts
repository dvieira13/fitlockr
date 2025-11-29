// This file is a central place to define API payloads and responses

// --- Events ---
export interface EventAPI {
    _id: string;
    name: string;
    slogan: string;
    primary_img_src: string;
    alt_img_srcs: string[];
    city: string;
    date: Date;
    time: string;
}

// --- Carted / Purchased Event Objects ---
export interface EventWithQuantityAPI {
    event_id: EventAPI;          // Populated Event object (or ID if not populated)
    ticket_quantity: number;
}

// --- Users ---
export interface UserAPI {
    _id: string;
    first_name: string;
    last_name: string;
    name: string;
    picture: string;
    email: string;
    phone_number?: number;
    address?: string;
    carted_events?: EventWithQuantityAPI[];
    purchased_events?: EventWithQuantityAPI[];
    is_deleted?: Date;
}

export interface GetUsersResponse {
    users: UserAPI[];
}

export interface GetUserByEmailResponse {
    user: UserAPI | null;
}

export interface CreateUserRequest {
    first_name: string;
    last_name: string;
    name: string;
    picture: string;
    email: string;
}

export interface CreateUserResponse {
    user: UserAPI;
}

export interface UpdateUserRequest {
    id: string;
    first_name?: string;
    last_name?: string;
    name: string;
    picture: string;
    email?: string;
    phone_number?: number;
    address?: string;
    carted_events?: EventWithQuantityAPI[];
    purchased_events?: EventWithQuantityAPI[];
}

export interface UpdateUserResponse {
    user: UserAPI;
}

// --- Events ---
export interface GetEventsResponse {
    events: EventAPI[];
}

// --- Transactions ---
export interface CreateTransactionRequest {
    user_id: string;
    event_id: string;
    ticket_quantity: number;
}

export interface CreateTransactionResponse {
    transaction: {
        id: string;
        user_id: string;
        event: EventAPI;
        ticket_quantity: number;
    };
}

export interface DeleteTransactionRequest {
    transaction_id: string;
}

export interface DeleteTransactionResponse {
    message: string;
}

export interface TransactionWithEvent {
    id: string; // Mongo _id
    name: string;
    slogan: string;
    primary_img_src: string;
    alt_img_srcs: string[];
    city: string;
    date: Date;
    time: string;
    transaction_id?: string;
}

export interface GetTransactionsResponse {
    events: TransactionWithEvent[];
}
