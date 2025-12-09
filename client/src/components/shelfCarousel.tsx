// src/components/shelfCarousel.tsx
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/index.css";
import "../styles/components/shelfCarousel.css";

import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel, Scrollbar } from "swiper/modules";
import "swiper/css";

import nextArrowIcon from "../assets/icons/next_arrow_icon.svg";
import openArrowWhiteIcon from "../assets/icons/open_arrow_white_icon.svg";
import addIconWhite from "../assets/icons/add_white_icon.svg";
import editIconWhite from "../assets/icons/edit_white_icon.svg";
import deleteIconWhite from "../assets/icons/delete_white_icon.svg";

import { slugifyShelfName } from "../utils/shelfSlug";

import type { PieceAPI, OutfitAPI, ShelfAPI } from "../types/types.api";
import type { ShelfItemType } from "../types/types";

interface ShelfCarouselProps {
    shelves?: ShelfAPI[];

    // for resolving shelf.item_id → PieceAPI / OutfitAPI
    piecesByIdForShelves?: Record<string, PieceAPI>;
    outfitsByIdForShelves?: Record<string, OutfitAPI>;

    onOpenAddItems?: (shelf: ShelfAPI) => void;
    onOpenEditShelf?: (shelf: ShelfAPI) => void;
    onDeleteShelf?: (shelfId: string) => void;

    /** Optional: open AddShelfModal from Locker page */
    onOpenCreateShelf?: () => void;

    /** Optional: indicate shelves are still loading */
    isLoadingShelves?: boolean;
}

const toTimestamp = (value: any): number => {
    if (!value) return 0;
    const t = new Date(value as any).getTime();
    return Number.isNaN(t) ? 0 : t;
};

// ---------- helper: simple thumb (used for pieces + outfit fallback) ----------
function resolveShelfItemThumb(
    shelfItem: any,
    piecesByIdForShelves?: Record<string, PieceAPI>,
    outfitsByIdForShelves?: Record<string, OutfitAPI>
): { src: string | null; alt: string } {
    const itemType: ShelfItemType = shelfItem.item_type;
    const rawItem = shelfItem.item_id;

    if (itemType === "Piece") {
        let piece: PieceAPI | undefined;
        const rawId =
            typeof rawItem === "string"
                ? rawItem
                : (rawItem as any)?._id ?? (rawItem as any)?.id;

        if (rawId && piecesByIdForShelves && piecesByIdForShelves[rawId]) {
            piece = piecesByIdForShelves[rawId];
        } else if (
            rawItem &&
            typeof rawItem === "object" &&
            "primary_img" in rawItem
        ) {
            piece = rawItem as PieceAPI;
        }

        return {
            src: piece?.primary_img ?? null,
            alt: piece?.name ?? "Piece",
        };
    }

    if (itemType === "Outfit") {
        let outfit: OutfitAPI | undefined;
        const rawId =
            typeof rawItem === "string"
                ? rawItem
                : (rawItem as any)?._id ?? (rawItem as any)?.id;

        if (rawId && outfitsByIdForShelves && outfitsByIdForShelves[rawId]) {
            outfit = outfitsByIdForShelves[rawId];
        } else if (
            rawItem &&
            typeof rawItem === "object" &&
            "name" in rawItem
        ) {
            outfit = rawItem as OutfitAPI;
        }

        const anyImg =
            (outfit as any)?.primary_img ||
            (outfit as any)?.hero_img ||
            null;

        return {
            src: anyImg,
            alt: outfit?.name ?? "Outfit",
        };
    }

    return { src: null, alt: "Item" };
}

