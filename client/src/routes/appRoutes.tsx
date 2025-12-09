// src/routes/AppRoutes.tsx
import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import MainLayout from "../layouts/mainLayout";
import Home from "../pages/home";
import Login from "../pages/user/login";
import Account from "../pages/user/account";
import CreateAccount from "../pages/user/create-account";
import Locker from "../pages/locker";
import Pieces from "../pages/locker/pieces";
import Outfits from "../pages/locker/outfits";
import Shelves from "../pages/locker/shelves";
import ShelfPage from "../pages/locker/shelf";
import ProtectedRoute from "./protectedRoute";

const ScrollToTop: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        // Scroll to top on every navigation
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "auto", // use "smooth" if you want animated scrolling
        });
    }, [location.pathname]);

    return null;
};

export default function AppRoutes() {
    return (
        <>
            {/* This listens to route changes and scrolls the window to the top */}
            <ScrollToTop />

            <Routes>
                <Route element={<MainLayout />}>
                    {/* Public routes */}
                    <Route path="/auth/login" element={<Login />} />

                    <Route
                        path="/auth/create-account"
                        element={
                            <ProtectedRoute>
                                <CreateAccount />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Home />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected routes */}
                    <Route
                        path="/account"
                        element={
                            <ProtectedRoute>
                                <Account />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/locker"
                        element={
                            <ProtectedRoute>
                                <Locker />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/locker/pieces"
                        element={
                            <ProtectedRoute>
                                <Pieces />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/locker/outfits"
                        element={
                            <ProtectedRoute>
                                <Outfits />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/locker/shelves"
                        element={
                            <ProtectedRoute>
                                <Shelves />
                            </ProtectedRoute>
                        }
                    />
                    {/* dynamic shelf page */}
                    <Route
                        path="/locker/shelves/:shelfSlug"
                        element={
                            <ProtectedRoute>
                                <ShelfPage />
                            </ProtectedRoute>
                        }
                    />
                </Route>
            </Routes>
        </>
    );
}
