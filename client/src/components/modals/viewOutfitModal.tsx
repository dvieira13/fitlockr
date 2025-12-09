// src/components/modals/viewOutfitModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/viewOutfitModal.css";
import closeicon from "../../assets/icons/close_icon.svg";
import editIconWhite from "../../assets/icons/edit_white_icon.svg";
import expandIcon from "../../assets/icons/expand_arrow_icon.svg"
import collapseIcon from "../../assets/icons/collapse_arrow_icon.svg"
import { apiClient } from "../../apiClient";
import type { OutfitAPI, PieceAPI } from "../../types/types.api";

interface TagOption {
    key: string;
    label: string;
}

type TagGroups = Record<string, TagOption[]>;
type OutfitTagGroups = Record<string, Record<string, boolean>>;

interface ViewOutfitModalProps {
    outfit: OutfitAPI;
    onClose: () => void;
    onEdit?: (outfit: OutfitAPI) => void;

    /** Map of user's pieces to resolve outfit.pieces ids */
    piecesByIdForOutfits?: Record<string, PieceAPI>;

    /**
     * Called when user clicks a piece in the outfit swiper.
     * Parent should open ViewPieceModal in from-outfit mode.
     */
    onOpenPieceFromOutfit?: (piece: PieceAPI, outfit: OutfitAPI) => void;
}

