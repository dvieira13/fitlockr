// src/pages/account/Account.tsx
import {
    useState,
    useEffect,
    FormEvent,
    useRef,
    ChangeEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/index.css";
import "../../styles/pages/account.css";
import { apiClient } from "../../apiClient";
import { useUser } from "../../context/userContext";
import editWhiteIcon from "../../assets/icons/edit_white_icon.svg";
import arrowLeftIcon from "../../assets/icons/arrow_left_icon.svg";
import DeleteAccountModal from "../../components/modals/deleteAccountModal";
import EditPhotoModal from "../../components/modals/editPhotoModal";

const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type Mode = "view" | "edit-info" | "change-password";

const Account = () => {
    const { user, setUser, signOut } = useUser();
    const navigate = useNavigate();

    const [mode, setMode] = useState<Mode>("view");
    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    const [old_password, setOldPassword] = useState("");
    const [new_password, setNewPassword] = useState("");
    const [confirm_new_password, setConfirmNewPassword] = useState("");

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isPermOpen, setIsPermOpen] = useState(false);

    const [showDeleteAccountModal, setshowDeleteAccountModal] =
        useState(false);
    const [showEditPhotoModal, setshowEditPhotoModal] = useState(false);

    const [errors, setErrors] = useState<{
        first_name: boolean;
        last_name: boolean;
        username: boolean;
        email: boolean;
        old_password: boolean;
        new_password: boolean;
        confirm_new_password: boolean;
        general?: string;
    }>({
        first_name: false,
        last_name: false,
        username: false,
        email: false,
        old_password: false,
        new_password: false,
        confirm_new_password: false,
        general: undefined,
    });

    const isGoogleAccount = user?.auth_type === "google";
    const canEditEmail = !isGoogleAccount;

    // 🔎 refs for file inputs (upload + camera)
    const uploadInputRef = useRef<HTMLInputElement | null>(null);
    const cameraInputRef = useRef<HTMLInputElement | null>(null);

    // Counts for Pieces / Outfits (driven from API, not from user context)
    const [piecesCount, setPiecesCount] = useState(0);
    const [outfitsCount, setOutfitsCount] = useState(0);
    const [isLoadingCounts, setIsLoadingCounts] = useState(false);

    // ─────────────────────────────
    // Load user data into local state
    // ─────────────────────────────
    useEffect(() => {
        if (!user) return;
        setFirstName(user.first_name || "");
        setLastName(user.last_name || "");
        setUsername(user.username || "");
        setEmail(user.email || "");
        // Never prefill password fields
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
    }, [user]);

    // Optional: if no user, redirect to login
    useEffect(() => {
        if (!user) {
            navigate("/auth/login");
        }
    }, [user, navigate]);

    // Fetch accurate pieces + outfits counts from backend
    useEffect(() => {
        if (!user?.id) return;

        let cancelled = false;

        const loadCounts = async () => {
            try {
                setIsLoadingCounts(true);

                const [piecesRes, outfitsRes] = await Promise.all([
                    apiClient.getUserPieces(user.id),
                    apiClient.getUserOutfits(user.id),
                ]);

                if (cancelled) return;

                setPiecesCount(piecesRes.pieces?.length ?? 0);
                setOutfitsCount(outfitsRes.outfits?.length ?? 0);
            } catch (err) {
                console.error(
                    "Failed to load user item counts on account page",
                    err
                );
                if (!cancelled) {
                    setPiecesCount(0);
                    setOutfitsCount(0);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingCounts(false);
                }
            }
        };

        loadCounts();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (!successMessage) return;
        const timeout = setTimeout(() => setSuccessMessage(null), 3000);
        return () => clearTimeout(timeout);
    }, [successMessage]);

    const resetErrors = () => {
        setErrors({
            first_name: false,
            last_name: false,
            username: false,
            email: false,
            old_password: false,
            new_password: false,
            confirm_new_password: false,
            general: undefined,
        });
    };

    const resetFormToUser = () => {
        if (!user) return;
        setFirstName(user.first_name || "");
        setLastName(user.last_name || "");
        setUsername(user.username || "");
        setEmail(user.email || "");
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
    };

    const handleCancel = () => {
        resetErrors();
        resetFormToUser();
        setMode("view");
    };

    const handleLogout = () => {
        signOut();
        navigate("/auth/login");
    };

    const handleChangePasswordClick = () => {
        if (isGoogleAccount) return; // safety guard
        resetErrors();
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setMode("change-password");
    };

    const validateInfo = () => {
        const firstNameEmpty = first_name.trim() === "";
        const lastNameEmpty = last_name.trim() === "";
        const usernameEmpty = username.trim() === "";
        const emailEmpty = email.trim() === "";

        let generalError: string | undefined;
        let newErrors = {
            first_name: firstNameEmpty,
            last_name: lastNameEmpty,
            username: usernameEmpty,
            email: emailEmpty,
            old_password: false,
            new_password: false,
            confirm_new_password: false,
            general: undefined as string | undefined,
        };

        if (!emailEmpty && !isValidEmail(email)) {
            newErrors.email = true;
            generalError = "Please enter a valid email address.";
        }

        newErrors.general = generalError;
        setErrors(newErrors);

        const hasFieldError =
            newErrors.first_name ||
            newErrors.last_name ||
            newErrors.username ||
            newErrors.email;

        return !hasFieldError && !generalError;
    };

    const validatePassword = () => {
        const oldEmpty = old_password.trim() === "";
        const newEmpty = new_password.trim() === "";
        const confirmEmpty = confirm_new_password.trim() === "";

        let generalError: string | undefined;
        let newErrors = {
            first_name: false,
            last_name: false,
            username: false,
            email: false,
            old_password: oldEmpty,
            new_password: newEmpty,
            confirm_new_password: confirmEmpty,
            general: undefined as string | undefined,
        };

        if (oldEmpty || newEmpty || confirmEmpty) {
            generalError = "Please fill out all password fields.";
        }

        if (!newEmpty && new_password.length < 6) {
            newErrors.new_password = true;
            generalError = "New password must be at least 6 characters.";
        } else if (
            !newEmpty &&
            !confirmEmpty &&
            new_password !== confirm_new_password
        ) {
            newErrors.confirm_new_password = true;
            generalError = "New passwords do not match.";
        }

        newErrors.general = generalError;
        setErrors(newErrors);

        const hasFieldError =
            newErrors.old_password ||
            newErrors.new_password ||
            newErrors.confirm_new_password;

        return !hasFieldError && !generalError;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;

        // If currently in view mode, this click means "Edit Info"
        if (mode === "view") {
            resetErrors();
            setMode("edit-info");
            return;
        }

        // ─────────────── "Update Info" ───────────────
        if (mode === "edit-info") {
            const valid = validateInfo();
            if (!valid) return;

            try {
                const payload = {
                    id: user.id,
                    first_name,
                    last_name,
                    name: `${first_name} ${last_name}`.trim(),
                    username,
                    // don't allow email changes for Google accounts
                    email: canEditEmail ? email : user.email,
                    picture: user.picture ?? undefined,
                };

                const res = await apiClient.updateUserPartial(payload);

                // Update context user
                const updated = res.user;
                setUser({
                    id: updated._id,
                    first_name: updated.first_name,
                    last_name: updated.last_name,
                    name: updated.name,
                    username: updated.username,
                    email: updated.email,
                    picture: updated.picture ?? null,
                    auth_type: updated.auth_type,
                    all_items: updated.all_items || [],
                    pieces: updated.pieces || [],
                    outfits: updated.outfits || [],
                    shelves: updated.shelves || [],
                    is_deleted: updated.is_deleted
                        ? new Date(updated.is_deleted)
                        : null,
                });

                setSuccessMessage("Account info successfully updated!");
                setMode("view");
                resetErrors();
            } catch (err: any) {
                setErrors((prev) => ({
                    ...prev,
                    general:
                        "Could not update account info. This email or username may already be in use.",
                }));
            }

            return;
        }

        // ─────────────── "Update Password" ───────────────
        if (mode === "change-password" && !isGoogleAccount) {
            const valid = validatePassword();
            if (!valid) return;

            try {
                await apiClient.updatePassword({
                    user_id: user.id,
                    new_password,
                });

                setSuccessMessage("Password successfully updated!");
                setMode("view");
                resetErrors();
                setOldPassword("");
                setNewPassword("");
                setConfirmNewPassword("");
            } catch (err: any) {
                setErrors((prev) => ({
                    ...prev,
                    general: "Could not update password. Please try again.",
                }));
            }
        }
    };

    const handleConfirmDelete = async () => {
        if (!user) return;

        try {
            await apiClient.deleteUser(user.id);

            // clear user from context and go to login
            signOut();
            navigate("/auth/login");
        } catch (err) {
            console.error("Error deleting account", err);
        } finally {
            setshowDeleteAccountModal(false);
        }
    };

    // ─────────────────────────────
    // PHOTO HANDLERS
    // ─────────────────────────────

    // Reuse for both upload & camera
    const handlePhotoSelected = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE_BYTES) {
            setErrors((prev) => ({
                ...prev,
                general: "Image is too large. Please choose a file under 5MB.",
            }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;

            try {
                const res = await apiClient.uploadProfilePicture({
                    user_id: user.id,
                    image: base64,
                });

                const updated = res.user;

                // 🔄 Update user context with new picture URL
                setUser({
                    id: updated._id,
                    first_name: updated.first_name,
                    last_name: updated.last_name,
                    name: updated.name,
                    username: updated.username,
                    email: updated.email,
                    picture: updated.picture ?? null,
                    auth_type: updated.auth_type,
                    all_items: updated.all_items || [],
                    pieces: updated.pieces || [],
                    outfits: updated.outfits || [],
                    shelves: updated.shelves || [],
                    is_deleted: updated.is_deleted
                        ? new Date(updated.is_deleted)
                        : null,
                });

                setSuccessMessage("Profile photo updated!");

                setshowEditPhotoModal(false);
            } catch (err) {
                console.error("Error updating profile photo", err);
                setErrors((prev) => ({
                    ...prev,
                    general:
                        "Could not update profile photo. Please try again.",
                }));
            } finally {
                // Clear the input value so selecting the same file again will still fire onChange
                e.target.value = "";
            }
        };

        reader.readAsDataURL(file);
    };

    const handleEditPhoto = async (croppedImage: string) => {
        if (!user) return;

        try {
            const res = await apiClient.uploadProfilePicture({
                user_id: user.id,
                image: croppedImage,
            });

            const updated = res.user;

            setUser({
                id: updated._id,
                first_name: updated.first_name,
                last_name: updated.last_name,
                name: updated.name,
                username: updated.username,
                email: updated.email,
                picture: updated.picture ?? null,
                auth_type: updated.auth_type,
                all_items: updated.all_items || [],
                pieces: updated.pieces || [],
                outfits: updated.outfits || [],
                shelves: updated.shelves || [],
                is_deleted: updated.is_deleted
                    ? new Date(updated.is_deleted)
                    : null,
            });

            setSuccessMessage("Profile photo updated!");
            setshowEditPhotoModal(false);
        } catch (err) {
            console.error("Error updating profile photo", err);
            setErrors((prev) => ({
                ...prev,
                general: "Could not update profile photo. Please try again.",
            }));
        }
    };

    const handleTakeReplacePhoto = async () => {
        // Opens camera capture where supported (mobile)
        cameraInputRef.current?.click();
    };

    const handleUploadReplacePhoto = async () => {
        // Opens normal file picker
        uploadInputRef.current?.click();
    };

    const infoInputsDisabled = mode !== "edit-info";

    const primaryButtonLabel =
        mode === "edit-info"
            ? "Update Info"
            : mode === "change-password"
                ? "Update Password"
                : "Edit Info";

    const isButtonActive =
        mode === "edit-info" || mode === "change-password";
    const primaryButtonClasses =
        "button update-account-button" +
        (isButtonActive ? " update-account-button-active" : "");

    const showCancelButton = mode !== "view";

    const profilePicture =
        user?.picture ||
        "https://api.dicebear.com/7.x/initials/svg?seed=" +
        encodeURIComponent(user?.name || "User") +
        "&backgroundColor=D8D8D8";

    const accountPageClass =
        "account-page " +
        (isGoogleAccount ? "google-account" : "native-account");

    return (
        <div className={accountPageClass}>
            <div className="account-page-header">
                <div
                    className="header-img-container"
                    onClick={() => setshowEditPhotoModal(true)}
                >
                    <img
                        className="account-img"
                        src={profilePicture}
                        alt="User Profile Image"
                    />
                    <div className="header-img-overlay edit-img-button">
                        <img
                            className="edit-icon"
                            src={editWhiteIcon}
                            alt="Edit Icon"
                        />
                    </div>
                </div>
                <div className="header-info">
                    <h1 className="user-name">
                        {user?.name ||
                            `${first_name} ${last_name}` ||
                            "User"}
                    </h1>
                    <p className="body-copy bold-text user-username">
                        {user ? `@${user.username}` : "@username"}
                    </p>
                    <div className="user-stats-container">
                        <p className="caption-copy user-piece-number">
                            {isLoadingCounts ? "…" : piecesCount} Pieces
                        </p>
                        <p className="caption-copy">|</p>
                        <p className="caption-copy user-outfit-number">
                            {isLoadingCounts ? "…" : outfitsCount} Outfits
                        </p>
                    </div>
                </div>
            </div>

            <div className="account-container">
                <div className="account-container-header">
                    <h2>Account Info</h2>
                </div>

                <div className="account-inner">
                    <div className="separator-line"></div>

                    <form className="account-form" onSubmit={handleSubmit}>
                        <div className="account-form-row">
                            <label
                                className={`input-label ${infoInputsDisabled ? "input-inactive" : ""
                                    }`}
                                htmlFor="first_name"
                            >
                                first name
                                <input
                                    id="first_name"
                                    name="first_name"
                                    type="text"
                                    disabled={infoInputsDisabled}
                                    className={`create-account-input ${errors.first_name ? "input-error" : ""
                                        }`}
                                    autoComplete="given-name"
                                    value={first_name}
                                    onChange={(e) => {
                                        setFirstName(e.target.value);
                                        if (
                                            errors.first_name &&
                                            e.target.value.trim() !== ""
                                        ) {
                                            setErrors((prev) => ({
                                                ...prev,
                                                first_name: false,
                                            }));
                                        }
                                    }}
                                />
                            </label>

                            <label
                                className={`input-label ${infoInputsDisabled ? "input-inactive" : ""
                                    }`}
                                htmlFor="last_name"
                            >
                                last name
                                <input
                                    id="last_name"
                                    name="last_name"
                                    type="text"
                                    disabled={infoInputsDisabled}
                                    className={`create-account-input ${errors.last_name ? "input-error" : ""
                                        }`}
                                    autoComplete="family-name"
                                    value={last_name}
                                    onChange={(e) => {
                                        setLastName(e.target.value);
                                        if (
                                            errors.last_name &&
                                            e.target.value.trim() !== ""
                                        ) {
                                            setErrors((prev) => ({
                                                ...prev,
                                                last_name: false,
                                            }));
                                        }
                                    }}
                                />
                            </label>
                        </div>

                        <label
                            className={`input-label ${infoInputsDisabled ? "input-inactive" : ""
                                }`}
                            htmlFor="username"
                        >
                            username
                            <input
                                id="username"
                                name="username"
                                type="text"
                                disabled={infoInputsDisabled}
                                className={`create-account-input ${errors.username ? "input-error" : ""
                                    }`}
                                autoComplete="username"
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (
                                        errors.username &&
                                        e.target.value.trim() !== ""
                                    ) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            username: false,
                                        }));
                                    }
                                }}
                            />
                        </label>

                        <label
                            className={`input-label ${infoInputsDisabled || !canEditEmail
                                    ? "input-inactive"
                                    : ""
                                }`}
                            htmlFor="email"
                        >
                            email
                            <input
                                id="email"
                                name="email"
                                type="email"
                                disabled={infoInputsDisabled || !canEditEmail}
                                className={`create-account-input ${errors.email ? "input-error" : ""
                                    }`}
                                autoComplete="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (
                                        errors.email &&
                                        e.target.value.trim() !== ""
                                    ) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            email: false,
                                        }));
                                    }
                                }}
                            />
                        </label>

                        {/* 🔐 Only show password section for native accounts in change-password mode */}
                        {!isGoogleAccount && mode === "change-password" && (
                            <>
                                <label
                                    className="input-label"
                                    htmlFor="old_password"
                                >
                                    old password
                                    <input
                                        id="old_password"
                                        name="old_password"
                                        type="password"
                                        className={`create-account-input ${errors.old_password
                                                ? "input-error"
                                                : ""
                                            }`}
                                        autoComplete="current-password"
                                        value={old_password}
                                        onChange={(e) => {
                                            setOldPassword(e.target.value);
                                            if (
                                                errors.old_password &&
                                                e.target.value.trim() !== ""
                                            ) {
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    old_password: false,
                                                }));
                                            }
                                        }}
                                    />
                                </label>

                                <label
                                    className="input-label"
                                    htmlFor="new_password"
                                >
                                    new password
                                    <input
                                        id="new_password"
                                        name="new_password"
                                        type="password"
                                        className={`create-account-input ${errors.new_password
                                                ? "input-error"
                                                : ""
                                            }`}
                                        autoComplete="new-password"
                                        value={new_password}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (
                                                errors.new_password &&
                                                e.target.value.trim() !== ""
                                            ) {
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    new_password: false,
                                                }));
                                            }
                                        }}
                                    />
                                </label>

                                <label
                                    className="input-label confirm-password-input"
                                    htmlFor="confirm_new_password"
                                >
                                    confirm new password
                                    <input
                                        id="confirm_new_password"
                                        name="confirm_new_password"
                                        type="password"
                                        className={`create-account-input ${errors.confirm_new_password
                                                ? "input-error"
                                                : ""
                                            }`}
                                        autoComplete="new-password"
                                        value={confirm_new_password}
                                        onChange={(e) => {
                                            setConfirmNewPassword(
                                                e.target.value
                                            );
                                            if (
                                                errors.confirm_new_password &&
                                                e.target.value.trim() !== ""
                                            ) {
                                                setErrors((prev) => ({
                                                    ...prev,
                                                    confirm_new_password:
                                                        false,
                                                }));
                                            }
                                        }}
                                    />
                                </label>
                            </>
                        )}

                        {errors.general && (
                            <p className="error-text caption-copy">
                                {errors.general}
                            </p>
                        )}

                        {successMessage && (
                            <p className="success-text caption-copy">
                                {successMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            className={primaryButtonClasses}
                        >
                            <p className="body-copy bold-text">
                                {primaryButtonLabel}
                            </p>
                        </button>

                        {showCancelButton && (
                            <p
                                className="body-copy bold-text hyperlink-text cancel-button"
                                onClick={handleCancel}
                            >
                                Cancel
                            </p>
                        )}
                    </form>

                    <div className="separator-line"></div>

                    <div className="account-form-footer">
                        {!isGoogleAccount && (
                            <p
                                className="caption-copy bold-text hyperlink-text change-password-button"
                                onClick={handleChangePasswordClick}
                            >
                                Change Password
                            </p>
                        )}
                        <button
                            className="button logout-button"
                            type="button"
                            onClick={handleLogout}
                        >
                            <p className="body-copy bold-text">
                                Log Out
                            </p>
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={
                    "perm-actions-container" +
                    (isPermOpen ? " perm-actions-closed" : "")
                }
            >
                <div
                    className="perm-actions-button"
                    onClick={() => setIsPermOpen((prev) => !prev)}
                >
                    <p className="caption-copy">Permanent Actions</p>
                    <img
                        className="left-arrow-icon"
                        src={arrowLeftIcon}
                        alt="Left Arrow Icon"
                    />
                </div>

                <button
                    className="button delete-account-button"
                    onClick={() => setshowDeleteAccountModal(true)}
                >
                    <p className="caption-copy bold-text">
                        Delete Account
                    </p>
                </button>
            </div>

            {/* Hidden file inputs for photo change */}
            <input
                type="file"
                accept="image/*"
                ref={uploadInputRef}
                style={{ display: "none" }}
                onChange={handlePhotoSelected}
            />

            <input
                type="file"
                accept="image/*"
                ref={cameraInputRef}
                style={{ display: "none" }}
                // @ts-ignore
                capture="environment"
                onChange={handlePhotoSelected}
            />

            {/** MODALS FOR PAGE */}
            {showEditPhotoModal && (
                <EditPhotoModal
                    onClose={() => setshowEditPhotoModal(false)}
                    onEditPhoto={handleEditPhoto}
                    onTakeReplacePhoto={handleTakeReplacePhoto}
                    onUploadReplacePhoto={handleUploadReplacePhoto}
                />
            )}

            {showDeleteAccountModal && (
                <DeleteAccountModal
                    onClose={() => setshowDeleteAccountModal(false)}
                    onDelete={handleConfirmDelete}
                />
            )}
        </div>
    );
};

export default Account;
