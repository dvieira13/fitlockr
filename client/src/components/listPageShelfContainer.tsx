// src/components/listPageShelfContainer.tsx
import "../styles/index.css";
import "../styles/components/listPageShelfContainer.css";
import { Link } from "react-router-dom";
import { slugifyShelfName } from "../utils/shelfSlug";

import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";

import openArrowWhiteIcon from "../assets/icons/open_arrow_white_icon.svg";
import addIconWhite from "../assets/icons/add_white_icon.svg";
import editIconWhite from "../assets/icons/edit_white_icon.svg";
import deleteIconWhite from "../assets/icons/delete_white_icon.svg";
import ItemCard from "./itemCard";

import type { ShelfItemType } from "../types/types";
import type { PieceAPI, OutfitAPI, ShelfAPI } from "../types/types.api";

interface ListPageShelfContainerProps {
    shelf: ShelfAPI;

    // 🔹 full piece & outfit maps (from parent)
    piecesByIdForOutfits?: Record<string, PieceAPI>;
    outfitsByIdForShelves?: Record<string, OutfitAPI>;

    onDeleteShelf?: (shelfId: string) => void;
    onOpenAddItems?: (shelf: ShelfAPI) => void;
    onOpenEditShelf?: (shelf: ShelfAPI) => void;
    onRemoveShelfItem?: (
        shelfId: string,
        itemId: string,
        itemType: ShelfItemType
    ) => Promise<void> | void;

    // view / edit callbacks for cards
    onViewPiece?: (piece: PieceAPI) => void;
    onViewOutfit?: (outfit: OutfitAPI) => void;
    onEditPiece?: (piece: PieceAPI) => void;
    onEditOutfit?: (outfit: OutfitAPI) => void;
}

// helper to normalize date
const toTimestamp = (value: any): number => {
    if (!value) return 0;
    const t = new Date(value as any).getTime();
    return Number.isNaN(t) ? 0 : t;
};

