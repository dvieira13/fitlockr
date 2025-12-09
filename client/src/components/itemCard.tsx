// src/components/itemCard.tsx
import { useState } from "react";
import "../styles/index.css";
import "../styles/components/itemCard.css";
import openArrowIcon from "../assets/icons/open_arrow_icon.svg";
import deleteIconWhite from "../assets/icons/delete_white_icon.svg";
import editIconWhite from "../assets/icons/edit_white_icon.svg";
import addIconWhite from "../assets/icons/add_white_icon.svg";
import addOpenedIconWhite from "../assets/icons/add_opened_white_icon.svg";
import { useUser } from "../context/userContext";
import { apiClient } from "../apiClient";
import type { PieceAPI, OutfitAPI } from "../types/types.api";

type ItemCardMode = "pieces" | "outfits";

interface ItemCardProps {
    mode: ItemCardMode;

    // pieces mode
    piece?: PieceAPI;

    // outfits mode
    outfit?: OutfitAPI;
    /** map of all user's pieces by _id, used to resolve outfit.pieces ids */
    piecesByIdForOutfits?: Record<string, PieceAPI>;

    // callbacks – mode-specific
    onRemovedPiece?: (pieceId: string) => void;
    onRemovedOutfit?: (outfitId: string) => void;

    onEditPiece?: (piece: PieceAPI) => void;
    onEditOutfit?: (outfit: OutfitAPI) => void;

    onViewPiece?: (piece: PieceAPI) => void;
    onViewOutfit?: (outfit: OutfitAPI) => void;

    /** For outfits: open AddToShelfModal (wire up in parent later) */
    onAddOutfitToShelf?: (outfit: OutfitAPI) => void;

    /**
     * Optional override for delete behavior (e.g. shelves page).
     * If provided, the default "remove from user" logic is skipped.
     */
    onDeleteFromShelf?: (args: {
        mode: ItemCardMode;
        pieceId?: string;
        outfitId?: string;
    }) => Promise<void> | void;
}

