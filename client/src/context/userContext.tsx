/**
 * This component defines a global 'user' object to acess user data from all site pages
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

    // Refresh user profile from backend
    const refreshUser = async () => {
        if (!user?.email) return;

        try {
            const res = await apiClient.getUserByEmail(user.email);
            if (res.user) {
                const backendUser = res.user;

                const updatedUser: UserProfile = {
                    id: backendUser._id,
                    email: backendUser.email,
                    first_name: backendUser.first_name,
                    last_name: backendUser.last_name,
                    name: user.name || backendUser.name || "",
                    picture: user.picture || backendUser.picture || "",
                    phone_number: backendUser.phone_number,
                    address: backendUser.address,
                    carted_events: backendUser.carted_events || [],
                    purchased_events: backendUser.purchased_events || [],
                };

                setUser(updatedUser);
            }
        } catch (err) {
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
