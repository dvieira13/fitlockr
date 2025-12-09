/**
 * Route protection wrapper that:
 * - Always allows access to the home page ("/")
 * - Redirects all other routes to "/login" when the user is not authenticated
 */

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../context/userContext";

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user } = useUser();
    const location = useLocation();

    // Always allow home ("/")
    if (location.pathname === "/" || location.pathname === "/auth/create-account") {
        return <>{children}</>;
    }

    // For all other routes, require login
    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
