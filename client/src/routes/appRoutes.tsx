import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/mainLayout";
import Home from "../pages/home";
import Login from "../pages/user/login";
import Account from "../pages/user/account";
import Cart from "../pages/cart";
import Confirmation from "../pages/checkout/confirmation";
import ProtectedRoute from "./protectedRoute";

export default function AppRoutes() {
    return (
        <Routes>
            <Route element={<MainLayout />}>
                {/* Public route */}
                <Route path="/login" element={<Login />} />

                {/* Protected routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Home />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/account"
                    element={
                        <ProtectedRoute>
                            <Account />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/cart"
                    element={
                        <ProtectedRoute>
                            <Cart />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/confirmation"
                    element={
                        <ProtectedRoute>
                            <Confirmation />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}