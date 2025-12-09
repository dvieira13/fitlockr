/**
 * This component defines a global 'user' object to access user data from all site pages
 */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserProfile } from "../types/types";
import { apiClient } from "../apiClient";

interface UserContextType {
    user: UserProfile | null;
    setUser: (user: UserProfile | null) => void;
    refreshUser: () => Promise<void>;
    signOut: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUserState] = useState<UserProfile | null>(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch {
                return null;
            }
        }
        return null;
    });

    // Unified setUser — keeps localStorage in sync
    const setUser = (updatedUser: UserProfile | null) => {
        setUserState(updatedUser);
        if (updatedUser) {
            localStorage.setItem("user", JSON.stringify(updatedUser));
        } else {
            localStorage.removeItem("user");
        }
    };

    // Helper: normalize backend user → frontend UserProfile
    const mapBackendUserToProfile = (backendUser: any): UserProfile => {
        // pieces/outfits/shelves may be either ObjectId strings or populated docs
        const normalizeIdArray = (arr: any[] | undefined): string[] =>
            (arr || []).map((item: any) =>
                typeof item === "string" ? item : item?._id?.toString()
            );

        return {
            id: backendUser._id,
            email: backendUser.email,
            username: backendUser.username,
            first_name: backendUser.first_name,
            last_name: backendUser.last_name,
            name: backendUser.name || `${backendUser.first_name} ${backendUser.last_name}` || "",
            picture: backendUser.picture ?? null,
            auth_type: backendUser.auth_type ?? "native",
            all_items: backendUser.all_items || [],
            pieces: normalizeIdArray(backendUser.pieces),
            outfits: normalizeIdArray(backendUser.outfits),
            shelves: normalizeIdArray(backendUser.shelves),
            is_deleted: backendUser.is_deleted ? new Date(backendUser.is_deleted) : null,
        };
    };

    // Refresh user profile from backend
    const refreshUser = async () => {
        if (!user?.email) return;

        try {
            const res = await apiClient.getUserByEmail(user.email);

            if (res && (res as any).user) {
                const updatedUser = mapBackendUserToProfile((res as any).user);
                setUser(updatedUser);
            }

            // ❌ IMPORTANT:
            // Don't call setUser(null) here just because res.user is missing.
            // There are plenty of reasons the API might not return user
            // (unauthenticated, different shape, transient error, etc).
            // We'll treat this as "best effort" refresh and keep the existing user.

        } catch (err) {
            // Log, but don't wipe the user either.
            await apiClient.addLogToServer("error", "Failed to refresh user", err);
        }
    };

    const signOut = () => {
        setUser(null);
    };

    // Auto-refresh on mount if user exists
    useEffect(() => {
        if (user?.email) {
            refreshUser();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, refreshUser, signOut }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) throw new Error("useUser must be used within a UserProvider");
    return context;
};