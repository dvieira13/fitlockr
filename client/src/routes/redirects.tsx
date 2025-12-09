// src/components/RouteRedirects.tsx
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/userContext";

const RouteRedirects = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    // Was there a logged-in user when this component first mounted?
    // This value is frozen on the very first render.
    const hadUserOnMount = useRef(!!user);

    useEffect(() => {
        const { pathname } = location;

        // Only do ANY redirect logic if:
        // 1) There is a user now
        // 2) That user already existed on initial mount (i.e. not just logged in)
        if (!user) return;
        if (!hadUserOnMount.current) return;

        // If user is already logged in and manually visits an auth route,
        // push them to Account instead.
        if (pathname.startsWith("/auth")) {
            navigate("/account", { replace: true });
            return;
        }
    }, [user, location, navigate]);

    return null;
};

export default RouteRedirects;
