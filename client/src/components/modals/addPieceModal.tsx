import { useState, useRef } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import { apiClient } from "../../apiClient";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/addPieceModal.css";
import closeicon from "../../assets/icons/close_icon.svg";

interface AddPieceModalProps {
    onClose: () => void;
    onOpenEditWithImage: (imgSrc: string) => void;
    onValidUrl: (payload: {
        url: string;
        primaryImage?: string | null;
        secondaryImages?: string[];
        name?: string;
        brand?: string;
        type?: string;
        colors?: string[];
        ownership?: "owned" | "want";
    }) => void;
}

type ActiveAction = "camera" | "file" | "url" | null;

const AddPieceModal: React.FC<AddPieceModalProps> = ({
    onClose,
    onOpenEditWithImage,
    onValidUrl,
}) => {
    const { handleOverlayClick } = useModalBehavior(onClose);

    const [url, setUrl] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<ActiveAction>(null);

    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const isBusy = activeAction !== null;

    const validateUrl = (value: string): boolean => {
        try {
            const u = new URL(value);
            return u.protocol === "http:" || u.protocol === "https:";
        } catch {
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmed = url.trim();

        if (!trimmed) {
            setError("Please paste a URL.");
            return;
        }

        if (!validateUrl(trimmed)) {
            setError("Please enter a valid URL beginning with http:// or https://");
            return;
        }

        setError(null);

        try {
            setActiveAction("url");

            const res = await apiClient.getProductFromUrl({ url: trimmed });

            const {
                primaryImage = null,
                secondaryImages = [],
                name = "",
                brand = "",
                type = "",
                colors = [],
            } = res || {};

            onValidUrl({
                url: trimmed,
                primaryImage,
                secondaryImages,
                name,
                brand,
                type,
                colors,
                ownership: "want",
            });
        } catch (err) {
            console.error("Failed to fetch product data from URL", err);
            setError(
                "Couldn't pull product details from that link. You can still create a piece manually."
            );
        } finally {
            setActiveAction(null);
        }
    };

    const handleTakePictureClick = () => {
        if (isBusy) return;
        cameraInputRef.current?.click();
    };

    const handleUploadImageClick = () => {
        if (isBusy) return;
        fileInputRef.current?.click();
    };

    // factory so we know which input triggered the upload
    const handleFileSelected =
        (source: "camera" | "file") =>
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();

                reader.onloadend = async () => {
                    const base64DataUrl = reader.result as string;

                    try {
                        setActiveAction(source);
                        setError(null);

                        const res = await apiClient.uploadPieceImage({
                            image: base64DataUrl,
                        });

                        const cloudinaryUrl = res.url;
                        if (!cloudinaryUrl) {
                            throw new Error("No URL returned from upload");
                        }

                        onOpenEditWithImage(cloudinaryUrl);
                    } catch (err) {
                        console.error("Failed to upload piece image", err);
                        setError("Failed to upload image. Please try again.");
                    } finally {
                        setActiveAction(null);
                        e.target.value = "";
                    }
                };

                reader.readAsDataURL(file);
            };

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div className="modal-container add-piece-modal">
                <button
                    type="button"
                    className="close-modal-button"
                    onClick={onClose}
                >
                    <img className="close-icon" src={closeicon} alt="Close Icon" />
                </button>

                <div className="modal-header">
                    <h4 className="bold-text">Add a New Piece</h4>
                    <div className="separator-line"></div>
                </div>

                <div className="modal-content">
                    <p className="body-copy">Select an option to add an image:</p>

                    {/* Take Picture */}
                    <button
                        type="button"
                        className="button take-picture-button"
                        onClick={handleTakePictureClick}
                        disabled={isBusy}
                    >
                        <p className="caption-copy bold-text">
                            {activeAction === "camera" ? "Uploading..." : "Take Picture"}
                        </p>
                    </button>

                    <p className="caption-copy modal-or-text">OR</p>

                    {/* Upload Image */}
                    <button
                        type="button"
                        className="button upload-image-button"
                        onClick={handleUploadImageClick}
                        disabled={isBusy}
                    >
                        <p className="caption-copy bold-text">
                            {activeAction === "file" ? "Uploading..." : "Upload Image"}
                        </p>
                    </button>

                    <p className="caption-copy modal-or-text">OR</p>

                    {/* Hidden inputs for camera / upload */}
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: "none" }}
                        onChange={handleFileSelected("camera")}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileSelected("file")}
                    />

                    {/* URL flow */}
                    <div className="paste-url-container">
                        <p className="caption-copy bold-text">
                            Paste Product Shopping URL Here:
                        </p>

                        <form className="paste-url-form" onSubmit={handleSubmit}>
                            <input
                                id="url"
                                name="url"
                                type="url"
                                placeholder="Paste URL here"
                                className={`url-input ${error ? "input-error" : ""}`}
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    if (error) setError(null);
                                }}
                            />

                            {error && (
                                <p className="error-text caption-copy">{error}</p>
                            )}

                            <button
                                type="submit"
                                className="button submit-url-button"
                                disabled={isBusy}
                            >
                                <p className="caption-copy bold-text">
                                    {activeAction === "url" ? "Fetching..." : "Create Piece"}
                                </p>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddPieceModal;