const ViewOutfitModal: React.FC<ViewOutfitModalProps> = ({
    outfit,
    onClose,
    onEdit,
    piecesByIdForOutfits,
    onOpenPieceFromOutfit,
}) => {
    const { handleOverlayClick } = useModalBehavior(onClose);

    const [tagGroups, setTagGroups] = useState<TagGroups>({});

    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [zoomCoords, setZoomCoords] = useState<{ x: number; y: number }>({
        x: 50,
        y: 50,
    });

    // Resolve outfit pieces → PieceAPI[]
    const outfitPieces: PieceAPI[] = useMemo(() => {
        const raw = ((outfit as any).pieces ?? []) as any[];

        return raw
            .map((entry) => {
                if (entry && typeof entry === "object" && "primary_img" in entry) {
                    return entry as PieceAPI;
                }
                if (typeof entry === "string" && piecesByIdForOutfits) {
                    return piecesByIdForOutfits[entry] ?? null;
                }
                return null;
            })
            .filter((p): p is PieceAPI => !!p);
    }, [outfit, piecesByIdForOutfits]);

    // 🔹 Break outfit pieces into slot types (same logic as ItemCard)
    const findByType = (type: string) =>
        outfitPieces.find((p) => p.type === type);

    const headwearPiece = findByType("Headwear");
    const topPiece = findByType("Top");
    const outerwearPiece = findByType("Outerwear");
    const bottomPiece = findByType("Bottom");
    const footwearPiece = findByType("Footwear");

    const hasHeadwear = !!headwearPiece;
    const hasUpper = !!topPiece || !!outerwearPiece;
    const hasLower = !!bottomPiece || !!footwearPiece;

    let outfitImgLayoutClass = "";

    // CASE 1: Only headwear
    if (hasHeadwear && !hasUpper && !hasLower) {
        outfitImgLayoutClass = "headwear-only";
    }
    // CASE 2: Headwear + upper row ONLY
    else if (hasHeadwear && hasUpper && !hasLower) {
        outfitImgLayoutClass = "headwear-plus-row-upper";
    }
    // CASE 3: Headwear + lower row ONLY
    else if (hasHeadwear && !hasUpper && hasLower) {
        outfitImgLayoutClass = "headwear-plus-row-lower";
    }
    // CASE 4: No headwear + upper only
    else if (!hasHeadwear && hasUpper && !hasLower) {
        outfitImgLayoutClass = "row-upper-only";
    }
    // CASE 5: No headwear + lower only
    else if (!hasHeadwear && !hasUpper && hasLower) {
        outfitImgLayoutClass = "row-lower-only";
    }
    // CASE 6: No headwear + both rows active
    else if (!hasHeadwear && hasUpper && hasLower) {
        outfitImgLayoutClass = "no-headwear";
    }

    // Fetch tag metadata (same source as pieces)
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await apiClient.getPieceTags();
                setTagGroups(res.tags || {});
            } catch (err) {
                console.error("Failed to load outfit tags", err);
            }
        };

        fetchTags();
    }, []);

    const handleInnerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
    };

    const handleEditClick = () => {
        // Close this modal AND trigger edit
        if (onEdit) {
            onEdit(outfit);
        }
        onClose();
    };

    // ----- TAGS from outfit.tags -----
    const rawOutfitTags = ((outfit as any).tags || {}) as OutfitTagGroups;

    const enabledTagKeys = new Set<string>();
    Object.values(rawOutfitTags).forEach((group) => {
        if (!group) return;
        Object.entries(group).forEach(([key, isEnabled]) => {
            if (isEnabled) enabledTagKeys.add(key);
        });
    });

    const allTagOptions: TagOption[] = Object.values(tagGroups)
        .flat()
        .filter(Boolean);

    const outfitTags: TagOption[] = allTagOptions.filter((opt) =>
        enabledTagKeys.has(opt.key)
    );

    const hasAnyTags = outfitTags.length > 0;
    const hasAnyPieces =
        headwearPiece ||
        topPiece ||
        outerwearPiece ||
        bottomPiece ||
        footwearPiece;

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

    const renderOutfitGrid = (
        extraClassName?: string,
        extraStyle?: React.CSSProperties
    ) => {
        if (!hasAnyPieces) {
            return (
                <div className="primary-img placeholder">
                    <p className="caption-copy">No image available</p>
                </div>
            );
        }

        return (
            <div
                className={`outfit-img-grid ${outfitImgLayoutClass} ${extraClassName || ""
                    }`.trim()}
                style={extraStyle}
            >
                {/* Row 1: Headwear */}
                <div className="outfit-img-row outfit-row-headwear">
                    {headwearPiece && (
                        <img
                            className="item-card-img outfit-piece-img headwear-img"
                            src={headwearPiece.primary_img}
                            alt={headwearPiece.name}
                        />
                    )}
                </div>

                {/* Row 2: Top & Outerwear */}
                <div className="outfit-img-row outfit-row-upper">
                    {topPiece && (
                        <img
                            className="item-card-img outfit-piece-img top-img"
                            src={topPiece.primary_img}
                            alt={topPiece.name}
                        />
                    )}
                    {outerwearPiece && (
                        <img
                            className="item-card-img outfit-piece-img outerwear-img"
                            src={outerwearPiece.primary_img}
                            alt={outerwearPiece.name}
                        />
                    )}
                </div>

                {/* Row 3: Bottom & Footwear */}
                <div className="outfit-img-row outfit-row-lower">
                    {bottomPiece && (
                        <img
                            className="item-card-img outfit-piece-img bottom-img"
                            src={bottomPiece.primary_img}
                            alt={bottomPiece.name}
                        />
                    )}
                    {footwearPiece && (
                        <img
                            className="item-card-img outfit-piece-img footwear-img"
                            src={footwearPiece.primary_img}
                            alt={footwearPiece.name}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div
                className="modal-container view-outfit-modal"
                onClick={handleInnerClick}
            >
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
                    <h4 className="bold-text">{outfit.name || "Outfit"}</h4>
                </div>

                <div className="modal-content">
                    <div className="outfit-content-top">
                        {/* PRIMARY IMAGE = full outfit grid, same as outfit item-card */}
                        <div
                            className="primary-img-container shadow outfits-mode"
                            onClick={hasAnyPieces ? () => setIsZoomOpen(true) : undefined}
                        >
                            {renderOutfitGrid()}
                            <img
                                className="expand-icon"
                                src={expandIcon}
                                alt="Expand Icon"
                            />
                        </div>

                        {/* OUTFIT INFO (only tags) */}
                        <div className={"outfit-info-container" + (hasAnyTags ? "" : " no-tags")}>
                            {hasAnyTags && (
                                <div className="outfit-tags-container">
                                    {outfitTags.map((tag) => (
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

                            {/* SWIPER: each piece in outfit */}
                            {outfitPieces.length > 0 && (
                                <div className="outfit-pieces-swiper-container">
                                    <p className="body-copy bold-text">Pieces:</p>
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
                                        className="outfit-pieces-swiper"
                                    >
                                        {outfitPieces.map((p) => (
                                            <SwiperSlide
                                                key={p._id}
                                                className="outfit-piece-swiper-slide shadow"
                                            >
                                                <button
                                                    type="button"
                                                    className="outfit-piece-thumb-button"
                                                    onClick={() => {
                                                        if (onOpenPieceFromOutfit) {
                                                            onOpenPieceFromOutfit(
                                                                p,
                                                                outfit
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <img
                                                        className="outfit-piece-thumb"
                                                        src={p.primary_img}
                                                        alt={p.name}
                                                    />
                                                </button>
                                            </SwiperSlide>
                                        ))}
                                    </Swiper>
                                </div>
                            )}
                        </div>

                        {/* RIGHT-SIDE OVERLAY ACTIONS (NO buy button) */}
                        <div className="view-outfit-overlay">
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
                    {isZoomOpen && hasAnyPieces && (
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
                                    {renderOutfitGrid()}
                                </div>

                                <div className="img-zoom-window">
                                    {renderOutfitGrid("zoom-grid", {
                                        transformOrigin: `${zoomCoords.x}% ${zoomCoords.y}%`,
                                        transform: "scale(3)",
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ViewOutfitModal;
