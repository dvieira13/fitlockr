import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/index.css";
import "../../styles/account.css";
import { apiClient } from "../../apiClient";
import { useUser } from "../../context/userContext";
import { UserAPI } from "../../types/types.api";

const Account = () => {
    const { user, signOut } = useUser();
    const navigate = useNavigate();

    interface AccountFormData {
        phone_number?: string;
        address?: string;
    }

    const [formData, setFormData] = useState<AccountFormData>({
        phone_number: "",
        address: "",
    });

    const [initialData, setInitialData] = useState<AccountFormData>({
        phone_number: "",
        address: "",
    });

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [isEdited, setIsEdited] = useState(false);

    // Load user profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!user?.email) return;
                const response = await apiClient.getUserByEmail(user.email);

                if (response?.user) {
                    const u: UserAPI = response.user;
                    const data = {
                        phone_number: u.phone_number ? String(u.phone_number) : "",
                        address: u.address || "",
                    };

                    setFormData(data);
                    setInitialData(data);
                }
            } catch (err) {
                await apiClient.addLogToServer("error", "Failed to fetch user profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    // Detect if form is edited
    useEffect(() => {
        const changed =
            formData.phone_number !== initialData.phone_number ||
            formData.address !== initialData.address;
        setIsEdited(changed);
    }, [formData, initialData]);

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setPhoneError("");
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setPhoneError("");

        try {
            if (!user?.id) throw new Error("User ID missing.");

            const phone = formData.phone_number?.trim();
            if (phone && !/^\d{10}$/.test(phone)) {
                setPhoneError("Phone number must be exactly 10 digits.");
                return;
            }

            const payload = {
                id: user.id,
                phone_number: phone ? Number(phone) : undefined,
                address: formData.address || undefined,
            };

            await apiClient.updateUserPartial(payload);

            setMessage("Profile updated successfully!");
            setTimeout(() => setMessage(""), 2000);

            setInitialData(formData);
            setIsEdited(false);

        } catch (err: any) {
            await apiClient.addLogToServer("error", "Error updating profile", err);
            setMessage("Failed to update profile.");
        }
    };

    const handleSignOut = () => {
        signOut();
        navigate("/login");
    };

    if (loading)
        return (
            <div className="loading-container">
                <p className="loading-text">Loading your profile...</p>
            </div>
        );

    if (!user)
        return (
            <div className="loading-container">
                <p className="loading-text">Please log in to view your account.</p>
            </div>
        );

    return (
        <div className="account-page">
            <h1>My Account</h1>
            <div className="account-container">
                {user.picture && (
                    <img src={user.picture} alt={user.name} className="user-img" />
                )}
                <h2>{user.name}</h2>
                <p className="body-copy">{user.email}</p>

                <button className="events-button button" onClick={() => navigate("/")}>
                    <p className="body-copy bold-text">View Events</p>
                </button>

                <form onSubmit={handleSubmit} className="account-form">
                    <h3>Update Profile</h3>

                    <div className="account-form-item">
                        <label>Phone Number</label>
                        <input
                            type="text"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleChange}
                            maxLength={10}
                            placeholder="e.g. 5551234567"
                        />
                        {phoneError && (
                            <p className="error-message">{phoneError}</p>
                        )}
                    </div>

                    <div className="account-form-item">
                        <label>Address</label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            maxLength={255}
                            placeholder="Enter your address"
                        />
                    </div>

                    <button
                        type="submit"
                        className={`submit-button button ${!isEdited ? "disabled" : ""}`}
                        disabled={!isEdited}
                    >
                        <p className="body-copy bold-text">
                            Update
                        </p>
                    </button>

                    {message && <p className="status-message">{message}</p>}
                </form>

                <button onClick={handleSignOut} className="signout-button button">
                    <p className="body-copy">Sign Out</p>
                </button>
            </div>
        </div>
    );
};

export default Account;
