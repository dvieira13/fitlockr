// src/pages/auth/Login.tsx
import { useState, FormEvent } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

import "../../styles/index.css";
import "../../styles/pages/auth.css";

import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";
import {
    CreateUserRequest,
    CreateUserResponse,
    GetUserByEmailResponse,
    LoginResponse,
} from "../../types/types.api";

const Login = () => {
    const { setUser, refreshUser } = useUser();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{
        username: boolean;
        password: boolean;
        general?: string;
    }>({
        username: false,
        password: false,
        general: undefined,
    });

    // ───────────────────────────── Google Login ─────────────────────────────

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            await apiClient.addLogToServer("error", "No credential found in Google response");
            return;
        }

        const decoded: any = jwtDecode(credentialResponse.credential);

        const googleUser = {
            first_name: decoded.given_name,
            last_name: decoded.family_name,
            name: decoded.name,
            email: decoded.email,
            picture: decoded.picture,
        };

        await apiClient.addLogToServer("info", "✅ Google user data received", googleUser);

        try {
            // 1️⃣ Check if the user already exists in the database (by email)
            let dbUserResponse: GetUserByEmailResponse = await apiClient.getUserByEmail(
                googleUser.email
            );
            let dbUser = dbUserResponse.user;

            // 2️⃣ If not found, create a new user (auth_type "google")
            if (!dbUser) {
                await apiClient.addLogToServer("info", "🆕 User not found, creating new user...");

                const usernameFromEmail =
                    typeof googleUser.email === "string"
                        ? googleUser.email.split("@")[0]
                        : googleUser.email;

                const payload: CreateUserRequest = {
                    first_name: googleUser.first_name,
                    last_name: googleUser.last_name,
                    name: googleUser.name,
                    username: usernameFromEmail,
                    email: googleUser.email,
                    picture: googleUser.picture,
                    auth_type: "google",
                };

                const createdUserResponse: CreateUserResponse =
                    await apiClient.createUser(payload);
                dbUser = createdUserResponse.user;

                await apiClient.addLogToServer("info", "✅ New user created", dbUser);
            } else {
                await apiClient.addLogToServer("info", "✅ User found in DB", dbUser);

                // Optional: re-fetch freshest version
                const refreshedResponse: GetUserByEmailResponse =
                    await apiClient.getUserByEmail(googleUser.email);
                dbUser = refreshedResponse.user;
            }

            if (dbUser) {
                setUser({
                    id: dbUser._id,
                    first_name: dbUser.first_name,
                    last_name: dbUser.last_name,
                    name: dbUser.name,
                    username: dbUser.username,
                    email: dbUser.email,
                    picture: dbUser.picture ?? null,
                    auth_type: dbUser.auth_type ?? "google",
                    all_items: dbUser.all_items || [],
                    pieces: dbUser.pieces || [],
                    outfits: dbUser.outfits || [],
                    shelves: dbUser.shelves || [],
                    is_deleted: dbUser.is_deleted ? new Date(dbUser.is_deleted) : null,
                });

                await refreshUser();
            }

            await apiClient.addLogToServer("info", "✅ User fully loaded into context", dbUser);

            navigate("/locker");
        } catch (err: any) {
            await apiClient.addLogToServer("error", "❌ Error during Google login flow", err);
            setErrors((prev) => ({
                ...prev,
                general: "Something went wrong with Google sign in. Please try again.",
            }));
        }
    };

    const handleGoogleError = async () => {
        await apiClient.addLogToServer("error", "Google Login Failed");
        setErrors((prev) => ({
            ...prev,
            general: "Google sign in failed. Please try again.",
        }));
    };

    // ───────────────────────────── Native Login ─────────────────────────────

    const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const usernameEmpty = username.trim() === "";
        const passwordEmpty = password.trim() === "";

        setErrors({
            username: usernameEmpty,
            password: passwordEmpty,
            general: undefined,
        });

        if (usernameEmpty || passwordEmpty) {
            return; // stop – show input-error highlights
        }

        try {
            const res: LoginResponse = await apiClient.loginWithCredentials({
                username,
                password,
            });

            const dbUser = res.user;

            setUser({
                id: dbUser._id,
                first_name: dbUser.first_name,
                last_name: dbUser.last_name,
                name: dbUser.name,
                username: dbUser.username,
                email: dbUser.email,
                picture: dbUser.picture ?? null,
                auth_type: dbUser.auth_type ?? "native",
                all_items: dbUser.all_items || [],
                pieces: dbUser.pieces || [],
                outfits: dbUser.outfits || [],
                shelves: dbUser.shelves || [],
                is_deleted: dbUser.is_deleted ? new Date(dbUser.is_deleted) : null,
            });

            await refreshUser();
            navigate("/locker");
        } catch (err: any) {
            await apiClient.addLogToServer("error", "❌ Error during native username login", err);
            setErrors({
                username: false,
                password: false,
                general: "Invalid username or password.",
            });
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-container-header">
                <h2>Log In</h2>
            </div>
            <div className="auth-inner">
                {/* Google OAuth login */}
                <div className="google-login-wrapper">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        shape="rectangular"
                        logo_alignment="center"
                        text="continue_with"
                    />
                </div>

                <div className="separator-line"></div>

                {/* Username / password login */}
                <form className="auth-form" onSubmit={handleCredentialsSubmit}>
                    <label className="input-label" htmlFor="username">
                        username
                        <input
                            id="username"
                            name="username"
                            type="text"
                            className={`auth-input ${errors.username ? "input-error" : ""}`}
                            autoComplete="username"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (errors.username && e.target.value.trim() !== "") {
                                    setErrors((prev) => ({ ...prev, username: false }));
                                }
                            }}
                        />
                    </label>

                    <label className="input-label" htmlFor="password">
                        password
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className={`auth-input ${errors.password ? "input-error" : ""}`}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password && e.target.value.trim() !== "") {
                                    setErrors((prev) => ({ ...prev, password: false }));
                                }
                            }}
                        />
                    </label>

                    {errors.general && (
                        <p className="error-text caption-copy">{errors.general}</p>
                    )}

                    <button type="submit" className="button auth-button">
                        <p className="body-copy bold-text">Log In</p>
                    </button>
                </form>

                <a
                    className="auth-form-footer-message"
                    href="/auth/create-account"
                    aria-label="Don't have an account? Join for free!"
                >
                    <p className="caption-copy">Don't have an account?</p>
                    <p className="caption-copy hyperlink-text">Join for free!</p>
                </a>
            </div>
        </div>
    );
};

export default Login;
