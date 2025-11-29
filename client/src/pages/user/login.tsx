import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useUser } from "../../context/userContext";
import "../../styles/index.css";
import "../../styles/login.css";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../apiClient";
import {
    CreateUserRequest,
    CreateUserResponse,
    GetUserByEmailResponse,
} from "../../types/types.api";

const Login = () => {
    const { user, setUser, refreshUser, signOut } = useUser();
    const navigate = useNavigate();

    const handleSuccess = async (credentialResponse: CredentialResponse) => {
        if (!credentialResponse.credential) {
            await apiClient.addLogToServer("error", "No credential found in Google response");
            return;
        }

        const decoded: any = jwtDecode(credentialResponse.credential);

        const googleUser = {
            id: "",
            first_name: decoded.given_name,
            last_name: decoded.family_name,
            name: decoded.name,
            email: decoded.email,
            picture: decoded.picture,
        };

        await apiClient.addLogToServer("info", "✅ Google user data received", googleUser);

        try {
            // 1️⃣ Check if the user already exists in the database
            let dbUserResponse: GetUserByEmailResponse = await apiClient.getUserByEmail(
                googleUser.email
            );
            let dbUser = dbUserResponse.user;

            // 2️⃣ If not found, create a new user
            if (!dbUser) {
                await apiClient.addLogToServer("info", "🆕 User not found, creating new user...");
                const payload: CreateUserRequest = {
                    first_name: googleUser.first_name,
                    last_name: googleUser.last_name,
                    name: googleUser.name,
                    picture: googleUser.picture,
                    email: googleUser.email,
                };
                const createdUserResponse: CreateUserResponse =
                    await apiClient.createUser(payload);
                dbUser = createdUserResponse.user;
                await apiClient.addLogToServer("info", "✅ New user created", dbUser);
            } else {
                await apiClient.addLogToServer("info", "✅ User found in DB", dbUser);
                // Always refetch for up-to-date data
                const refreshedResponse: GetUserByEmailResponse =
                    await apiClient.getUserByEmail(googleUser.email);
                dbUser = refreshedResponse.user;
            }

            if (dbUser) {
                // 3️⃣ Update global context with DB + Google data
                setUser({
                    id: dbUser._id,
                    first_name: dbUser.first_name,
                    last_name: dbUser.last_name,
                    name:
                        `${dbUser.first_name} ${dbUser.last_name}` ||
                        googleUser.name ||
                        "",
                    email: dbUser.email,
                    picture: googleUser.picture || dbUser.picture || "",
                    phone_number: dbUser.phone_number,
                    address: dbUser.address,
                    carted_events: dbUser.carted_events || [],
                    purchased_events: dbUser.purchased_events || [],
                });
            }

            // Force context refresh to ensure all fields are current
            await refreshUser();

            await apiClient.addLogToServer("info", "✅ User fully loaded into context", dbUser);

            // Redirect to account page
            navigate("/account");
        } catch (err: any) {
            await apiClient.addLogToServer("error", "❌ Error during login flow", err);
        }
    };

    const handleError = async () => {
        await apiClient.addLogToServer("error", "Google Login Failed");
    };

    return (
        <div className="login-container">
            {!user ? (
                <div className="login-inner">
                    <h1>Log In</h1>
                    <GoogleLogin onSuccess={handleSuccess} onError={handleError} />
                    <p className="body-copy">Sign in to continue to your account.</p>
                </div>
            ) : (
                <div className="loggedin-container">
                    {user.picture && (
                        <img src={user.picture} alt={user.name} className="user-img" />
                    )}
                    <h2>{user.name}</h2>
                    <p className="body-copy">{user.email}</p>
                    <button onClick={signOut} className="button">
                        <p className="body-copy">Sign Out</p>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Login;
