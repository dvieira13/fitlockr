// src/components/modals/viewPieceModal.tsx
import { useEffect, useState } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/viewPieceModal.css";
import closeicon from "../../assets/icons/close_icon.svg";
import openArrowIcon from "../../assets/icons/open_arrow_icon.svg";
import editIconWhite from "../../assets/icons/edit_white_icon.svg";
import expandIcon from "../../assets/icons/expand_arrow_icon.svg"
import collapseIcon from "../../assets/icons/collapse_arrow_icon.svg"
import { apiClient } from "../../apiClient";
import type { PieceAPI } from "../../types/types.api";

interface TagOption {
    key: string;
    label: string;
}

type TagGroups = Record<string, TagOption[]>;
type PieceTagGroups = Record<string, Record<string, boolean>>;

interface ViewPieceModalProps {
    piece: PieceAPI;
    onClose: () => void;
    onEdit?: (piece: PieceAPI) => void;

    /** When opened from an outfit view */
    fromOutfit?: boolean;
    /** Called when clicking "Back to Outfit" */
    onBackToOutfit?: () => void;
}

const ViewPieceModal: React.FC<ViewPieceModalProps> = ({
    piece,
    onClose,
    onEdit,
    fromOutfit = false,
    onBackToOutfit,
}) => {
    const { handleOverlayClick } = useModalBehavior(onClose);

    const [tagGroups, setTagGroups] = useState<TagGroups>({});
    const [allImages, setAllImages] = useState<string[]>([]);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [zoomCoords, setZoomCoords] = useState<{ x: number; y: number }>({
        x: 50,
        y: 50,
    });

    // Fetch tag metadata
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await apiClient.getPieceTags();
                setTagGroups(res.tags || {});
            } catch (err) {
                console.error("Failed to load piece tags", err);
            }
        };

        fetchTags();
    }, []);

    // Build image list from piece
    useEffect(() => {
        const imgs: string[] = [];

        if (piece.primary_img) {
            imgs.push(piece.primary_img);
        }

        if (Array.isArray(piece.secondary_imgs)) {
            piece.secondary_imgs.forEach((url) => {
                if (url) imgs.push(url);
            });
        }

        setAllImages(imgs);
        setActiveImage(imgs[0] || null);
    }, [piece]);

    const handleInnerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    const handleBuyClick = () => {
        if (!piece.product_link) return;
        window.open(piece.product_link, "_blank", "noopener,noreferrer");
    };

    const handleEditClick = () => {
        if (onEdit) {
            onEdit(piece);
        }
    };

    const handleZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const clamp = (val: number) => Math.min(100, Math.max(0, val));
        setZoomCoords({ x: clamp(x), y: clamp(y) });
    };

    const handleZoomLeave = () => {
        setZoomCoords({ x: 50, y: 50 });
    };

    const colors = piece.colors || [];

    // ----- TAGS -----
    const rawPieceTags = (piece.tags || {}) as PieceTagGroups;

    const enabledTagKeys = new Set<string>();
    Object.values(rawPieceTags).forEach((group) => {
        if (!group) return;
        Object.entries(group).forEach(([key, isEnabled]) => {
            if (isEnabled) enabledTagKeys.add(key);
        });
    });

    const allTagOptions: TagOption[] = Object.values(tagGroups)
        .flat()
        .filter(Boolean);

    const pieceTags: TagOption[] = allTagOptions.filter((opt) =>
        enabledTagKeys.has(opt.key)
    );

    const hasAnyTags = pieceTags.length > 0;

    const hasPrice = !!piece.price;
    const hasSize = !!piece.size;
    const hasBrand = !!piece.brand;
    const hasNotes = !!piece.notes;

    const typeLabel = piece.type || "";
    const subtypeLabel = piece.subtype || "";
    const typeSubtype =
        typeLabel && subtypeLabel
            ? `${typeLabel} | ${subtypeLabel}`
            : typeLabel || subtypeLabel || "";

    const modalClassName =
        "modal-container view-piece-modal" +
        (fromOutfit ? " from-outfit" : "");

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div className={modalClassName} onClick={handleInnerClick}>
                <button
                    type="button"
                    className="close-modal-button"
                    onClick={onClose}
                >
                    <img
                        className="close-icon"
                        src={closeicon}
                        alt="Close Icon"
                    />
                </button>

                <div className="modal-header">
                    {/* from-outfit back button */}
                    {fromOutfit && (
                        <button
                            type="button"
                            className="back-to-outfit-button caption-copy bold-text hyperlink-text"
                            onClick={() => onBackToOutfit && onBackToOutfit()}
                        >
                            Back to Outfit
                        </button>
                    )}
                    <h4 className="bold-text">{piece.name}</h4>
                </div>

                <div className="modal-content">
                    <div className="piece-content-top">
                        {/* PRIMARY IMAGE */}
                        <div
                            className="primary-img-container shadow"
                            onClick={activeImage ? () => setIsZoomOpen(true) : undefined}
                        >
                            {activeImage ? (
                                <img
                                    className="piece-primary-img"
                                    src={activeImage}
                                    alt={piece.name}
                                />
                            ) : (
                                <div className="primary-img placeholder">
                                    <p className="caption-copy">No image available</p>
                                </div>
                            )}
                            <img
                                className="expand-icon"
                                src={expandIcon}
                                alt="Expand Icon"
                            />
                        </div>

                        {/* TEXT INFO */}
                        <div className="piece-info-container">
                            {typeSubtype && (
                                <p className="caption-copy black-text piece-types">
                                    {typeSubtype}
                                </p>
                            )}

                            {hasBrand && (
                                <h4 className="piece-brand">
                                    {piece.brand}
                                </h4>
                            )}

                            {hasPrice && (
                                <p className="caption-copy piece-price">
                                    {piece.price}
                                </p>
                            )}

                            {hasSize && (
                                <p className="caption-copy piece-size">
                                    {piece.size}
                                </p>
                            )}

                            {colors.length > 0 && (
                                <div className="piece-colors-container">
                                    {colors.map((color) => {
                                        const colorClass =
                                            color.toLowerCase();
                                        return (
                                            <div
                                                key={color}
                                                className="piece-color"
                                            >
                                                <div
                                                    className={`color-tile ${colorClass}`}
                                                ></div>
                                                <p className="caption-copy">
                                                    {color}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {hasAnyTags && (
                                <div className="piece-tags-container">
                                    {pieceTags.map((tag) => (
                                        <div
                                            key={tag.key}
                                            className="tag-item active-tag-item"
                                        >
                                            <p className="caption-copy">
                                                {tag.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {hasNotes && (
                                <div className="piece-notes-container">
                                    <p className="caption-copy bold-text">
                                        Notes:
                                    </p>
                                    <p className="caption-copy piece-notes">
                                        {piece.notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT-SIDE OVERLAY ACTIONS */}
                        <div className="view-piece-overlay">
                            {!piece.owned && piece.product_link && (
                                <button
                                    type="button"
                                    className="button buy-button"
                                    onClick={handleBuyClick}
                                >
                                    <p className="body-copy bold-text">Buy</p>
                                    <img
                                        className="open-arrow-icon"
                                        src={openArrowIcon}
                                        alt="Open Arrow Icon"
                                    />
                                </button>
                            )}
                            <button
                                type="button"
                                className="button edit-button"
                                onClick={handleEditClick}
                            >
                                <p className="body-copy bold-text">Edit</p>
                                <img
                                    className="edit-icon-white"
                                    src={editIconWhite}
                                    alt="Edit Icon"
                                />
                            </button>
                        </div>
                    </div>

                    {/* IMAGES SWIPER */}
                    {allImages.length > 1 && (
                        <div className="piece-imgs-swiper-container">
                            <Swiper
                                direction="horizontal"
                                slidesPerView="auto"
                                freeMode={{
                                    enabled: true,
                                    sticky: false,
                                    momentumBounce: true,
                                    momentumRatio: 0.7,
                                }}
                                spaceBetween={10}
                                modules={[Scrollbar, Mousewheel]}
                                mousewheel={{
                                    forceToAxis: true,
                                    releaseOnEdges: true,
                                }}
                                scrollbar={{
                                    draggable: true,
                                    hide: false,
                                    snapOnRelease: false,
                                }}
                                className="piece-imgs-swiper"
                            >
                                {allImages.map((img, index) => (
                                    <SwiperSlide
                                        key={`${img}-${index}`}
                                        className="piece-imgs-swiper-slide shadow"
                                    >
                                        <button
                                            type="button"
                                            className={
                                                "piece-img-thumb-button" +
                                                (activeImage === img
                                                    ? " active-thumb"
                                                    : "")
                                            }
                                            onClick={() =>
                                                setActiveImage(img)
                                            }
                                        >
                                            <img
                                                className="piece-img-thumb"
                                                src={img}
                                                alt={`${piece.name} thumbnail ${index + 1
                                                    }`}
                                            />
                                        </button>
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                        </div>
                    )}
                </div>
                {isZoomOpen && activeImage && (
                    <div
                        className="img-zoom-overlay"
                        onClick={() => setIsZoomOpen(false)}
                    >
                        <div
                            className="img-zoom-inner"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="img-zoom-close"
                                onClick={() => setIsZoomOpen(false)}
                            >
                                <img
                                    className="collapse-icon"
                                    src={collapseIcon}
                                    alt="Collapse Icon"
                                />
                            </button>

                            <div
                                className="img-zoom-main"
                                onMouseMove={handleZoomMove}
                                onMouseLeave={handleZoomLeave}
                            >
                                <img
                                    src={activeImage}
                                    alt={piece.name}
                                    className="img-zoom-main-img"
                                />
                            </div>

                            <div className="img-zoom-window">
                                <img
                                    src={activeImage}
                                    alt={`${piece.name} zoomed`}
                                    className="img-zoom-window-img"
                                    style={{
                                        transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`,
                                        transform: "scale(3)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ViewPieceModal;