// ---------- helper: build outfit grid pieces + layout (mirror ItemCard logic) ----------
function buildOutfitGridData(
    outfit: OutfitAPI,
    piecesByIdForShelves?: Record<string, PieceAPI>
): {
    headwearPiece?: PieceAPI;
    topPiece?: PieceAPI;
    outerwearPiece?: PieceAPI;
    bottomPiece?: PieceAPI;
    footwearPiece?: PieceAPI;
    layoutClass: string;
} {
    const rawPieces: any[] = ((outfit as any).pieces ?? []) as any[];

    const resolvedPieces: PieceAPI[] = rawPieces
        .map((entry) => {
            // already populated
            if (entry && typeof entry === "object" && "primary_img" in entry) {
                return entry as PieceAPI;
            }
            // id → lookup map
            if (typeof entry === "string" && piecesByIdForShelves) {
                return piecesByIdForShelves[entry] ?? null;
            }
            return null;
        })
        .filter((p): p is PieceAPI => !!p);

    const findByType = (type: string) =>
        resolvedPieces.find((p) => p.type === type);

    const headwearPiece = findByType("Headwear");
    const topPiece = findByType("Top");
    const outerwearPiece = findByType("Outerwear");
    const bottomPiece = findByType("Bottom");
    const footwearPiece = findByType("Footwear");

    const hasHeadwear = !!headwearPiece;
    const hasUpper = !!topPiece || !!outerwearPiece;
    const hasLower = !!bottomPiece || !!footwearPiece;

    let layoutClass = "";

    if (hasHeadwear && !hasUpper && !hasLower) {
        layoutClass = "headwear-only";
    } else if (hasHeadwear && hasUpper && !hasLower) {
        layoutClass = "headwear-plus-row-upper";
    } else if (hasHeadwear && !hasUpper && hasLower) {
        layoutClass = "headwear-plus-row-lower";
    } else if (!hasHeadwear && hasUpper && !hasLower) {
        layoutClass = "row-upper-only";
    } else if (!hasHeadwear && !hasUpper && hasLower) {
        layoutClass = "row-lower-only";
    } else if (!hasHeadwear && hasUpper && hasLower) {
        layoutClass = "no-headwear";
    }

    return {
        headwearPiece,
        topPiece,
        outerwearPiece,
        bottomPiece,
        footwearPiece,
        layoutClass,
    };
}

// (noop for now – keeps existing onSwiper/onSlideChange code compiling)
const updateNavState = (_swiper: any) => { };

