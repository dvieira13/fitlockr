// src/pages/auth/CreateAccount.tsx
import { useState, FormEvent } from "react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

import "../../styles/index.css";
import "../../styles/pages/auth.css";

import { apiClient } from "../../apiClient";
import { useUser } from "../../context/userContext";
import {
    CreateUserRequest,
    CreateUserResponse,
    GetUserByEmailResponse,
    GetUserByUsernameResponse,
} from "../../types/types.api";

// Simple email validator
const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const CreateAccount = () => {
    const { setUser, refreshUser } = useUser();
    const navigate = useNavigate();

    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm_password, setConfirmPassword] = useState("");

    const [errors, setErrors] = useState<{
        first_name: boolean;
        last_name: boolean;
        username: boolean;
        email: boolean;
        password: boolean;
        confirm_password: boolean;
        general?: string;
    }>({
        first_name: false,
        last_name: false,
        username: false,
        email: false,
        password: false,
        confirm_password: false,
        general: undefined,
    });

    // ───────────────────────────── Google Create / Sign-in ─────────────────────────────

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            await apiClient.addLogToServer(
                "error",
                "No credential found in Google response"
            );
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
            // 1️⃣ Check if user exists by email
            let dbUserResponse: GetUserByEmailResponse = await apiClient.getUserByEmail(
                googleUser.email
            );
            let dbUser = dbUserResponse.user;

            // 2️⃣ If not found, create one (auth_type: google)
            if (!dbUser) {
                await apiClient.addLogToServer(
                    "info",
                    "🆕 User not found, creating new user..."
                );

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

                // Optional: fetch freshest version
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

            await apiClient.addLogToServer(
                "info",
                "✅ User fully loaded into context",
                dbUser
            );

            navigate("/locker");
        } catch (err: any) {
            await apiClient.addLogToServer(
                "error",
                "❌ Error during Google create-account flow",
                err
            );
            setErrors((prev) => ({
                ...prev,
                general: "Something went wrong with Google sign up. Please try again.",
            }));
        }
    };

    const handleGoogleError = async () => {
        await apiClient.addLogToServer("error", "Google Create Account Failed");
        setErrors((prev) => ({
            ...prev,
            general: "Google sign up failed. Please try again.",
        }));
    };

    // ───────────────────────────── Native Create Account ─────────────────────────────

    const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const firstNameEmpty = first_name.trim() === "";
        const lastNameEmpty = last_name.trim() === "";
        const usernameEmpty = username.trim() === "";
        const emailEmpty = email.trim() === "";
        const passwordEmpty = password.trim() === "";
        const confirmPasswordEmpty = confirm_password.trim() === "";

        let generalError: string | undefined;

        let newErrors = {
            first_name: firstNameEmpty,
            last_name: lastNameEmpty,
            username: usernameEmpty,
            email: emailEmpty,
            password: passwordEmpty,
            confirm_password: confirmPasswordEmpty,
            general: undefined as string | undefined,
        };

        // Email format validation
        if (!emailEmpty && !isValidEmail(email)) {
            newErrors.email = true;
            generalError = "Please enter a valid email address.";
        }

        // Password rules
        if (!passwordEmpty && password.length < 6) {
            newErrors.password = true;
            generalError = "Password must be at least 6 characters.";
        } else if (
            !passwordEmpty &&
            !confirmPasswordEmpty &&
            password !== confirm_password
        ) {
            newErrors.confirm_password = true;
            generalError = "Passwords do not match.";
        }

        newErrors.general = generalError;
        setErrors(newErrors);

        const hasFieldError =
            newErrors.first_name ||
            newErrors.last_name ||
            newErrors.username ||
            newErrors.email ||
            newErrors.password ||
            newErrors.confirm_password;

        if (hasFieldError) return;

        // 👇 Username uniqueness check
        try {
            const usernameResponse: GetUserByUsernameResponse =
                await apiClient.getUserByUsername(username.trim());

            if (usernameResponse.user) {
                setErrors((prev) => ({
                    ...prev,
                    username: true,
                    general: "That username is already taken. Please choose another.",
                }));
                return;
            }
        } catch (err: any) {
            await apiClient.addLogToServer(
                "error",
                "❌ Error while checking username uniqueness",
                err
            );
            setErrors((prev) => ({
                ...prev,
                general: "Could not verify username availability. Please try again.",
            }));
            return;
        }

        // All good – create the user
        try {
            const payload: CreateUserRequest = {
                first_name,
                last_name,
                name: `${first_name} ${last_name}`,
                username,
                email,
                // 🔥 DO NOT send picture: "" here – let backend default to null
                auth_type: "native",
                password, // backend hashes this
            };

            const res: CreateUserResponse = await apiClient.createUser(payload);
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
            await apiClient.addLogToServer(
                "error",
                "❌ Error during native create-account flow",
                err
            );
            setErrors((prev) => ({
                ...prev,
                general:
                    "Could not create account. This email or username may already be in use.",
            }));
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-container-header">
                <h2>Create Account</h2>
                <p className="caption-copy">to start building your personal locker!</p>
            </div>

            <div className="auth-inner">
                {/* Google OAuth create / sign-in */}
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

                {/* Native username / password create account */}
                <form className="auth-form" onSubmit={handleCredentialsSubmit}>
                    <div className="auth-form-row">
                        <label className="input-label" htmlFor="first_name">
                            first name
                            <input
                                id="first_name"
                                name="first_name"
                                type="text"
                                className={`create-account-input ${errors.first_name ? "input-error" : ""
                                    }`}
                                autoComplete="given-name"
                                value={first_name}
                                onChange={(e) => {
                                    setFirstName(e.target.value);
                                    if (errors.first_name && e.target.value.trim() !== "") {
                                        setErrors((prev) => ({ ...prev, first_name: false }));
                                    }
                                }}
                            />
                        </label>

                        <label className="input-label" htmlFor="last_name">
                            last name
                            <input
                                id="last_name"
                                name="last_name"
                                type="text"
                                className={`create-account-input ${errors.last_name ? "input-error" : ""
                                    }`}
                                autoComplete="family-name"
                                value={last_name}
                                onChange={(e) => {
                                    setLastName(e.target.value);
                                    if (errors.last_name && e.target.value.trim() !== "") {
                                        setErrors((prev) => ({ ...prev, last_name: false }));
                                    }
                                }}
                            />
                        </label>
                    </div>

                    <label className="input-label" htmlFor="username">
                        username
                        <input
                            id="username"
                            name="username"
                            type="text"
                            className={`create-account-input ${errors.username ? "input-error" : ""
                                }`}
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

                    <label className="input-label" htmlFor="email">
                        email
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className={`create-account-input ${errors.email ? "input-error" : ""
                                }`}
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email && e.target.value.trim() !== "") {
                                    setErrors((prev) => ({ ...prev, email: false }));
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
                            className={`create-account-input ${errors.password ? "input-error" : ""
                                }`}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password && e.target.value.trim() !== "") {
                                    setErrors((prev) => ({ ...prev, password: false }));
                                }
                            }}
                        />
                    </label>

                    <label className="input-label" htmlFor="confirm_password">
                        confirm password
                        <input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            className={`create-account-input ${errors.confirm_password ? "input-error" : ""
                                }`}
                            autoComplete="new-password"
                            value={confirm_password}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (
                                    errors.confirm_password &&
                                    e.target.value.trim() !== ""
                                ) {
                                    setErrors((prev) => ({
                                        ...prev,
                                        confirm_password: false,
                                    }));
                                }
                            }}
                        />
                    </label>

                    {errors.general && (
                        <p className="error-text caption-copy">{errors.general}</p>
                    )}

                    <button type="submit" className="button create-account-button">
                        <p className="body-copy bold-text">Create Account</p>
                    </button>
                </form>

                <a
                    className="auth-form-footer-message"
                    href="/auth/login"
                    aria-label="Already have an account? Sign in!"
                >
                    <p className="caption-copy">Already have an account?</p>
                    <p className="caption-copy hyperlink-text">Sign In</p>
                </a>
            </div>
        </div>
    );
};

export default CreateAccount;