const ItemCard: React.FC<ItemCardProps> = ({
    mode,
    piece,
    outfit,
    piecesByIdForOutfits,
    onRemovedPiece,
    onRemovedOutfit,
    onEditPiece,
    onEditOutfit,
    onViewPiece,
    onViewOutfit,
    onAddOutfitToShelf,
    onDeleteFromShelf,
}) => {
    const { user, refreshUser } = useUser();
    const [showAddToOptions, setShowAddToOptions] = useState(false); // pieces-only dropdown
    const [isDeleting, setIsDeleting] = useState(false);

    const isPiecesMode = mode === "pieces";

    // safety guards
    if (isPiecesMode && !piece) {
        console.warn("ItemCard in pieces mode requires piece prop");
        return null;
    }
    if (!isPiecesMode && !outfit) {
        console.warn("ItemCard in outfits mode requires outfit prop");
        return null;
    }

    const cardClassName =
        "item-card shadow " + (isPiecesMode ? "pieces-mode" : "outfits-mode");

    // ---------- Outfit-specific image resolution ----------
    let headwearPiece: PieceAPI | undefined;
    let topPiece: PieceAPI | undefined;
    let outerwearPiece: PieceAPI | undefined;
    let bottomPiece: PieceAPI | undefined;
    let footwearPiece: PieceAPI | undefined;

    if (!isPiecesMode && outfit) {
        const rawPieces: any[] = ((outfit as any).pieces ?? []) as any[];

        const resolvedPieces: PieceAPI[] = rawPieces
            .map((entry) => {
                // Case 1: already a populated PieceAPI
                if (entry && typeof entry === "object" && "primary_img" in entry) {
                    return entry as PieceAPI;
                }
                // Case 2: just an id string -> look up in piecesByIdForOutfits
                if (typeof entry === "string" && piecesByIdForOutfits) {
                    return piecesByIdForOutfits[entry] ?? null;
                }
                return null;
            })
            .filter((p): p is PieceAPI => !!p);

        const findByType = (type: string) =>
            resolvedPieces.find((p) => p.type === type);

        headwearPiece = findByType("Headwear");
        topPiece = findByType("Top");
        outerwearPiece = findByType("Outerwear");
        bottomPiece = findByType("Bottom");
        footwearPiece = findByType("Footwear");
    }

    // ---------- Compute layout class for outfit image container ----------
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

    const imgContainerClassName = isPiecesMode
        ? "item-card-img-container pieces-mode"
        : `item-card-img-container outfits-mode ${outfitImgLayoutClass}`.trim();

    // ---------- Click handlers ----------
    const handleCardClick = () => {
        if (isPiecesMode) {
            if (onViewPiece && piece) onViewPiece(piece);
        } else {
            if (onViewOutfit && outfit) onViewOutfit(outfit);
        }
    };

    const handleBuyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!isPiecesMode) return; // never in outfit mode
        if (!piece?.product_link) return;

        window.open(piece.product_link, "_blank", "noopener,noreferrer");
    };

    const handleDeleteClick = async (
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        e.stopPropagation();

        // 🔹 Shelf override: only remove from shelf, not from user
        if (onDeleteFromShelf) {
            const pieceId = piece?._id;
            const outfitId =
                (outfit as any)?._id ?? (outfit as any)?.id ?? undefined;

            try {
                setIsDeleting(true);
                await onDeleteFromShelf({
                    mode,
                    pieceId,
                    outfitId,
                });
            } finally {
                setIsDeleting(false);
            }
            return;
        }

        // ------- default behavior (pieces/outfits pages) -------
        if (!user) return;

        if (isPiecesMode && piece) {
            try {
                setIsDeleting(true);
                await apiClient.removePieceFromUser(user.id, piece._id);
                await refreshUser();
                onRemovedPiece?.(piece._id);
            } catch (err) {
                console.error("Failed to remove piece from user", err);
            } finally {
                setIsDeleting(false);
            }
        } else if (!isPiecesMode && outfit) {
            // Remove outfit from *user* (not delete from global outfits collection)
            const id = (outfit as any)._id ?? (outfit as any).id;
            if (!id) return;

            try {
                setIsDeleting(true);
                await apiClient.removeOutfitFromUser(user.id, id);
                await refreshUser();
                onRemovedOutfit?.(id);
            } catch (err) {
                console.error("Failed to remove outfit from user", err);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (isPiecesMode && piece && onEditPiece) {
            onEditPiece(piece);
        } else if (!isPiecesMode && outfit && onEditOutfit) {
            onEditOutfit(outfit); // open EditOutfitModal in edit mode
        }
    };

    // PIECES-ONLY dropdown “Add to”
    const handleAddToClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setShowAddToOptions((prev) => !prev);
    };

    const handleAddToMouseLeave = () => {
        setShowAddToOptions(false);
    };

    const handleAddToOutfitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        // hook up real behavior later
    };

    const handleAddToShelfClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        // hook up real behavior later
    };

    // OUTFITS “Add to” → open AddToShelfModal via parent
    const handleAddOutfitToShelfClick = (
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        e.stopPropagation();
        if (!outfit) return;
        if (onAddOutfitToShelf) {
            onAddOutfitToShelf(outfit);
        }
        // actual AddToShelfModal will be handled in parent page
    };

    const title = isPiecesMode ? piece!.name : outfit!.name;
    const subtitle = isPiecesMode ? piece!.type : "Outfit";

    return (
        <div className={cardClassName} onClick={handleCardClick}>
            <div className={imgContainerClassName}>
                {isPiecesMode ? (
                    <img
                        className="item-card-img piece-primary-img"
                        src={piece!.primary_img}
                        alt={piece!.name}
                    />
                ) : (
                    <div className="outfit-img-grid">
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
                )}
            </div>

            <div className="item-card-info-container">
                <p className="caption-copy black-text piece-type">
                    {subtitle}
                </p>
                <h5 className="piece-name">{title}</h5>
            </div>

            <div className="item-card-overlay">
                {/* PIECES-ONLY BUY BUTTON */}
                {isPiecesMode &&
                    !piece!.owned &&
                    piece!.product_link && (
                        <button
                            type="button"
                            className="button buy-button"
                            onClick={handleBuyClick}
                        >
                            <p className="caption-copy">Buy</p>
                            <img
                                className="open-arrow-icon"
                                src={openArrowIcon}
                                alt="Open Arrow Icon"
                            />
                        </button>
                    )}

                <div className="item-card-action-overlay">
                    {/* Delete in BOTH modes */}
                    <button
                        type="button"
                        className="button delete-button"
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                    >
                        <p className="caption-copy">
                            {isDeleting ? "Deleting..." : "Delete"}
                        </p>
                        <img
                            className="delete-icon-white"
                            src={deleteIconWhite}
                            alt="Delete Icon"
                        />
                    </button>

                    {/* Edit in both modes */}
                    <button
                        type="button"
                        className="button edit-button"
                        onClick={handleEditClick}
                    >
                        <p className="caption-copy">Edit</p>
                        <img
                            className="edit-icon-white"
                            src={editIconWhite}
                            alt="Edit Icon"
                        />
                    </button>

                    {/* Pieces-only Add-to DROPDOWN */}
                    {isPiecesMode && (
                        <div
                            className={
                                "button add-to-button" +
                                (showAddToOptions ? " add-to-button-opened" : "")
                            }
                            onMouseLeave={handleAddToMouseLeave}
                        >
                            <button
                                type="button"
                                className="add-to-button-top"
                                onClick={handleAddToClick}
                            >
                                <p className="caption-copy">Add to</p>
                                <div className="add-to-icon-container">
                                    <img
                                        className="add-icon-white"
                                        src={addIconWhite}
                                        alt="Add Icon"
                                    />
                                    <img
                                        className="add-opened-icon-white"
                                        src={addOpenedIconWhite}
                                        alt="Add Opened Icon"
                                    />
                                </div>
                            </button>
                            <div className="add-to-options-container">
                                <button
                                    type="button"
                                    className="button add-to-outfit-button"
                                    onClick={handleAddToOutfitClick}
                                >
                                    <p className="caption-copy hyperlink-text">
                                        Outfit
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    className="button add-to-shelf-button"
                                    onClick={handleAddToShelfClick}
                                >
                                    <p className="caption-copy hyperlink-text">
                                        Shelf
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* OUTFITS “Add to” → single button that will open AddToShelfModal */}
                    {!isPiecesMode && (
                        <button
                            type="button"
                            className="button add-to-button outfits-add-to-button"
                            onClick={handleAddOutfitToShelfClick}
                        >
                            <p className="caption-copy">Add to</p>
                            <div className="add-to-icon-container">
                                <img
                                    className="add-icon-white"
                                    src={addIconWhite}
                                    alt="Add Icon"
                                />
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemCard;