const ShelfCarousel: React.FC<ShelfCarouselProps> = ({
    shelves = [],
    piecesByIdForShelves,
    outfitsByIdForShelves,
    onOpenAddItems,
    onOpenEditShelf,
    onDeleteShelf,
    onOpenCreateShelf,
    isLoadingShelves = false,
}) => {
    const swiperRef = useRef<any>(null);

    const hasShelves = shelves.length > 0;

    const addLabel = "Add Shelf";
    const addHandler = onOpenCreateShelf;

    const renderHeader = () => (
        <div className="shelf-carousel-header">
            <div className="shelf-carousel-header-left">
                <h2 className="carousel-title bold-text">Shelves</h2>
                <Link to="/locker/shelves" className="carousel-view-all">
                    <p className="caption-copy hyperlink-text">View All</p>
                </Link>
            </div>

            <div className="shelf-carousel-actions">
                <div className="shelf-carousel-controls">
                    {/* You can later add prev/next here using nextArrowIcon if you want */}
                    <button
                        type="button"
                        className="add-button button"
                        onClick={() => addHandler && addHandler()}
                        disabled={!addHandler}
                    >
                        <p className="caption-copy bold-text">{addLabel}</p>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderShelfGrid = (shelf: ShelfAPI) => {
        const items = Array.isArray(shelf.items) ? shelf.items : [];
        const totalCount = items.length;

        // 🔹 If shelf has no items, show empty text instead of grid
        if (totalCount === 0) {
            return (
                <p className="caption-copy shelf-empty-text">
                    This shelf doesn&apos;t have any items yet.
                </p>
            );
        }

        // Sort items within a shelf by most recently added
        const sortedItems = [...items].sort((a: any, b: any) => {
            const aTs =
                toTimestamp((a as any).item_added_date) ||
                toTimestamp((a as any).item_id?.created_date);
            const bTs =
                toTimestamp((b as any).item_added_date) ||
                toTimestamp((b as any).item_id?.created_date);
            return bTs - aTs;
        });

        const visible = sortedItems.slice(0, 7);
        const extraCount = Math.max(0, totalCount - 7);

        return (
            <div className="shelf-card-grid">
                {visible.map((shelfItem: any, index: number) => {
                    const itemType: ShelfItemType = shelfItem.item_type;

                    // PIECE → simple single image tile
                    if (itemType === "Piece") {
                        const { src, alt } = resolveShelfItemThumb(
                            shelfItem,
                            piecesByIdForShelves,
                            outfitsByIdForShelves
                        );

                        return (
                            <div
                                key={index}
                                className="shelf-grid-tile shadow"
                            >
                                {src ? (
                                    <img
                                        className="shelf-grid-tile-img"
                                        src={src}
                                        alt={alt}
                                    />
                                ) : (
                                    <div className="shelf-grid-tile-empty" />
                                )}
                            </div>
                        );
                    }

                    // OUTFIT → full outfit grid, mirroring ItemCard
                    if (itemType === "Outfit") {
                        const rawItem = shelfItem.item_id;
                        let outfit: OutfitAPI | undefined;
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

                        if (!outfit) {
                            // fallback to simple thumb
                            const { src, alt } = resolveShelfItemThumb(
                                shelfItem,
                                piecesByIdForShelves,
                                outfitsByIdForShelves
                            );
                            return (
                                <div
                                    key={index}
                                    className="shelf-grid-tile shadow"
                                >
                                    {src ? (
                                        <img
                                            className="shelf-grid-tile-img"
                                            src={src}
                                            alt={alt}
                                        />
                                    ) : (
                                        <div className="shelf-grid-tile-empty" />
                                    )}
                                </div>
                            );
                        }

                        const {
                            headwearPiece,
                            topPiece,
                            outerwearPiece,
                            bottomPiece,
                            footwearPiece,
                            layoutClass,
                        } = buildOutfitGridData(
                            outfit,
                            piecesByIdForShelves
                        );

                        const hasAnyPiece =
                            headwearPiece ||
                            topPiece ||
                            outerwearPiece ||
                            bottomPiece ||
                            footwearPiece;

                        if (!hasAnyPiece) {
                            const { src, alt } = resolveShelfItemThumb(
                                shelfItem,
                                piecesByIdForShelves,
                                outfitsByIdForShelves
                            );
                            return (
                                <div
                                    key={index}
                                    className="shelf-grid-tile shadow"
                                >
                                    {src ? (
                                        <img
                                            className="shelf-grid-tile-img"
                                            src={src}
                                            alt={alt}
                                        />
                                    ) : (
                                        <div className="shelf-grid-tile-empty" />
                                    )}
                                </div>
                            );
                        }

                        // Reuse the exact same grid markup + classes as ItemCard
                        return (
                            <div
                                key={index}
                                className="shelf-grid-tile shelf-grid-tile-outfit shadow"
                            >
                                <div
                                    className={`
                                        item-card-img-container
                                        outfits-mode
                                        ${layoutClass}
                                    `.trim()}
                                >
                                    <div className="outfit-img-grid">
                                        {/* Row 1: Headwear */}
                                        <div className="outfit-img-row outfit-row-headwear">
                                            {headwearPiece && (
                                                <img
                                                    className="item-card-img outfit-piece-img headwear-img"
                                                    src={
                                                        headwearPiece.primary_img
                                                    }
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
                                                    src={
                                                        outerwearPiece.primary_img
                                                    }
                                                    alt={outerwearPiece.name}
                                                />
                                            )}
                                        </div>

                                        {/* Row 3: Bottom & Footwear */}
                                        <div className="outfit-img-row outfit-row-lower">
                                            {bottomPiece && (
                                                <img
                                                    className="item-card-img outfit-piece-img bottom-img"
                                                    src={
                                                        bottomPiece.primary_img
                                                    }
                                                    alt={bottomPiece.name}
                                                />
                                            )}
                                            {footwearPiece && (
                                                <img
                                                    className="item-card-img outfit-piece-img footwear-img"
                                                    src={
                                                        footwearPiece.primary_img
                                                    }
                                                    alt={footwearPiece.name}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // fallback (unknown type)
                    const { src, alt } = resolveShelfItemThumb(
                        shelfItem,
                        piecesByIdForShelves,
                        outfitsByIdForShelves
                    );

                    return (
                        <div key={index} className="shelf-grid-tile shadow">
                            {src ? (
                                <img
                                    className="shelf-grid-tile-img"
                                    src={src}
                                    alt={alt}
                                />
                            ) : (
                                <div className="shelf-grid-tile-empty" />
                            )}
                        </div>
                    );
                })}

                {extraCount > 0 && (
                    <div className="shelf-grid-tile shelf-grid-tile-more">
                        <h4 className="bold-text">+{extraCount}</h4>
                    </div>
                )}
            </div>
        );
    };

    const renderShelfCard = (shelf: ShelfAPI) => {
        const shelfName = shelf.name ?? "";
        const items = Array.isArray(shelf.items) ? shelf.items : [];
        const count = items.length;
        const label = count === 1 ? "Item" : "Items";

        const shelfSlug = slugifyShelfName(shelfName || "");
        const shelfPath = shelfSlug ? `/locker/shelves/${shelfSlug}` : "";

        const handleAddItemsClick = () => {
            onOpenAddItems?.(shelf);
        };

        const handleEditShelfClick = () => {
            onOpenEditShelf?.(shelf);
        };

        const handleDeleteShelfClick = () => {
            if (!onDeleteShelf) return;
            onDeleteShelf(shelf._id);
        };

        return (
            <div className="shelf-carousel-card">
                <div className="shelf-card-header">
                    <div className="shelf-card-title">
                        <h4 className="bold-text shelf-name">
                            {shelfName}
                        </h4>
                    </div>

                    <div className="shelf-card-actions">
                        <div className="shelf-card-action-buttons desktop-only">
                            <button
                                type="button"
                                className="button add-items-button"
                                onClick={handleAddItemsClick}
                                disabled={!onOpenAddItems}
                            >
                                <img
                                    className="add-icon"
                                    src={addIconWhite}
                                    alt="Add Icon"
                                />
                                <p className="caption-copy">Add Items</p>
                            </button>
                            <button
                                type="button"
                                className="button edit-button"
                                onClick={handleEditShelfClick}
                                disabled={!onOpenEditShelf}
                            >
                                <img
                                    className="edit-icon"
                                    src={editIconWhite}
                                    alt="Edit Icon"
                                />
                                <p className="caption-copy">Rename</p>
                            </button>
                            <button
                                type="button"
                                className="button delete-button"
                                onClick={handleDeleteShelfClick}
                                disabled={!onDeleteShelf}
                            >
                                <img
                                    className="delete-icon"
                                    src={deleteIconWhite}
                                    alt="Delete Icon"
                                />
                                <p className="caption-copy">Delete</p>
                            </button>
                        </div>

                        {shelfPath && (
                            <Link
                                to={shelfPath}
                                className="open-shelf-button"
                                aria-label={`Open shelf ${shelfName}`}
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

                {renderShelfGrid(shelf)}
                <div className="shelf-card-action-buttons mobile-only">
                    <button
                        type="button"
                        className="button add-items-button"
                        onClick={handleAddItemsClick}
                        disabled={!onOpenAddItems}
                    >
                        <img
                            className="add-icon"
                            src={addIconWhite}
                            alt="Add Icon"
                        />
                        <p className="caption-copy">Add Items</p>
                    </button>
                    <button
                        type="button"
                        className="button edit-button"
                        onClick={handleEditShelfClick}
                        disabled={!onOpenEditShelf}
                    >
                        <img
                            className="edit-icon"
                            src={editIconWhite}
                            alt="Edit Icon"
                        />
                        <p className="caption-copy">Rename</p>
                    </button>
                    <button
                        type="button"
                        className="button delete-button"
                        onClick={handleDeleteShelfClick}
                        disabled={!onDeleteShelf}
                    >
                        <img
                            className="delete-icon"
                            src={deleteIconWhite}
                            alt="Delete Icon"
                        />
                        <p className="caption-copy">Delete</p>
                    </button>
                </div>
            </div>
        );
    };

    const slides = useMemo(() => {
        if (!hasShelves) return null;

        // ✅ sort shelves by created_date / createdAt, newest first
        const sortedShelves = [...shelves].sort((a, b) => {
            const aTs =
                toTimestamp((a as any).created_date) ||
                toTimestamp((a as any).createdAt);
            const bTs =
                toTimestamp((b as any).created_date) ||
                toTimestamp((b as any).createdAt);
            return bTs - aTs;
        });

        return sortedShelves.map((shelf) => (
            <SwiperSlide
                key={shelf._id ?? shelf.name}
                className="shelf-carousel-slide"
            >
                {renderShelfCard(shelf)}
            </SwiperSlide>
        ));
    }, [shelves, hasShelves, piecesByIdForShelves, outfitsByIdForShelves]);

    return (
        <section className="shelf-carousel">
            {renderHeader()}

            {!hasShelves ? (
                <p className="caption-copy carousel-empty">
                    {isLoadingShelves
                        ? "Loading shelves..."
                        : "You don't have any shelves yet."}
                </p>
            ) : (
                <div className="shelf-carousel-swiper-wrapper">
                    <Swiper
                        onSwiper={(swiper) => {
                            swiperRef.current = swiper;
                            updateNavState(swiper);
                        }}
                        onSlideChange={updateNavState}
                        spaceBetween={15}
                        slidesPerView="auto"
                        freeMode={{
                            enabled: true,
                            sticky: false,
                            momentumBounce: true,
                            momentumRatio: 0.7,
                        }}
                        modules={[Mousewheel, Scrollbar]}
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
                        centeredSlides={false}
                        grabCursor={false}
                        allowTouchMove={true}
                        className="shelf-carousel-swiper"
                        breakpoints={{
                            // When window width is >= (mobile-first approach)
                            769: {
                                spaceBetween: 10,
                            },
                        }}
                    >
                        {slides}
                    </Swiper>
                </div>
            )}
        </section>
    );
};

export default ShelfCarousel;
