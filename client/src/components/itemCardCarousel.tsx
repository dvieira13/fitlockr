import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/index.css";
import "../styles/components/itemCardCarousel.css";
import nextArrowIcon from "../assets/icons/next_arrow_icon.svg";

import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";
import "swiper/css";

import ItemCard from "./itemCard";
import type { PieceAPI, OutfitAPI } from "../types/types.api";

type CarouselMode = "recent-adds" | "outfits" | "pieces";

interface ItemCardCarouselProps {
    mode: CarouselMode;

    pieces?: PieceAPI[];
    outfits?: OutfitAPI[];

    piecesByIdForOutfits?: Record<string, PieceAPI>;

    onViewPiece?: (piece: PieceAPI) => void;
    onEditPiece?: (piece: PieceAPI) => void;
    onRemovePiece?: (pieceId: string) => void;

    onViewOutfit?: (outfit: OutfitAPI) => void;
    onEditOutfit?: (outfit: OutfitAPI) => void;
    onRemoveOutfit?: (outfitId: string) => void;

    /** Optional "View All" side-effect handler (analytics, etc.) */
    onClickViewAll?: () => void;

    /** Add buttons in header (handled by parent modals on /locker) */
    onAddPiece?: () => void;
    onAddOutfit?: () => void;

    /** Loading flags */
    isLoadingPieces?: boolean;
    isLoadingOutfits?: boolean;
    isLoadingRecentItems?: boolean;
}

const toTimestamp = (value: any): number => {
    if (!value) return 0;
    const t = new Date(value as any).getTime();
    return Number.isNaN(t) ? 0 : t;
};

type MixedItem =
    | { kind: "piece"; piece: PieceAPI }
    | { kind: "outfit"; outfit: OutfitAPI };

