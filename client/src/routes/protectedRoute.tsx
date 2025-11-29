/**
 * A wrapper component that protects routes from unauthorized access.
 *
 * This component checks if a user is logged in using the `useUser` context.
 * - If the user is **not logged in**, it redirects them to the `/login` page.
 * - If the user **is logged in**, it renders the child components.
 */

import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/userContext";

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user } = useUser();

    if (!user) {
        // Redirect to login if user is not logged in
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
