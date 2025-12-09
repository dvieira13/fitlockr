// src/components/listPageActions.tsx
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../styles/index.css";
import "../styles/components/listPageActions.css";

import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";

import upArrowIcon from "../assets/icons/arrow_up_icon.svg";

type ListPageMode = "pieces" | "outfits" | "shelves" | "shelf";

export type SortOption = "newest" | "oldest" | "az" | "za";

// 🔥 GENERIC FILTER TYPE
export type ItemFilter =
    | "all"
    | "owned"
    | "want"
    | "pieces"
    | "outfits";

interface ListPageActionsProps {
    onAddPiece?: () => void;
    onAddOutfit?: () => void;
    onAddShelf?: () => void;
    onAddShelfItem?: () => void;
    onEditShelf?: () => void;

    sortOption?: SortOption;
    onChangeSort?: (option: SortOption) => void;

    filter?: ItemFilter;
    onChangeFilter?: (value: ItemFilter) => void;
}

const ListPageActions: React.FC<ListPageActionsProps> = ({
    onAddPiece,
    onAddOutfit,
    onAddShelf,
    onAddShelfItem,
    onEditShelf,
    sortOption = "newest",
    onChangeSort,

    filter = "all",
    onChangeFilter,
}) => {
    const { pathname } = useLocation();

    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortingDropdownSwiperRef = useRef<any>(null);
    const sortingDropdownContainerRef = useRef<HTMLDivElement | null>(null);

    // Determine page mode
    const getModeFromPath = (path: string): ListPageMode => {
        if (path.includes("/pieces")) return "pieces";
        if (path.includes("/outfits")) return "outfits";
        if (path === "/locker/shelves") return "shelves";
        if (path.startsWith("/locker/shelves/")) return "shelf";
        return "pieces";
    };

    const mode = getModeFromPath(pathname);

    // Show filter only on pieces page and shelf page
    const showFilter = mode === "pieces" || mode === "shelf";

    // ---- FILTER SELECTOR ----
    const renderFilterSelector = () => {
        if (!showFilter) return null;

        return (
            <div className="ownership-selector">
                {/* ALL */}
                <div
                    className={
                        "ownership-option" +
                        (filter === "all" ? " active-ownership-option" : "")
                    }
                    onClick={() => onChangeFilter?.("all")}
                >
                    <p className="caption-copy">All</p>
                </div>

                {mode === "shelf" ? (
                    <>
                        {/* Shelf mode uses Pieces / Outfits */}
                        <div
                            className={
                                "ownership-option" +
                                (filter === "pieces"
                                    ? " active-ownership-option"
                                    : "")
                            }
                            onClick={() => onChangeFilter?.("pieces")}
                        >
                            <p className="caption-copy">Pieces</p>
                        </div>

                        <div
                            className={
                                "ownership-option" +
                                (filter === "outfits"
                                    ? " active-ownership-option"
                                    : "")
                            }
                            onClick={() => onChangeFilter?.("outfits")}
                        >
                            <p className="caption-copy">Outfits</p>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Pieces page uses Owned / Wants */}
                        <div
                            className={
                                "ownership-option" +
                                (filter === "owned"
                                    ? " active-ownership-option"
                                    : "")
                            }
                            onClick={() => onChangeFilter?.("owned")}
                        >
                            <p className="caption-copy">Owned</p>
                        </div>

                        <div
                            className={
                                "ownership-option" +
                                (filter === "want"
                                    ? " active-ownership-option"
                                    : "")
                            }
                            onClick={() => onChangeFilter?.("want")}
                        >
                            <p className="caption-copy">Wants</p>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ---- SORTING DROPDOWN ----

    const sortLabelMap: Record<SortOption, string> = {
        newest: "Newest to Oldest",
        oldest: "Oldest to Newest",
        az: "A - Z",
        za: "Z - A",
    };

    const sortOrder: SortOption[] = ["newest", "oldest", "az", "za"];
    const sortingLabel = sortLabelMap[sortOption];

    const resetDropdownSwiper = (ref: any) => {
        const swiper = ref?.current;
        if (!swiper || swiper.destroyed) return;
        swiper.slideTo?.(0, 0, 0);
        swiper.update?.();
        swiper.scrollbar?.updateSize?.();
    };

    const updateDropdownSwiper = (ref: any) => {
        const swiper = ref?.current;
        if (!swiper || swiper.destroyed) return;
        swiper.update?.();
        swiper.scrollbar?.updateSize?.();
    };

    const toggleSortDropdown = () => {
        setIsSortOpen((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(() => {
                    updateDropdownSwiper(sortingDropdownSwiperRef);
                }, 0);
            } else {
                resetDropdownSwiper(sortingDropdownSwiperRef);
            }
            return next;
        });
    };

    const handleSelectSort = (option: SortOption) => {
        onChangeSort?.(option);
        setIsSortOpen(false);
        resetDropdownSwiper(sortingDropdownSwiperRef);
    };

    const renderSortOptions = () => {
        return sortOrder.map((opt, index) => {
            const isActive = sortOption === opt;
            const label = sortLabelMap[opt];

            return (
                <div key={opt}>
                    <div
                        className={
                            "dropdown-option" +
                            (isActive ? " active-dropdown-option" : "")
                        }
                        onClick={() => handleSelectSort(opt)}
                    >
                        <p className="caption-copy">{label}</p>
                    </div>

                    {index < sortOrder.length - 1 && (
                        <div className="dropdown-separator-line"></div>
                    )}
                </div>
            );
        });
    };

    const renderDropdownBottomSwiperSingle = () => (
        <div className="dropdown-bottom">
            <Swiper
                direction="vertical"
                slidesPerView="auto"
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
                className="dropdown-bottom-swiper"
                nested={true}
                onSwiper={(swiper) => {
                    sortingDropdownSwiperRef.current = swiper;
                    swiper.update?.();
                    swiper.scrollbar?.updateSize?.();
                }}
            >
                <SwiperSlide>{renderSortOptions()}</SwiperSlide>
            </Swiper>
        </div>
    );

    // Close sorting dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const container = sortingDropdownContainerRef.current;
            if (!container) return;
            if (container.contains(event.target as Node)) return;

            if (isSortOpen) {
                setIsSortOpen(false);
                resetDropdownSwiper(sortingDropdownSwiperRef);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isSortOpen]);

    const primaryButtonLabel =
        mode === "pieces"
            ? "Add Piece"
            : mode === "outfits"
                ? "Add Outfit"
                : mode === "shelves"
                    ? "Add Shelf"
                    : "Add Items";

    const primaryClickHandler =
        mode === "pieces"
            ? onAddPiece
            : mode === "outfits"
                ? onAddOutfit
                : mode === "shelves"
                    ? onAddShelf
                    : onAddShelfItem;

    return (
        <div className="list-page-actions">
            <div className="list-page-filter-actions">
                {renderFilterSelector()}

                {/* SORTING DROPDOWN */}
                <div
                    ref={sortingDropdownContainerRef}
                    className={
                        "dropdown sorting-dropdown" +
                        (isSortOpen ? "" : " dropdown-closed")
                    }
                >
                    <div className="dropdown-top" onClick={toggleSortDropdown}>
                        <p className="caption-copy">{sortingLabel}</p>
                        <img
                            className="up-arrow-icon"
                            src={upArrowIcon}
                            alt="Up Arrow Icon"
                        />
                    </div>
                    {renderDropdownBottomSwiperSingle()}
                </div>
            </div>

            <button
                type="button"
                className="button add-piece-button"
                onClick={() => primaryClickHandler?.()}
                disabled={!primaryClickHandler}
            >
                <p className="body-copy bold-text">{primaryButtonLabel}</p>
            </button>
        </div>
    );
};

export default ListPageActions;