const ItemCardCarousel: React.FC<ItemCardCarouselProps> = ({
    mode,
    pieces = [],
    outfits = [],
    piecesByIdForOutfits,
    onViewPiece,
    onEditPiece,
    onRemovePiece,
    onViewOutfit,
    onEditOutfit,
    onRemoveOutfit,
    onClickViewAll,
    onAddPiece,
    onAddOutfit,
    isLoadingPieces = false,
    isLoadingOutfits = false,
    isLoadingRecentItems = false,
}) => {
    const swiperRef = useRef<any>(null);

    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(false);

    const { title, showViewAll, viewAllHref } = useMemo(() => {
        if (mode === "recent-adds") {
            return {
                title: "Recent Adds",
                showViewAll: false,
                viewAllHref: "",
            };
        }
        if (mode === "outfits") {
            return {
                title: "Outfits",
                showViewAll: true,
                viewAllHref: "/locker/outfits",
            };
        }
        return {
            title: "Pieces",
            showViewAll: true,
            viewAllHref: "/locker/pieces",
        };
    }, [mode]);

    // ---- data prep ----

    const recentMixed: MixedItem[] = useMemo(() => {
        if (mode !== "recent-adds") return [];

        const raw: MixedItem[] = [
            ...pieces.map((p) => ({ kind: "piece", piece: p } as const)),
            ...outfits.map((o) => ({ kind: "outfit", outfit: o } as const)),
        ];

        raw.sort((a, b) => {
            const aDate =
                a.kind === "piece"
                    ? toTimestamp((a.piece as any).created_date)
                    : toTimestamp((a.outfit as any).created_date);
            const bDate =
                b.kind === "piece"
                    ? toTimestamp((b.piece as any).created_date)
                    : toTimestamp((b.outfit as any).created_date);
            return bDate - aDate;
        });

        return raw.slice(0, 12);
    }, [mode, pieces, outfits]);

    const recentOutfits = useMemo(() => {
        if (mode !== "outfits") return [];
        const copy = [...outfits];
        copy.sort(
            (a, b) =>
                toTimestamp((b as any).created_date) -
                toTimestamp((a as any).created_date)
        );
        return copy.slice(0, 12);
    }, [mode, outfits]);

    const recentPieces = useMemo(() => {
        if (mode !== "pieces") return [];
        const copy = [...pieces];
        copy.sort(
            (a, b) =>
                toTimestamp((b as any).created_date) -
                toTimestamp((a as any).created_date)
        );
        return copy.slice(0, 12);
    }, [mode, pieces]);

    // ---- swiper nav helpers ----

    const updateNavState = (swiper: any) => {
        if (!swiper) return;
        setCanPrev(!swiper.isBeginning);
        setCanNext(!swiper.isEnd);
    };

    const handlePrev = () => {
        const swiper = swiperRef.current;
        if (swiper && swiper.slidePrev && canPrev) {
            swiper.slidePrev();
        }
    };

    const handleNext = () => {
        const swiper = swiperRef.current;
        if (swiper && swiper.slideNext && canNext) {
            swiper.slideNext();
        }
    };

    // keep nav state in sync when data changes
    useEffect(() => {
        if (swiperRef.current) {
            updateNavState(swiperRef.current);
        }
    }, [recentMixed.length, recentOutfits.length]);

    const renderHeader = () => {
        // add button config
        let showAddButton = false;
        let addLabel = "";
        let addHandler: (() => void) | undefined = undefined;

        if (mode === "outfits") {
            showAddButton = true;
            addLabel = "Add Outfit";
            addHandler = onAddOutfit;
        } else if (mode === "pieces") {
            showAddButton = true;
            addLabel = "Add Piece";
            addHandler = onAddPiece;
        }

        return (
            <div className="item-card-carousel-header">
                <div className="item-card-carousel-header-left">
                    <h2 className="carousel-title bold-text">{title}</h2>
                    {showViewAll && viewAllHref && (
                        <Link
                            to={viewAllHref}
                            className="carousel-view-all"
                            onClick={onClickViewAll}
                        >
                            <p className="caption-copy hyperlink-text">
                                View All
                            </p>
                        </Link>
                    )}
                </div>

                <div className="item-card-carousel-actions">
                    {mode !== "pieces" && (
                        <div className="item-card-carousel-controls">
                            <button
                                type="button"
                                className={
                                    "carousel-arrow-btn prev" +
                                    (!canPrev ? " disabled" : "")
                                }
                                onClick={handlePrev}
                                aria-label="Previous"
                                disabled={!canPrev}
                            >
                                <img
                                    className="prev-arrow-icon"
                                    src={nextArrowIcon}
                                    alt="Previous Arrow Icon"
                                />
                            </button>
                            <button
                                type="button"
                                className={
                                    "carousel-arrow-btn next" +
                                    (!canNext ? " disabled" : "")
                                }
                                onClick={handleNext}
                                aria-label="Next"
                                disabled={!canNext}
                            >
                                <img
                                    className="next-arrow-icon"
                                    src={nextArrowIcon}
                                    alt="Next Arrow Icon"
                                />
                            </button>
                        </div>
                    )}
                    {showAddButton && (
                        <button
                            type="button"
                            className={
                                    "add-button button" +
                                    (mode !== "pieces" ? " desktop-only" : "")
                                }
                            onClick={() => addHandler && addHandler()}
                            disabled={!addHandler}
                        >
                            <p className="caption-copy bold-text">
                                {addLabel}
                            </p>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderFooter = () => {
        // add button config
        let showAddButton = false;
        let addLabel = "";
        let addHandler: (() => void) | undefined = undefined;

        if (mode === "outfits") {
            showAddButton = true;
            addLabel = "Add Outfit";
            addHandler = onAddOutfit;

            return (
                <div className="item-card-carousel-footer mobile-only">
                    {showAddButton && (
                        <button
                            type="button"
                            className="add-button button"
                            onClick={() => addHandler && addHandler()}
                            disabled={!addHandler}
                        >
                            <p className="caption-copy bold-text">
                                {addLabel}
                            </p>
                        </button>
                    )}
                </div>
            );
        }
    };

    // ---- pieces-only grid (no Swiper) ----
    if (mode === "pieces") {
        return (
            <section className="item-card-carousel">
                {renderHeader()}
                <div className="item-card-carousel-grid pieces-grid">
                    {isLoadingPieces && recentPieces.length === 0 ? (
                        <p className="caption-copy">Loading pieces...</p>
                    ) : recentPieces.length === 0 ? (
                        <p className="caption-copy">No pieces yet.</p>
                    ) : (
                        recentPieces.map((piece) => (
                            <ItemCard
                                key={(piece as any)._id ?? (piece as any).id}
                                mode="pieces"
                                piece={piece}
                                onViewPiece={onViewPiece}
                                onEditPiece={onEditPiece}
                                onRemovedPiece={onRemovePiece}
                            />
                        ))
                    )}
                </div>
            </section>
        );
    }

    // ---- swiper modes (recent-adds / outfits) ----

    const renderSwiperContent = () => {
        if (mode === "outfits") {
            if (isLoadingOutfits && recentOutfits.length === 0) {
                return (
                    <p className="caption-copy carousel-empty">
                        Loading outfits...
                    </p>
                );
            }

            if (!recentOutfits.length) {
                return (
                    <p className="caption-copy carousel-empty">
                        No outfits yet.
                    </p>
                );
            }

            return recentOutfits.map((outfit) => (
                <SwiperSlide
                    key={(outfit as any)._id ?? (outfit as any).id}
                    className="item-card-carousel-slide"
                >
                    <ItemCard
                        mode="outfits"
                        outfit={outfit}
                        piecesByIdForOutfits={piecesByIdForOutfits}
                        onViewOutfit={onViewOutfit}
                        onEditOutfit={onEditOutfit}
                        onRemovedOutfit={onRemoveOutfit}
                    />
                </SwiperSlide>
            ));
        }

        // recent-adds: mix
        if (isLoadingRecentItems && recentMixed.length === 0) {
            return (
                <p className="caption-copy carousel-empty">
                    Loading items...
                </p>
            );
        }

        if (!recentMixed.length) {
            return (
                <p className="caption-copy carousel-empty">
                    No recent items yet.
                </p>
            );
        }

        return recentMixed.map((item, index) => {
            if (item.kind === "piece") {
                const piece = item.piece;
                return (
                    <SwiperSlide
                        key={
                            (piece as any)._id ??
                            (piece as any).id ??
                            `piece-${index}`
                        }
                        className="item-card-carousel-slide"
                    >
                        <ItemCard
                            mode="pieces"
                            piece={piece}
                            onViewPiece={onViewPiece}
                            onEditPiece={onEditPiece}
                            onRemovedPiece={onRemovePiece}
                        />
                    </SwiperSlide>
                );
            }

            const outfit = item.outfit;
            return (
                <SwiperSlide
                    key={
                        (outfit as any)._id ??
                        (outfit as any).id ??
                        `outfit-${index}`
                    }
                    className="item-card-carousel-slide"
                >
                    <ItemCard
                        mode="outfits"
                        outfit={outfit}
                        piecesByIdForOutfits={piecesByIdForOutfits}
                        onViewOutfit={onViewOutfit}
                        onEditOutfit={onEditOutfit}
                        onRemovedOutfit={onRemoveOutfit}
                    />
                </SwiperSlide>
            );
        });
    };

    return (
        <section className="item-card-carousel">
            {renderHeader()}
            <div className="item-card-carousel-swiper-wrapper">
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
                    modules={[Mousewheel]}
                    mousewheel={{
                        forceToAxis: true,
                        releaseOnEdges: true,
                        sensitivity: 0.7,
                    }}
                    centeredSlides={false}
                    grabCursor={true}
                    allowTouchMove={true}
                    className="item-card-carousel-swiper"
                >
                    {renderSwiperContent()}
                </Swiper>
            </div>
            {renderFooter()}
        </section>
    );
};

export default ItemCardCarousel;