const ListPageShelfContainer: React.FC<ListPageShelfContainerProps> = ({
    shelf,
    piecesByIdForOutfits,
    outfitsByIdForShelves,
    onDeleteShelf,
    onOpenAddItems,
    onOpenEditShelf,
    onRemoveShelfItem,
    onViewPiece,
    onViewOutfit,
    onEditPiece,
    onEditOutfit,
}) => {
    const shelfName = shelf.name;
    const items = Array.isArray(shelf.items) ? shelf.items : [];

    const count = items.length;
    const label = count === 1 ? "Item" : "Items";

    // slug + route for the shelf detail page
    const shelfSlug = slugifyShelfName(shelfName || "");
    const shelfPath = shelfSlug ? `/locker/shelves/${shelfSlug}` : "";

    // sort by item_added_date desc (most recently added first)
    const sortedItems = [...items].sort((a: any, b: any) => {
        const aTs =
            toTimestamp((a as any).item_added_date) ||
            toTimestamp((a as any).item_id?.created_date);
        const bTs =
            toTimestamp((b as any).item_added_date) ||
            toTimestamp((b as any).item_id?.created_date);
        return bTs - aTs;
    });

    const handleDeleteShelfClick = () => {
        onDeleteShelf?.(shelf._id);
    };

    const handleAddItemsClick = () => {
        onOpenAddItems?.(shelf);
    };

    const handleEditShelfClick = () => {
        onOpenEditShelf?.(shelf);
    };

    // used by ItemCard’s onDeleteFromShelf override
    const handleDeleteItemFromShelf = async (args: {
        mode: "pieces" | "outfits";
        pieceId?: string;
        outfitId?: string;
    }) => {
        if (!onRemoveShelfItem) return;

        if (args.mode === "pieces" && args.pieceId) {
            await onRemoveShelfItem(shelf._id, args.pieceId, "Piece");
        } else if (args.mode === "outfits" && args.outfitId) {
            await onRemoveShelfItem(shelf._id, args.outfitId, "Outfit");
        }
    };

    return (
        <div className="list-page-shelf-container">
            <div className="list-page-shelf-container-header">
                <div className="shelf-container-header-inner">
                    <div className="shelf-container-header-title">
                        <h3 className="bold-text shelf-name">{shelfName}</h3>
                        <p className="caption-copy shelf-cards-count">
                            {count} {label}
                        </p>
                    </div>

                    <div className="shelf-container-header-actions">
                        <div className="shelf-container-header-action-buttons">
                            <button
                                type="button"
                                className="button add-items-button"
                                onClick={handleAddItemsClick}
                            >
                                <img
                                    className="add-icon"
                                    src={addIconWhite}
                                    alt="Add Icon"
                                />
                                <p className="caption-copy bold-text">
                                    Add Items
                                </p>
                            </button>
                            <button
                                type="button"
                                className="button edit-button"
                                onClick={handleEditShelfClick}
                            >
                                <img
                                    className="edit-icon"
                                    src={editIconWhite}
                                    alt="Edit Icon"
                                />
                                <p className="caption-copy bold-text">
                                    Rename
                                </p>
                            </button>
                            <button
                                type="button"
                                className="button delete-button"
                                onClick={handleDeleteShelfClick}
                            >
                                <img
                                    className="delete-icon"
                                    src={deleteIconWhite}
                                    alt="Delete Icon"
                                />
                                <p className="caption-copy bold-text">
                                    Delete
                                </p>
                            </button>
                        </div>

                        {shelfPath && (
                            <Link
                                to={shelfPath}
                                className="open-shelf-button"
                                aria-label={`Open shelf ${shelfName || ""}`}
                            >
                                <img
                                    className="open-arrow-icon"
                                    src={openArrowWhiteIcon}
                                    alt="Open Shelf"
                                />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="separator-line"></div>
            </div>

            <div className="list-page-shelf-items-wrapper">
                {sortedItems.length === 0 ? (
                    <p className="caption-copy no-items-text">
                        This shelf has no items yet.
                    </p>
                ) : (
                    <Swiper
                        direction="horizontal"
                        slidesPerView="auto"
                        spaceBetween={16}
                        freeMode={{
                            enabled: true,
                            sticky: false,
                            momentumBounce: true,
                            momentumRatio: 0.7,
                        }}
                        modules={[Scrollbar, Mousewheel]}
                        mousewheel={{
                            forceToAxis: true,
                            releaseOnEdges: true,
                            sensitivity: 0.7,
                        }}
                        scrollbar={{
                            draggable: true,
                            hide: false,
                            snapOnRelease: false,
                        }}
                        className="shelf-items-swiper"
                    >
                        {sortedItems.map((shelfItem: any, index: number) => {
                            const itemType: ShelfItemType = shelfItem.item_type;
                            const rawItem = shelfItem.item_id;

                            let piece: PieceAPI | undefined;
                            let outfit: OutfitAPI | undefined;
                            let mode: "pieces" | "outfits" = "pieces";

                            if (itemType === "Piece") {
                                const rawId =
                                    typeof rawItem === "string"
                                        ? rawItem
                                        : (rawItem as any)?._id ??
                                        (rawItem as any)?.id;

                                if (
                                    rawId &&
                                    piecesByIdForOutfits &&
                                    piecesByIdForOutfits[rawId]
                                ) {
                                    piece = piecesByIdForOutfits[rawId];
                                } else if (
                                    rawItem &&
                                    typeof rawItem === "object" &&
                                    "primary_img" in rawItem
                                ) {
                                    piece = rawItem as PieceAPI;
                                }

                                mode = "pieces";
                            } else if (itemType === "Outfit") {
                                const rawId =
                                    typeof rawItem === "string"
                                        ? rawItem
                                        : (rawItem as any)?._id ??
                                        (rawItem as any)?.id;

                                if (
                                    rawId &&
                                    outfitsByIdForShelves &&
                                    outfitsByIdForShelves[rawId]
                                ) {
                                    outfit = outfitsByIdForShelves[rawId];
                                } else if (
                                    rawItem &&
                                    typeof rawItem === "object" &&
                                    "name" in rawItem
                                ) {
                                    outfit = rawItem as OutfitAPI;
                                }

                                mode = "outfits";
                            }

                            if (itemType === "Piece" && !piece) return null;
                            if (itemType === "Outfit" && !outfit) return null;

                            const keyBase =
                                itemType === "Piece"
                                    ? (piece as any)._id
                                    : (outfit as any)._id ??
                                    (outfit as any).id ??
                                    index;

                            return (
                                <SwiperSlide
                                    key={`${itemType}-${keyBase}-${index}`}
                                    className="shelf-item-slide"
                                >
                                    <ItemCard
                                        mode={mode}
                                        piece={piece}
                                        outfit={outfit}
                                        piecesByIdForOutfits={
                                            piecesByIdForOutfits
                                        }
                                        // delete override
                                        onDeleteFromShelf={
                                            handleDeleteItemFromShelf
                                        }
                                        // view / edit behave same as other pages
                                        onViewPiece={onViewPiece}
                                        onViewOutfit={onViewOutfit}
                                        onEditPiece={onEditPiece}
                                        onEditOutfit={onEditOutfit}
                                    />
                                </SwiperSlide>
                            );
                        })}
                    </Swiper>
                )}
            </div>
        </div>
    );
};

export default ListPageShelfContainer;
