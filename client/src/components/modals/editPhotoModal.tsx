// src/components/editPhotoModal.tsx
import { useState, useEffect } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import Cropper, { Area } from "react-easy-crop";
import { useUser } from "../../context/userContext";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/editPhotoModal.css";
import closeicon from "../../assets/icons/close_icon.svg";

interface EditPhotoModalProps {
    onClose: () => void;
    onEditPhoto: (croppedImage: string) => void;
    onTakeReplacePhoto: () => void;
    onUploadReplacePhoto: () => void;
}

type Mode = "view" | "edit-photo" | "change-photo";

const EditPhotoModal: React.FC<EditPhotoModalProps> = ({
    onClose,
    onEditPhoto,
    onTakeReplacePhoto,
    onUploadReplacePhoto,
}) => {
    const { handleOverlayClick } = useModalBehavior(onClose);
    
    const { user } = useUser();
    const [mode, setMode] = useState<Mode>("view");

    const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null
    );
    const [isSaving, setIsSaving] = useState(false);

    // Base profile image from context (current image when modal opens)
    const baseProfilePicture =
        user?.picture ||
        "https://api.dicebear.com/7.x/initials/svg?seed=" +
        encodeURIComponent(user?.name || "User") +
        "&backgroundColor=D8D8D8";

    // First unedited original version of the image for this modal session
    const [originalImageSrc] = useState(() => baseProfilePicture);

    // The image the cropper is currently using (can diverge from original)
    const [imageSrc, setImageSrc] = useState(() => baseProfilePicture);

    // 🔁 Store initial crop/zoom for convenience if needed later
    const [initialCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [initialZoom] = useState(1);

    const handleChangePhoto = () => {
        setMode("change-photo");
    };

    const handleStartEditPhoto = () => {
        setMode("edit-photo");
        // Reset crop/zoom each time user enters edit mode
        setCrop(initialCrop);
        setZoom(initialZoom);
        setCroppedAreaPixels(null);
        setImageSrc(originalImageSrc); // always start from unedited original
    };

    const handleBack = () => {
        // Return to view mode, reset crop/zoom state
        setMode("view");
        setCrop(initialCrop);
        setZoom(initialZoom);
        setCroppedAreaPixels(null);
        setImageSrc(originalImageSrc);
    };

    const handleRevertToOriginal = () => {
        // Go back to the first unedited original version of the current image
        setImageSrc(originalImageSrc);
        setCrop(initialCrop);
        setZoom(initialZoom);
        setCroppedAreaPixels(null);
        // ⬅️ Also leave edit mode so the user sees the original avatar again
        setMode("view");
    };

    const showChangePhotoButtons = mode === "change-photo";
    const showViewPhotoButtons = mode === "view";
    const showEditPhotoCropper = mode === "edit-photo";

    // ─────────────────────────────
    // Helper: load image and crop to canvas
    // ─────────────────────────────
    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = url;
            image.onload = () => resolve(image);
            image.onerror = (error) => reject(error);
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area
    ): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new Error("Could not get canvas context");
        }

        // Make a square avatar ~300x300
        const OUTPUT_SIZE = 300;
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            OUTPUT_SIZE,
            OUTPUT_SIZE
        );

        // JPEG with some compression instead of PNG
        return canvas.toDataURL("image/jpeg", 0.8);
    };

    const onCropComplete = (_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    };

    const handleSaveCrop = async () => {
        if (!croppedAreaPixels) return;
        setIsSaving(true);
        try {
            const croppedDataUrl = await getCroppedImg(
                imageSrc,
                croppedAreaPixels
            );
            onEditPhoto(croppedDataUrl);
        } catch (err) {
            console.error("Error cropping image", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div className="modal-container edit-photo-modal">
                <button
                    type="button"
                    className="close-modal-button"
                    onClick={onClose}
                >
                    <img className="close-icon" src={closeicon} alt="Close Icon" />
                </button>

                <div className="modal-content">
                    {/* Header image / cropper area */}
                    {showEditPhotoCropper ? (
                        <div className="cropper-wrapper">
                            <div className="cropper-inner-circle">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                            <input
                                className="cropper-zoom-slider"
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) =>
                                    setZoom(Number(e.target.value))
                                }
                            />
                        </div>
                    ) : (
                        <img
                            className="modal-account-img"
                            src={imageSrc}
                            alt="User Profile Image"
                        />
                    )}

                    {/* VIEW MODE BUTTONS */}
                    {showViewPhotoButtons && (
                        <div className="view-photo-buttons">
                            <button
                                type="button"
                                className="button edit-photo-button"
                                onClick={handleStartEditPhoto}
                            >
                                <p className="caption-copy bold-text">
                                    Edit Photo
                                </p>
                            </button>

                            <button
                                type="button"
                                className="button change-photo-button"
                                onClick={handleChangePhoto}
                            >
                                <p className="caption-copy bold-text">
                                    Change Photo
                                </p>
                            </button>
                        </div>
                    )}

                    {/* CHANGE PHOTO BUTTONS */}
                    {showChangePhotoButtons && (
                        <div className="change-photo-buttons">
                            <button
                                type="button"
                                className="button take-picture-button"
                                onClick={onTakeReplacePhoto}
                            >
                                <p className="caption-copy bold-text">
                                    Take Picture
                                </p>
                            </button>
                            <button
                                type="button"
                                className="button upload-image-button"
                                onClick={onUploadReplacePhoto}
                            >
                                <p className="caption-copy bold-text">
                                    Upload Image
                                </p>
                            </button>
                            <p
                                className="body-copy bold-text hyperlink-text back-button"
                                onClick={handleBack}
                            >
                                Back
                            </p>
                        </div>
                    )}

                    {/* EDIT PHOTO CROP CONTROLS */}
                    {showEditPhotoCropper && (
                        <div className="edit-photo-actions">
                            <div className="edit-photo-actions-container">
                                <button
                                    type="button"
                                    className="button save-crop-button"
                                    onClick={handleSaveCrop}
                                    disabled={isSaving}
                                >
                                    <p className="caption-copy bold-text">
                                        {isSaving ? "Saving..." : "Save"}
                                    </p>
                                </button>

                                {/* 🔁 Revert edits */}
                                <button
                                    type="button"
                                    className="button revert-crop-button"
                                    onClick={handleRevertToOriginal}
                                >
                                    <p className="caption-copy bold-text">
                                        Revert Edits
                                    </p>
                                </button>
                            </div>

                            <p
                                className="body-copy bold-text hyperlink-text back-button"
                                onClick={handleBack}
                            >
                                Back
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditPhotoModal;
