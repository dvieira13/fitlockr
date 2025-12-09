import { useState, useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/editOutfitModal.css";

import { useModalBehavior } from "../../utils/useModalBehavior";
import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";

import closeicon from "../../assets/icons/close_icon.svg";
import addIconWhite from "../../assets/icons/add_white_icon.svg";
import deleteIconWhite from "../../assets/icons/delete_white_icon.svg";
import searchIcon from "../../assets/icons/search_icon.svg";
import upArrowIcon from "../../assets/icons/arrow_up_icon.svg"; // 🔹 for piece-picker sort dropdown

import type { PieceAPI, OutfitAPI } from "../../types/types.api";
import type { PieceType, ItemTags } from "../../types/types";

type EditOutfitMode = "add-outfit" | "edit-outfit";

interface TagOption {
    key: string;
    label: string;
}

type TagGroups = Record<string, TagOption[]>;
type SelectedTagsByGroup = Record<string, string[]>;

// slots are 1 per piece type
type OutfitSlotType = PieceType; // "Headwear" | "Outerwear" | "Top" | "Bottom" | "Footwear"
type OutfitSlots = Record<OutfitSlotType, PieceAPI | null>;

type SortOrder = "newest" | "oldest" | "az" | "za";

interface EditOutfitModalProps {
    onClose: () => void;
    mode: EditOutfitMode;
    outfitId?: string;
    initialName?: string | null;
    initialTags?: ItemTags | null;
    initialPieces?: PieceAPI[]; // outfit.pieces (populated)
    onOutfitCreated?: (outfit: OutfitAPI) => void;
    onOutfitUpdated?: (outfit: OutfitAPI) => void;
}

const ALL_SLOT_TYPES: OutfitSlotType[] = [
    "Headwear",
    "Top",
    "Outerwear",
    "Bottom",
    "Footwear",
];

// layout: 3 rows
const SLOT_ROWS: OutfitSlotType[][] = [
    ["Headwear"],
    ["Top", "Outerwear"],
    ["Bottom", "Footwear"],
];

const EditOutfitModal: React.FC<EditOutfitModalProps> = ({
    onClose,
    mode,
    outfitId,
    initialName,
    initialTags,
    initialPieces,
    onOutfitCreated,
    onOutfitUpdated,
}) => {
    const { handleOverlayClick } = useModalBehavior(onClose);
    const { user, refreshUser } = useUser();

    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 🔹 Dynamic tag metadata from backend
    const [tagGroups, setTagGroups] = useState<TagGroups>({});
    const [selectedTagsByGroup, setSelectedTagsByGroup] =
        useState<SelectedTagsByGroup>({});

    // user pieces (for piece picker) – already only pulling from this user
    const [userPieces, setUserPieces] = useState<PieceAPI[]>([]);

    // outfit slots
    const [slots, setSlots] = useState<OutfitSlots>({
        Headwear: null,
        Top: null,
        Outerwear: null,
        Bottom: null,
        Footwear: null,
    });

    // piece picker state
    const [activeSlotType, setActiveSlotType] =
        useState<OutfitSlotType | null>(null);
    const [pieceSearchTerm, setPieceSearchTerm] = useState("");
    const [pieceSortOrder, setPieceSortOrder] =
        useState<SortOrder>("newest");

    // piece-picker sort dropdown state (ListPageActions-style)
    const [isPieceSortOpen, setIsPieceSortOpen] = useState(false);
    const pieceSortDropdownSwiperRef = useRef<any>(null);
    const pieceSortDropdownContainerRef = useRef<HTMLDivElement | null>(null);

    // main vertical swiper (for main layout only, not piece-picker grid)
    const swiperRef = useRef<any>(null);

    // 🔹 Refs for height locking on the modal
    const modalRef = useRef<HTMLDivElement | null>(null);          // .edit-outfit-modal
    const modalHeaderRef = useRef<HTMLDivElement | null>(null);    // .modal-header
    const defaultViewRef = useRef<HTMLDivElement | null>(null);    // .edit-outfit-main

    const piecePickerSwiperRef = useRef<any>(null);

    const isPiecePickerOpen = !!activeSlotType;

    // ─────────────────────────────────────────
    // Hydrate initial values
    // ─────────────────────────────────────────
    useEffect(() => {
        if (initialName) {
            setName(initialName);
        }

        if (initialTags) {
            const nextSelected: SelectedTagsByGroup = {};

            Object.entries(initialTags as any).forEach(
                ([groupKey, flags]) => {
                    if (!flags) return;
                    const enabledKeys = Object.entries(
                        flags as Record<string, boolean>
                    )
                        .filter(([, value]) => value)
                        .map(([key]) => key);
                    nextSelected[groupKey] = enabledKeys;
                }
            );

            setSelectedTagsByGroup((prev) => ({
                ...prev,
                ...nextSelected,
            }));
        }

        if (initialPieces && initialPieces.length) {
            setSlots((prev) => {
                const next: OutfitSlots = { ...prev };
                initialPieces.forEach((piece) => {
                    const type = piece.type as OutfitSlotType;
                    if (ALL_SLOT_TYPES.includes(type)) {
                        next[type] = piece;
                    }
                });
                return next;
            });
        }
    }, [initialName, initialTags, initialPieces]);

    // ─────────────────────────────────────────
    // Fetch tag metadata + user pieces
    // ─────────────────────────────────────────
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await apiClient.getPieceTags();
                const tagsFromBackend = (res as any).tags || {};
                setTagGroups(tagsFromBackend);

                // Ensure we have an array for each group
                setSelectedTagsByGroup((prev) => {
                    const next: SelectedTagsByGroup = { ...prev };
                    Object.keys(tagsFromBackend).forEach((groupKey) => {
                        if (!next[groupKey]) next[groupKey] = [];
                    });
                    return next;
                });
            } catch (err) {
                console.error("Failed to load piece tags", err);
            }
        };

        fetchTags();
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        const fetchPieces = async () => {
            try {
                // ✅ Use the same endpoint you use on Pieces page
                const res = await apiClient.getUserPieces(user.id);
                const allPieces: PieceAPI[] = res.pieces || [];

                // ✅ No filtering by user.pieces — API already returns this user's pieces
                setUserPieces(allPieces);
            } catch (err) {
                console.error(
                    "Failed to fetch user pieces for outfit modal",
                    err
                );
            }
        };

        fetchPieces();
    }, [user?.id]);


    useEffect(() => {
        const swiper = piecePickerSwiperRef.current;
        if (!swiper || swiper.destroyed) return;

        requestAnimationFrame(() => {
            const s = piecePickerSwiperRef.current;
            if (!s || s.destroyed) return;
            s.update?.();
            s.scrollbar?.updateSize?.();
        });
    }, [pieceSearchTerm, pieceSortOrder, activeSlotType, userPieces.length]);

    // ─────────────────────────────────────────
    // Derived stuff
    // ─────────────────────────────────────────
    const headerLabel =
        mode === "add-outfit" ? "Add a New Outfit" : "Edit Outfit";

    const submitLabel =
        mode === "add-outfit" ? "Create Outfit" : "Update Outfit";

    const hasAnyPiecesSelected = ALL_SLOT_TYPES.some((t) => !!slots[t]);

    const hasAnyTags = Object.values(selectedTagsByGroup).some(
        (arr) => arr && arr.length > 0
    );

    const updateModalSwiper = () => {
        const swiper = swiperRef.current;
        if (!swiper || swiper.destroyed) return;

        requestAnimationFrame(() => {
            const s = swiperRef.current;
            if (!s || s.destroyed) return;
            s.update?.();
            s.updateAutoHeight?.();
            s.scrollbar?.updateSize?.();
        });
    };

    // Keep main swiper in sync when layout changes (but only when not in picker)
    useEffect(() => {
        if (!isPiecePickerOpen) {
            updateModalSwiper();
        }
    }, [
        name,
        selectedTagsByGroup,
        slots,
        activeSlotType,
        pieceSearchTerm,
        pieceSortOrder,
        isPiecePickerOpen,
    ]);

    // ─────────────────────────────────────────
    // Lock edit-outfit-modal height to:
    //  header height + natural height of default main view
    //  (never measured from the piece-picker view)
    // ─────────────────────────────────────────
    useEffect(() => {
        const lockHeightToDefaultView = () => {
            if (!modalRef.current || !modalHeaderRef.current || !defaultViewRef.current) return;
            if (isPiecePickerOpen) return; // don't change while picker is open

            // Reset to natural so measurement is correct
            modalRef.current.style.height = "auto";

            const headerRect = modalHeaderRef.current.getBoundingClientRect();
            const mainRect = defaultViewRef.current.getBoundingClientRect();

            const totalHeight = headerRect.height + mainRect.height + 30;

            // Apply explicit height so it stays fixed when picker opens
            modalRef.current.style.height = `${totalHeight}px`;
        };

        lockHeightToDefaultView();

        const handleResize = () => {
            if (isPiecePickerOpen) return;
            lockHeightToDefaultView();
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [isPiecePickerOpen]);

    // ─────────────────────────────────────────
    // Dynamic tags
    // ─────────────────────────────────────────
    const toggleTag = (groupKey: string, tagKey: string) => {
        setSelectedTagsByGroup((prev) => {
            const existing = prev[groupKey] || [];
            const isSelected = existing.includes(tagKey);
            return {
                ...prev,
                [groupKey]: isSelected
                    ? existing.filter((k) => k !== tagKey)
                    : [...existing, tagKey],
            };
        });
    };

    const buildTagsPayload = (): ItemTags => {
        const result: any = {};

        Object.entries(tagGroups).forEach(([groupKey, options]) => {
            const selected = selectedTagsByGroup[groupKey] || [];
            const flags: Record<string, boolean> = {};
            options.forEach((opt) => {
                flags[opt.key] = selected.includes(opt.key);
            });
            result[groupKey] = flags;
        });

        return result as ItemTags;
    };

    // ─────────────────────────────────────────
    // Validation + submit
    // ─────────────────────────────────────────
    const validateForm = () => {
        // name is optional for "add-outfit"; still require pieces
        if (!hasAnyPiecesSelected) {
            const swiper = swiperRef.current;
            setError("Add at least one piece to this outfit.");
            requestAnimationFrame(() => {
                const s = swiperRef.current;
                if (!s || s.destroyed) return;
                s.update?.();
                s.updateAutoHeight?.();
                s.scrollbar?.updateSize?.();
            });
            return false;
        }
        // If editing, keep name required (you can tweak if you want same auto-name behavior here)
        if (mode === "edit-outfit" && !name.trim()) {
            setError("Name is required.");
            requestAnimationFrame(() => {
                const s = swiperRef.current;
                if (!s || s.destroyed) return;
                s.update?.();
                s.updateAutoHeight?.();
                s.scrollbar?.updateSize?.();
            });
            return false;
        }
        setError(null);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("You must be logged in to save an outfit.");
            return;
        }

        if (!validateForm()) return;

        setIsSubmitting(true);

        const tagsPayload = buildTagsPayload();
        const pieceIds = ALL_SLOT_TYPES
            .map((t) => slots[t]?._id)
            .filter(Boolean) as string[];

        // 🔹 Auto-name logic for creation (always using latest count from backend)
        const trimmedName = name.trim();

        let outfitCount = 0;
        if (mode === "add-outfit") {
            try {
                const res = await apiClient.getUserOutfits(user.id);
                const outfitsFromApi: OutfitAPI[] =
                    (res as any).outfits ?? res.outfits ?? [];
                outfitCount = Array.isArray(outfitsFromApi)
                    ? outfitsFromApi.length
                    : 0;
            } catch (fetchErr) {
                console.error(
                    "Failed to fetch user outfits count for auto-name",
                    fetchErr
                );
                // Fallback to user.outfits if available
                outfitCount =
                    user && Array.isArray((user as any).outfits)
                        ? (user as any).outfits.length
                        : 0;
            }
        }

        const autoName = `Outfit ${outfitCount + 1}`;

        const finalName =
            mode === "add-outfit" && !trimmedName
                ? autoName
                : trimmedName || autoName;

        try {
            if (mode === "add-outfit") {
                const payload = {
                    name: finalName,
                    pieces: pieceIds,
                    tags: tagsPayload,
                    created_by_name: user.name,
                    created_by_username: user.username,
                    created_by_id: user.id,
                };

                const createRes: any = await apiClient.createOutfit(payload);
                const createdOutfit: OutfitAPI = createRes.outfit ?? createRes;

                const outfitIdToUse =
                    (createdOutfit as any)._id ?? (createdOutfit as any).id;
                if (outfitIdToUse) {
                    await apiClient.addOutfitToUser(user.id, outfitIdToUse);
                    // 🔹 keep user context in sync for future auto-names
                    await refreshUser();
                }

                onOutfitCreated?.(createdOutfit);
                onClose();
            } else {
                if (!outfitId) {
                    setError("Missing outfit ID to update.");
                    setIsSubmitting(false);
                    return;
                }

                const payload = {
                    id: outfitId,
                    name: finalName,
                    pieces: pieceIds,
                    tags: tagsPayload,
                };

                const updateRes: any = await apiClient.updateOutfit(payload);
                const updatedOutfit: OutfitAPI = updateRes.outfit ?? updateRes;

                await refreshUser();
                onOutfitUpdated?.(updatedOutfit);
                onClose();
            }
        } catch (err) {
            console.error("Error saving outfit", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    // ─────────────────────────────────────────
    // Outfit slots
    // ─────────────────────────────────────────
    const handleSlotClick = (slotType: OutfitSlotType) => {
        setActiveSlotType(slotType);
        setPieceSearchTerm("");
        setPieceSortOrder("newest");
    };

    const handleClearSlot = (slotType: OutfitSlotType) => {
        setSlots((prev) => ({
            ...prev,
            [slotType]: null,
        }));
    };

    const handleRandomizeAll = () => {
        setSlots((prev) => {
            const next: OutfitSlots = { ...prev };
            ALL_SLOT_TYPES.forEach((slotType) => {
                const piecesOfType = userPieces.filter(
                    (p) => p.type === slotType
                );
                if (piecesOfType.length > 0) {
                    const idx = Math.floor(
                        Math.random() * piecesOfType.length
                    );
                    next[slotType] = piecesOfType[idx];
                } else {
                    next[slotType] = null;
                }
            });
            return next;
        });
    };

    // ─────────────────────────────────────────
    // Piece picker (overlay view inside modal)
    // ─────────────────────────────────────────
    const piecesForActiveSlot = (() => {
        if (!activeSlotType) return [];
        let list = userPieces.filter((p) => p.type === activeSlotType);

        if (pieceSearchTerm.trim()) {
            const q = pieceSearchTerm.toLowerCase();
            list = list.filter((p) =>
                p.name.toLowerCase().includes(q)
            );
        }

        list = list.slice().sort((a, b) => {
            switch (pieceSortOrder) {
                case "newest":
                    return (
                        new Date(b.created_date).getTime() -
                        new Date(a.created_date).getTime()
                    );
                case "oldest":
                    return (
                        new Date(a.created_date).getTime() -
                        new Date(b.created_date).getTime()
                    );
                case "az":
                    return a.name
                        .toLowerCase()
                        .localeCompare(b.name.toLowerCase(), undefined, {
                            sensitivity: "base",
                        });
                case "za":
                    return b.name
                        .toLowerCase()
                        .localeCompare(a.name.toLowerCase(), undefined, {
                            sensitivity: "base",
                        });
                default:
                    return 0;
            }
        });

        return list;
    })();

    const handleAddPieceToSlot = (piece: PieceAPI) => {
        if (!activeSlotType) return;
        setSlots((prev) => ({
            ...prev,
            [activeSlotType]: piece,
        }));
        setActiveSlotType(null);
        setIsPieceSortOpen(false);
    };

    const handleClosePiecePicker = () => {
        setActiveSlotType(null);
        setIsPieceSortOpen(false);
    };

    // 🔹 Dynamic slot label based on PieceType
    const renderSlotLabel = (slotType: OutfitSlotType) =>
        slotType.toLowerCase();

    const renderSlot = (slotType: OutfitSlotType) => {
        const piece = slots[slotType];
        const label = renderSlotLabel(slotType);

        return (
            <div className="outfit-slot-wrapper" key={slotType}>
                <p className="caption-copy outfit-slot-label">{label}</p>
                <div
                    className={
                        "outfit-slot shadow" +
                        (piece ? " outfit-slot-filled" : "")
                    }
                    onClick={() => handleSlotClick(slotType)}
                >
                    {piece ? (
                        <>
                            <img
                                className="outfit-slot-img"
                                src={piece.primary_img}
                                alt={piece.name}
                            />
                            <button
                                type="button"
                                className="caption-copy outfit-slot-clear-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearSlot(slotType);
                                }}
                            >
                                <img
                                    className="delete-icon"
                                    src={deleteIconWhite}
                                    alt="Delete Icon"
                                />
                            </button>
                        </>
                    ) : (
                        <div className="outfit-slot-empty">
                            <img
                                className="add-icon"
                                src={addIconWhite}
                                alt="Add Icon White"
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────
    // Piece-picker sort dropdown (ListPageActions-style)
    // ─────────────────────────────────────────
    const pieceSortLabelMap: Record<SortOrder, string> = {
        newest: "Newest to Oldest",
        oldest: "Oldest to Newest",
        az: "A - Z",
        za: "Z - A",
    };

    const pieceSortingLabel = pieceSortLabelMap[pieceSortOrder];

    const resetPieceSortDropdownSwiper = () => {
        const swiper = pieceSortDropdownSwiperRef.current;
        if (!swiper || swiper.destroyed) return;
        swiper.slideTo?.(0, 0, 0);
        swiper.update?.();
        swiper.scrollbar?.updateSize?.();
    };

    const updatePieceSortDropdownSwiper = () => {
        const swiper = pieceSortDropdownSwiperRef.current;
        if (!swiper || swiper.destroyed) return;
        swiper.update?.();
        swiper.scrollbar?.updateSize?.();
    };

    const togglePieceSortDropdown = () => {
        setIsPieceSortOpen((prev) => {
            const next = !prev;
            if (next) {
                setTimeout(() => {
                    updatePieceSortDropdownSwiper();
                }, 0);
            } else {
                resetPieceSortDropdownSwiper();
            }
            return next;
        });
    };

    const handleSelectPieceSort = (option: SortOrder) => {
        setPieceSortOrder(option);
        setIsPieceSortOpen(false);
        resetPieceSortDropdownSwiper();
    };

    const renderPieceSortOptions = () => {
        const order: SortOrder[] = ["newest", "oldest", "az", "za"];
        return order.map((opt, index) => {
            const isActive = pieceSortOrder === opt;
            const label = pieceSortLabelMap[opt];
            return (
                <div key={opt}>
                    <div
                        className={
                            "dropdown-option" +
                            (isActive ? " active-dropdown-option" : "")
                        }
                        onClick={() => handleSelectPieceSort(opt)}
                    >
                        <p className="caption-copy">{label}</p>
                    </div>
                    {index < order.length - 1 && (
                        <div className="dropdown-separator-line"></div>
                    )}
                </div>
            );
        });
    };

    const renderPieceSortDropdownBottomSwiperSingle = () => (
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
                    pieceSortDropdownSwiperRef.current = swiper;
                    swiper.update?.();
                    swiper.scrollbar?.updateSize?.();
                }}
            >
                <SwiperSlide>{renderPieceSortOptions()}</SwiperSlide>
            </Swiper>
        </div>
    );

    // close piece sort dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const container = pieceSortDropdownContainerRef.current;
            if (!container) return;
            if (container.contains(event.target as Node)) return;

            if (isPieceSortOpen) {
                setIsPieceSortOpen(false);
                resetPieceSortDropdownSwiper();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isPieceSortOpen]);

    // ─────────────────────────────────────────
    // Piece picker view – only grid in Swiper
    // ─────────────────────────────────────────
    const renderPiecePickerView = () => {
        if (!activeSlotType) return null;

        const headerSlotLabel = renderSlotLabel(activeSlotType);
        const capitalized =
            headerSlotLabel.charAt(0).toUpperCase() +
            headerSlotLabel.slice(1);

        // "Pick a" vs "Pick an" based on vowel
        const startsWithVowel = /^[aeiou]/i.test(capitalized);
        const articlePrefix = startsWithVowel ? "Pick an" : "Pick a";

        return (
            <div className="piece-picker-container">
                <div className="piece-picker-header">
                    <h4 className="bold-text">
                        {articlePrefix} {capitalized} piece
                    </h4>
                    <button
                        type="button"
                        className="piece-picker-back-button caption-copy hyperlink-text"
                        onClick={handleClosePiecePicker}
                    >
                        Back
                    </button>
                </div>

                <div className="piece-picker-controls">
                    <div className="piece-picker-search">
                        <input
                            type="text"
                            placeholder="Search by name"
                            className="piece-picker-search-input"
                            value={pieceSearchTerm}
                            onChange={(e) =>
                                setPieceSearchTerm(e.target.value)
                            }
                        />
                        <img
                            className="search-icon"
                            src={searchIcon}
                            alt="Search Icon"
                        />
                    </div>

                    <div
                        ref={pieceSortDropdownContainerRef}
                        className={
                            "dropdown sorting-dropdown piece-picker-sorting-dropdown" +
                            (isPieceSortOpen ? "" : " dropdown-closed")
                        }
                    >
                        <div
                            className="dropdown-top"
                            onClick={togglePieceSortDropdown}
                        >
                            <p className="caption-copy">
                                {pieceSortingLabel}
                            </p>
                            <img
                                className="up-arrow-icon"
                                src={upArrowIcon}
                                alt="Up Arrow Icon"
                            />
                        </div>
                        {renderPieceSortDropdownBottomSwiperSingle()}
                    </div>
                </div>
                <div className="piece-picker-swiper-wrapper">
                    {/* Only the grid is in a Swiper */}
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
                            sensitivity: 0.8,
                        }}
                        scrollbar={{
                            draggable: true,
                            hide: false,
                            snapOnRelease: false,
                        }}
                        className="piece-picker-grid-swiper"
                        nested={true}
                        onSwiper={(swiper) => {
                            piecePickerSwiperRef.current = swiper;
                            requestAnimationFrame(() => {
                                swiper.update?.();
                                swiper.scrollbar?.updateSize?.();
                            });
                        }}
                        observer={true}
                        observeParents={true}
                    >
                        <SwiperSlide>
                            <div className="piece-picker-grid">
                                {piecesForActiveSlot.map((piece) => {
                                    const isSelected =
                                        activeSlotType && slots[activeSlotType]?._id === piece._id;

                                    return (
                                        <div
                                            key={piece._id}
                                            className="piece-picker-card shadow"
                                            onClick={() => handleAddPieceToSlot(piece)}
                                        >
                                            <div className="piece-picker-card-img-wrapper">
                                                <img
                                                    className="piece-picker-card-img"
                                                    src={piece.primary_img}
                                                    alt={piece.name}
                                                />
                                            </div>

                                            <div className="piece-picker-card-info-wrapper">
                                                <p className="caption-copy piece-picker-card-name">
                                                    {piece.name}
                                                </p>

                                                <button
                                                    type="button"
                                                    className={
                                                        "button piece-picker-add-button" +
                                                        (isSelected ? " piece-added" : "")
                                                    }
                                                >
                                                    <p className="caption-copy bold-text">
                                                        {isSelected ? "Added" : "Add"}
                                                    </p>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}


                                {piecesForActiveSlot.length === 0 && (
                                    <p className="caption-copy no-pieces-text">
                                        You don't have any pieces of this type
                                        yet.
                                    </p>
                                )}
                            </div>
                        </SwiperSlide>
                    </Swiper>
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div
                className="modal-container edit-outfit-modal"
                onClick={(e) => e.stopPropagation()}
                ref={modalRef}
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

                <div className="modal-header" ref={modalHeaderRef}>
                    <h4 className="bold-text">{headerLabel}</h4>
                    <div className="separator-line"></div>
                </div>

                <div
                    className={
                        "modal-content" +
                        (isPiecePickerOpen ? " piece-picker-open" : "")
                    }
                >
                    <form className="edit-outfit-form" onSubmit={handleSubmit}>
                        {/* Main view uses modal-swiper; piece-picker view bypasses it */}
                        {!isPiecePickerOpen ? (
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
                                    sensitivity: 0.8,
                                }}
                                scrollbar={{
                                    draggable: true,
                                    hide: false,
                                    snapOnRelease: false,
                                }}
                                className="modal-swiper"
                                onSwiper={(swiper) => {
                                    swiperRef.current = swiper;
                                    requestAnimationFrame(() => {
                                        swiper.update?.();
                                        swiper.scrollbar?.updateSize?.();
                                    });
                                }}
                                observer={true}
                                observeParents={true}
                                allowTouchMove={false}
                                simulateTouch={false}
                            >
                                <SwiperSlide>
                                    <div
                                        className="edit-outfit-main"
                                        ref={defaultViewRef}
                                    >
                                        {/* left: outfit grid */}
                                        <div className="outfit-slots-container">
                                            <div className="outfit-slots-wrapper">
                                                {SLOT_ROWS.map(
                                                    (row, idx) => (
                                                        <div
                                                            className="outfit-slots-row"
                                                            key={idx}
                                                        >
                                                            {row.map(
                                                                renderSlot
                                                            )}
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="button randomize-outfit-button"
                                                onClick={handleRandomizeAll}
                                                disabled={!userPieces.length}
                                            >
                                                <p className="caption-copy bold-text">
                                                    Randomize All
                                                </p>
                                            </button>
                                        </div>

                                        {/* vertical separator */}
                                        <div className="vertical-separator-line"></div>

                                        {/* right: name + tags + submit */}
                                        <div className="outfit-details-container">
                                            <label
                                                className="input-label caption-copy bold-text"
                                                htmlFor="outfit-name"
                                            >
                                                Name:
                                                <input
                                                    id="outfit-name"
                                                    name="outfit-name"
                                                    type="text"
                                                    className="outfit-name-input"
                                                    value={name}
                                                    onChange={(e) =>
                                                        setName(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <div className="outfit-tags-section">
                                                <p className="caption-copy bold-text">
                                                    Tags:
                                                </p>

                                                <div className="tags-container-wrapper">
                                                    {Object.entries(
                                                        tagGroups
                                                    ).map(
                                                        ([
                                                            groupKey,
                                                            options,
                                                        ]) => {
                                                            const selected =
                                                                selectedTagsByGroup[
                                                                groupKey
                                                                ] || [];
                                                            return (
                                                                <div
                                                                    className="tags-container"
                                                                    key={
                                                                        groupKey
                                                                    }
                                                                >
                                                                    <p className="caption-copy label-copy">
                                                                        {
                                                                            groupKey
                                                                        }
                                                                    </p>
                                                                    <div className="tags-wrapper">
                                                                        {options.map(
                                                                            (
                                                                                tag
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        tag.key
                                                                                    }
                                                                                    className={
                                                                                        "tag-item" +
                                                                                        (selected.includes(
                                                                                            tag.key
                                                                                        )
                                                                                            ? " active-tag-item"
                                                                                            : "")
                                                                                    }
                                                                                    onClick={() =>
                                                                                        toggleTag(
                                                                                            groupKey,
                                                                                            tag.key
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <p className="caption-copy">
                                                                                        {
                                                                                            tag.label
                                                                                        }
                                                                                    </p>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                className={
                                                    "edit-outfit-form-submit-container" +
                                                    (error
                                                        ? " submit-container-error"
                                                        : "")
                                                }
                                            >
                                                <button
                                                    type="submit"
                                                    className="button update-outfit-button"
                                                    disabled={isSubmitting}
                                                >
                                                    <p className="caption-copy bold-text">
                                                        {isSubmitting
                                                            ? "Saving..."
                                                            : submitLabel}
                                                    </p>
                                                </button>

                                                {error && (
                                                    <p className="error-text caption-copy">
                                                        {error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            </Swiper>
                        ) : (
                            renderPiecePickerView()
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditOutfitModal;
