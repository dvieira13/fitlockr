// src/components/modals/addShelfModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import { apiClient } from "../../apiClient";
import { useUser } from "../../context/userContext";
import type { PieceAPI, OutfitAPI } from "../../types/types.api";

import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";

import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/addShelfModal.css";

import closeicon from "../../assets/icons/close_icon.svg";
import searchIcon from "../../assets/icons/search_icon.svg";
import upArrowIcon from "../../assets/icons/arrow_up_icon.svg";

type ShelfItemType = "Piece" | "Outfit";
type Step = 1 | 2;
type SortOrder = "newest" | "oldest" | "az" | "za";

export type AddShelfModalMode = "create" | "update-items" | "edit";

interface ExistingShelfItem {
    item_id: string;
    item_type: ShelfItemType;
    item_added_date?: string;
}

interface AddShelfModalProps {
    onClose: () => void;

    /** create (default), update-items, or edit */
    mode?: AddShelfModalMode;

    /** required for update-items / edit */
    shelfId?: string;
    initialName?: string | null;
    initialItems?: ExistingShelfItem[] | null;

    /** Called when shelf name is changed in edit mode */
    onShelfRenamed?: (newName: string) => void;

    /** Called when shelf items change in update-items mode */
    onShelfItemsUpdated?: (items: ExistingShelfItem[]) => void;
}

interface ShelfPickerItem {
    id: string;
    itemType: ShelfItemType;
    createdDate: string;
    name: string;
    piece?: PieceAPI;
    outfit?: OutfitAPI;
}

const normalizeShelfItemType = (value: any): ShelfItemType | null => {
    if (!value) return null;
    const v = String(value).toLowerCase();
    if (v === "piece" || v === "pieces") return "Piece";
    if (v === "outfit" || v === "outfits") return "Outfit";
    return null;
};

const AddShelfModal: React.FC<AddShelfModalProps> = ({
    onClose,
    mode = "create",
    shelfId,
    initialName,
    initialItems,
    onShelfRenamed,
    onShelfItemsUpdated,
}) => {
    const { user, refreshUser } = useUser();
    const { handleOverlayClick } = useModalBehavior(onClose);

    const [step, setStep] = useState<Step>(mode === "create" ? 1 : 2);
    const [shelfName, setShelfName] = useState(initialName || "");
    const [error, setError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    // Step 2 item picker state
    const [pieces, setPieces] = useState<PieceAPI[]>([]);
    const [outfits, setOutfits] = useState<OutfitAPI[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [itemsError, setItemsError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");

    // sort dropdown state
    const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
    const [isPieceSortOpen, setIsPieceSortOpen] = useState(false);
    const pieceSortDropdownSwiperRef = useRef<any>(null);
    const pieceSortDropdownContainerRef = useRef<HTMLDivElement | null>(null);

    // vertical swiper for item picker grid
    const itemPickerSwiperRef = useRef<any>(null);

    // selected items (by key "Piece:<id>" / "Outfit:<id>")
    const [selectedItems, setSelectedItems] = useState<
        Record<string, boolean>
    >({});

    // map of existing items (for update modes) so we can keep item_added_date
    const [existingItemsByKey, setExistingItemsByKey] = useState<
        Record<string, ExistingShelfItem>
    >({});

    // Known shelf names (for duplicate validation)
    const [knownShelfNames, setKnownShelfNames] = useState<string[]>([]);

    useEffect(() => {
        if (!user) {
            setKnownShelfNames([]);
            return;
        }

        const shelves = (user as any).shelves || [];
        const fromUser: string[] = [];

        for (const s of shelves) {
            if (s && typeof s === "object" && "name" in s && (s as any).name) {
                const raw = String((s as any).name);
                const trimmed = raw.trim().toLowerCase();
                if (trimmed) fromUser.push(trimmed);
            }
        }

        setKnownShelfNames((prev) => {
            const set = new Set(prev);
            fromUser.forEach((n) => set.add(n));
            return Array.from(set);
        });
    }, [user]);

    const normalizedCurrentShelfName =
        initialName?.trim().toLowerCase() || null;

    const hasShelfNameConflict = (trimmedName: string) => {
        if (!trimmedName) return false;
        const lower = trimmedName.toLowerCase();

        // if editing, allow keeping the same name
        if (normalizedCurrentShelfName && lower === normalizedCurrentShelfName) {
            return false;
        }

        return knownShelfNames.includes(lower);
    };

    const makeKey = (itemType: ShelfItemType, id: string) =>
        `${itemType}:${id}`;

    // hydrate selected + existing items when editing/updating
    useEffect(() => {
        if (!initialItems || !initialItems.length) return;

        const selected: Record<string, boolean> = {};
        const existingByKey: Record<string, ExistingShelfItem> = {};

        initialItems.forEach((it: any) => {
            const normalizedType = normalizeShelfItemType(it.item_type);
            if (!normalizedType) return;

            const itemId =
                typeof it.item_id === "string"
                    ? it.item_id
                    : (it.item_id as any)?._id ??
                    (it.item_id as any)?.id;
            if (!itemId) return;

            const key = makeKey(normalizedType, itemId);

            selected[key] = true;
            existingByKey[key] = {
                item_id: itemId,
                item_type: normalizedType,
                item_added_date: it.item_added_date,
            };
        });

        setSelectedItems(selected);
        setExistingItemsByKey(existingByKey);
    }, [initialItems]);

    // Load user's pieces + outfits once (used for step 2)
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const loadItems = async () => {
            try {
                setIsLoadingItems(true);
                setItemsError(null);

                const [piecesRes, outfitsRes] = await Promise.all([
                    apiClient.getUserPieces(user.id),
                    apiClient.getUserOutfits(user.id),
                ]);

                if (!cancelled) {
                    setPieces(piecesRes.pieces as PieceAPI[]);
                    setOutfits(outfitsRes.outfits as OutfitAPI[]);
                }
            } catch (err) {
                console.error("Failed to load items for shelf picker", err);
                if (!cancelled) {
                    setItemsError("Failed to load your items.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingItems(false);
                }
            }
        };

        loadItems();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const piecesById = useMemo(() => {
        const map: Record<string, PieceAPI> = {};
        pieces.forEach((p) => {
            const id = (p as any)._id ?? (p as any).id;
            if (id) {
                map[id] = p;
            }
        });
        return map;
    }, [pieces]);

    const shelfPickerItems: ShelfPickerItem[] = useMemo(() => {
        const all: ShelfPickerItem[] = [];

        pieces.forEach((p) => {
            const id = (p as any)._id ?? (p as any).id;
            if (!id) return;

            all.push({
                id,
                itemType: "Piece",
                createdDate: (p as any).created_date ?? "",
                name: p.name,
                piece: p,
            });
        });

        outfits.forEach((o) => {
            const id = (o as any)._id ?? (o as any).id;
            if (!id) return;

            all.push({
                id,
                itemType: "Outfit",
                createdDate: (o as any).created_date ?? "",
                name: o.name,
                outfit: o,
            });
        });

        let filtered = all;

        const q = searchQuery.trim().toLowerCase();
        if (q) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(q)
            );
        }

        filtered = [...filtered].sort((a, b) => {
            switch (sortOrder) {
                case "newest":
                    return (
                        new Date(b.createdDate).getTime() -
                        new Date(a.createdDate).getTime()
                    );
                case "oldest":
                    return (
                        new Date(a.createdDate).getTime() -
                        new Date(b.createdDate).getTime()
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

        return filtered;
    }, [pieces, outfits, searchQuery, sortOrder]);

    const isItemSelected = (itemType: ShelfItemType, id: string) => {
        const key = makeKey(itemType, id);
        return !!selectedItems[key];
    };

    // ─────────────────────────────────────────
    // Validation + save / update
    // ─────────────────────────────────────────
    const validateShelfName = (trimmed: string, stayOnStep1 = true) => {
        if (!trimmed) {
            setError("Please enter a shelf name.");
            if (stayOnStep1) setStep(1);
            return false;
        }

        if (hasShelfNameConflict(trimmed)) {
            setError("A shelf with this name already exists.");
            if (stayOnStep1) setStep(1);
            return false;
        }

        return true;
    };

    const buildItemsPayload = (
        withItems: boolean,
        selectedOverride?: Record<string, boolean>
    ): ExistingShelfItem[] => {
        if (!withItems) return [];

        const source = selectedOverride ?? selectedItems;
        const keys = Object.keys(source).filter((k) => source[k]);

        return keys.map((key) => {
            const existing = existingItemsByKey[key];
            const [rawType, item_id] = key.split(":");

            const normalizedType =
                normalizeShelfItemType(rawType) ?? ("Piece" as ShelfItemType);

            if (existing && existing.item_added_date) {
                return {
                    item_id,
                    item_type: normalizedType,
                    item_added_date: existing.item_added_date,
                };
            }

            // new items -> let backend set item_added_date default
            return { item_id, item_type: normalizedType };
        });
    };

    const handleSaveShelf = async (withItems: boolean) => {
        if (!user) return;

        const trimmed = shelfName.trim();

        // in update-items mode we do not change the name
        if (mode !== "update-items") {
            const stayOnStep1 = step === 1;
            if (!validateShelfName(trimmed, stayOnStep1)) return;
        }

        // 🔹 In edit mode we are rename-only: do NOT send items.
        const shouldIncludeItems = mode !== "edit" && withItems;
        const itemsPayload = buildItemsPayload(shouldIncludeItems);

        try {
            setIsBusy(true);
            setError(null);

            if (mode === "create") {
                const res = await apiClient.createShelf({
                    name: trimmed,
                    items: itemsPayload,
                    created_by_name: user.name,
                    created_by_username: user.username,
                    created_by_id: user.id,
                });

                const { shelf } = res;

                // keep local list in sync so validation catches duplicates
                setKnownShelfNames((prev) => {
                    const lower = trimmed.toLowerCase();
                    if (prev.includes(lower)) return prev;
                    return [...prev, lower];
                });

                await apiClient.addShelfToUser(user.id, shelf._id);
                await refreshUser?.();
            } else {
                if (!shelfId) {
                    setError("Missing shelf id.");
                    return;
                }

                const updatePayload: any = {
                    id: shelfId,
                };

                if (mode === "edit") {
                    updatePayload.name = trimmed;
                    // rename only – no items field
                } else {
                    // generic update (e.g. create-with-items flow)
                    updatePayload.items = itemsPayload;
                }

                await apiClient.updateShelf(updatePayload);
                await refreshUser?.();

                if (mode === "edit") {
                    onShelfRenamed?.(trimmed);
                }
            }

            onClose();
        } catch (err) {
            console.error(
                mode === "create"
                    ? "Failed to create shelf"
                    : "Failed to update shelf",
                err
            );
            setError(
                mode === "create"
                    ? "Failed to create shelf. Please try again."
                    : "Failed to update shelf. Please try again."
            );
        } finally {
            setIsBusy(false);
        }
    };

    // 🔹 auto-save helper for update-items mode (called on each click)
    const saveItemsForUpdateMode = async (
        selectedOverride: Record<string, boolean>
    ) => {
        if (!user || !shelfId) return;

        const itemsPayload = buildItemsPayload(true, selectedOverride);

        try {
            setIsBusy(true);
            setError(null);

            await apiClient.updateShelf({
                id: shelfId,
                items: itemsPayload,
            });

            await refreshUser?.();

            // notify parent (shelf page) so it can update local shelf.items
            onShelfItemsUpdated?.(itemsPayload);
        } catch (err) {
            console.error("Failed to update shelf items", err);
            setError("Failed to update shelf items. Please try again.");
        } finally {
            setIsBusy(false);
        }
    };

    const handleSubmitStep1 = (e: React.FormEvent) => {
        e.preventDefault();
        // Step 1's green button: create shelf immediately (no items)
        handleSaveShelf(false);
    };

    const handleStartAddingClick = () => {
        const trimmed = shelfName.trim();
        if (!validateShelfName(trimmed, true)) return;

        setError(null);
        setStep(2);
    };

    const handleSaveShelfFromStep2 = () => {
        // all modes *except update-items* use this button to save with items
        handleSaveShelf(true);
    };

    // toggle selection (with auto-save when in update-items mode)
    const toggleItemSelected = (itemType: ShelfItemType, id: string) => {
        const key = makeKey(itemType, id);
        setSelectedItems((prev) => {
            const next = {
                ...prev,
                [key]: !prev[key],
            };

            // In update-items mode, clicking directly updates the shelf
            if (mode === "update-items") {
                void saveItemsForUpdateMode(next);
            }

            return next;
        });
    };

    // ─────────────────────────────────────────
    // Outfit image grid for outfits in shelf picker
    // ─────────────────────────────────────────
    const resolveOutfitPieces = (outfit: OutfitAPI): {
        headwear?: PieceAPI;
        top?: PieceAPI;
        outerwear?: PieceAPI;
        bottom?: PieceAPI;
        footwear?: PieceAPI;
    } => {
        const raw: any[] = ((outfit as any).pieces ?? []) as any[];

        const resolvedPieces: PieceAPI[] = raw
            .map((entry) => {
                if (entry && typeof entry === "object" && "primary_img" in entry) {
                    return entry as PieceAPI;
                }
                if (typeof entry === "string") {
                    return piecesById[entry] ?? null;
                }
                return null;
            })
            .filter((p): p is PieceAPI => !!p);

        const findByType = (type: string) =>
            resolvedPieces.find((p) => p.type === type);

        return {
            headwear: findByType("Headwear"),
            top: findByType("Top"),
            outerwear: findByType("Outerwear"),
            bottom: findByType("Bottom"),
            footwear: findByType("Footwear"),
        };
    };

    // 🔁 Load known shelf names from the shelves API, not from user.shelves
    useEffect(() => {
        if (!user?.id) {
            setKnownShelfNames([]);
            return;
        }

        let cancelled = false;

        const loadShelfNames = async () => {
            try {
                const res = await apiClient.getUserShelves(user.id);
                const shelves = ((res as any).shelves || []) as any[];

                const names: string[] = [];
                for (const s of shelves) {
                    if (s && typeof s === "object" && (s as any).name) {
                        const raw = String((s as any).name);
                        const trimmed = raw.trim().toLowerCase();
                        if (trimmed) names.push(trimmed);
                    }
                }

                if (!cancelled) {
                    // dedupe
                    const set = new Set(names);
                    setKnownShelfNames(Array.from(set));
                }
            } catch (err) {
                console.error("Failed to load shelf names for validation", err);
                if (!cancelled) {
                    // Don’t hard-fail; just clear list so user can still create shelves
                    setKnownShelfNames([]);
                }
            }
        };

        loadShelfNames();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);


    const renderOutfitImageGrid = (outfit: OutfitAPI) => {
        const { headwear, top, outerwear, bottom, footwear } =
            resolveOutfitPieces(outfit);

        const hasHeadwear = !!headwear;
        const hasUpper = !!top || !!outerwear;
        const hasLower = !!bottom || !!footwear;

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

        const containerClass = `item-picker-card-img-container outfits-mode ${layoutClass}`.trim();

        return (
            <div className={containerClass}>
                <div className="outfit-img-grid">
                    <div className="outfit-img-row outfit-row-headwear">
                        {headwear && (
                            <img
                                className="item-picker-card-img outfit-piece-img headwear-img"
                                src={headwear.primary_img}
                                alt={headwear.name}
                            />
                        )}
                    </div>

                    <div className="outfit-img-row outfit-row-upper">
                        {top && (
                            <img
                                className="item-picker-card-img outfit-piece-img top-img"
                                src={top.primary_img}
                                alt={top.name}
                            />
                        )}
                        {outerwear && (
                            <img
                                className="item-picker-card-img outfit-piece-img outerwear-img"
                                src={outerwear.primary_img}
                                alt={outerwear.name}
                            />
                        )}
                    </div>

                    <div className="outfit-img-row outfit-row-lower">
                        {bottom && (
                            <img
                                className="item-picker-card-img outfit-piece-img bottom-img"
                                src={bottom.primary_img}
                                alt={bottom.name}
                            />
                        )}
                        {footwear && (
                            <img
                                className="item-picker-card-img outfit-piece-img footwear-img"
                                src={footwear.primary_img}
                                alt={footwear.name}
                            />
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Sort dropdown
    const pieceSortLabelMap: Record<SortOrder, string> = {
        newest: "Newest to Oldest",
        oldest: "Oldest to Newest",
        az: "A - Z",
        za: "Z - A",
    };

    const pieceSortingLabel = pieceSortLabelMap[sortOrder];

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
        setSortOrder(option);
        setIsPieceSortOpen(false);
        resetPieceSortDropdownSwiper();
    };

    const renderPieceSortOptions = () => {
        const order: SortOrder[] = ["newest", "oldest", "az", "za"];
        return order.map((opt, index) => {
            const isActive = sortOrder === opt;
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

    // close sort dropdown on outside click
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

    // keep item-picker swiper in sync when cards change
    useEffect(() => {
        const swiper = itemPickerSwiperRef.current;
        if (!swiper || swiper.destroyed) return;

        requestAnimationFrame(() => {
            const s = itemPickerSwiperRef.current;
            if (!s || s.destroyed) return;
            s.update?.();
            s.scrollbar?.updateSize?.();
        });
    }, [searchQuery, sortOrder, shelfPickerItems.length, isLoadingItems]);

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    const headerTitle =
        mode === "create"
            ? "Add a New Shelf"
            : mode === "edit"
                ? "Rename Shelf"
                : "Update Shelf";

    const modalModeClass =
        mode === "update-items"
            ? " update-mode"
            : mode === "edit"
                ? " edit-mode"
                : "";

    const step2ButtonLabel =
        mode === "create"
            ? isBusy
                ? "Creating..."
                : "Create Shelf"
            : mode === "edit"
                ? isBusy
                    ? "Saving..."
                    : "Update Shelf Name"
                : isBusy
                    ? "Saving..."
                    : "Update Shelf";

    const shouldShowStep2SaveButton = mode !== "update-items";

    const isEditMode = mode === "edit";

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div
                className={
                    `modal-container add-shelf-modal` +
                    (step === 2 ? " add-shelf-container-step-2" : "") +
                    modalModeClass
                }
                onClick={(e) => e.stopPropagation()}
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

                {/* Header */}
                <div className="modal-header">
                    <h4 className="bold-text">{headerTitle}</h4>
                    <div className="separator-line"></div>
                </div>

                {/* STEP 1 – only for create mode */}
                {step === 1 && mode === "create" && (
                    <div className="modal-content add-shelf-step-1">
                        <p className="body-copy step-1-instruction">
                            Enter a name for your new shelf:
                        </p>

                        <form
                            className="shelf-name-form"
                            onSubmit={handleSubmitStep1}
                        >
                            <input
                                id="shelf-name"
                                name="shelf-name"
                                type="text"
                                placeholder="Shelf name"
                                className={
                                    "shelf-name-input" +
                                    (error ? " input-error" : "")
                                }
                                value={shelfName}
                                onChange={(e) => {
                                    setShelfName(e.target.value);
                                    if (error) setError(null);
                                }}
                                disabled={isBusy}
                            />

                            {error && (
                                <p className="error-text caption-copy">
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="button continue-button"
                                disabled={isBusy}
                            >
                                <p className="caption-copy bold-text">
                                    {isBusy ? "Creating..." : "Create Shelf"}
                                </p>
                            </button>
                        </form>

                        <p className="caption-copy modal-or-text">OR</p>

                        <button
                            type="button"
                            className="button start-adding-button"
                            onClick={handleStartAddingClick}
                            disabled={isBusy}
                        >
                            <p className="caption-copy bold-text">
                                Start Adding Items
                            </p>
                        </button>
                    </div>
                )}

                {/* STEP 2 – item picker / rename */}
                {step === 2 && (
                    <div className="modal-content add-shelf-step-2 item-picker-open">
                        <div className="item-picker-container">
                            <div className="item-picker-header">
                                {isEditMode ? (
                                    <div className="edit-shelf-name-input-wrapper">
                                        <input
                                            id="edit-shelf-name"
                                            name="edit-shelf-name"
                                            type="text"
                                            placeholder="Shelf name"
                                            className={
                                                "shelf-name-input edit-mode-input" +
                                                (error ? " input-error" : "")
                                            }
                                            value={shelfName}
                                            onChange={(e) => {
                                                setShelfName(e.target.value);
                                                if (error) setError(null);
                                            }}
                                            disabled={isBusy}
                                        />
                                        {error && (
                                            <p className="error-text caption-copy">
                                                {error}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <h4 className="bold-text add-items-title">
                                        {mode === "create" ? (
                                            <>
                                                Add Items to{" "}
                                                <span className="step-2-shelf-name">
                                                    {shelfName || "New Shelf"}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="step-2-shelf-name">
                                                {shelfName || "Shelf"}
                                            </span>
                                        )}
                                    </h4>
                                )}

                                {shouldShowStep2SaveButton && (
                                    <button
                                        type="button"
                                        className="button create-shelf-button"
                                        onClick={handleSaveShelfFromStep2}
                                        disabled={isBusy}
                                    >
                                        <p className="caption-copy bold-text">
                                            {step2ButtonLabel}
                                        </p>
                                    </button>
                                )}
                            </div>

                            {/* 🔹 Hide search/sort + grid entirely in rename-only edit mode */}
                            {!isEditMode && (
                                <>
                                    <div className="item-picker-controls">
                                        <div className="item-picker-search">
                                            <input
                                                className="item-picker-search-input"
                                                type="text"
                                                name="item-picker-search-input"
                                                placeholder="Search by name"
                                                value={searchQuery}
                                                onChange={(e) =>
                                                    setSearchQuery(
                                                        e.target.value
                                                    )
                                                }
                                                disabled={isBusy}
                                            />
                                            <img
                                                className="search-icon"
                                                src={searchIcon}
                                                alt="Search icon"
                                            />
                                        </div>

                                        <div
                                            ref={pieceSortDropdownContainerRef}
                                            className={
                                                "dropdown sorting-dropdown piece-picker-sorting-dropdown" +
                                                (isPieceSortOpen
                                                    ? ""
                                                    : " dropdown-closed")
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

                                    {itemsError && (
                                        <p className="error-text caption-copy">
                                            {itemsError}
                                        </p>
                                    )}

                                    <div className="item-picker-swiper-wrapper">
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
                                            className="item-picker-grid-swiper"
                                            nested={true}
                                            onSwiper={(swiper) => {
                                                itemPickerSwiperRef.current =
                                                    swiper;
                                                requestAnimationFrame(() => {
                                                    swiper.update?.();
                                                    swiper.scrollbar?.updateSize?.();
                                                });
                                            }}
                                            observer={true}
                                            observeParents={true}
                                        >
                                            <SwiperSlide>
                                                <div className="item-picker-grid">
                                                    {isLoadingItems && (
                                                        <p className="caption-copy no-pieces-text">
                                                            Loading your items...
                                                        </p>
                                                    )}

                                                    {!isLoadingItems &&
                                                        shelfPickerItems.length ===
                                                        0 && (
                                                            <p className="caption-copy no-pieces-text">
                                                                No items found.
                                                            </p>
                                                        )}

                                                    {!isLoadingItems &&
                                                        shelfPickerItems.map(
                                                            (item) => {
                                                                const isPiece =
                                                                    item.itemType ===
                                                                    "Piece";
                                                                const selected =
                                                                    isItemSelected(
                                                                        item.itemType,
                                                                        item.id
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={`${item.itemType}-${item.id}`}
                                                                        className="item-picker-card shadow"
                                                                        onClick={() =>
                                                                            toggleItemSelected(
                                                                                item.itemType,
                                                                                item.id
                                                                            )
                                                                        }
                                                                    >
                                                                        <div className="item-picker-card-img-wrapper">
                                                                            {isPiece &&
                                                                                item.piece && (
                                                                                    <img
                                                                                        className="item-picker-card-img"
                                                                                        src={
                                                                                            item
                                                                                                .piece
                                                                                                .primary_img
                                                                                        }
                                                                                        alt={
                                                                                            item
                                                                                                .piece
                                                                                                .name
                                                                                        }
                                                                                    />
                                                                                )}

                                                                            {!isPiece &&
                                                                                item.outfit && (
                                                                                    <div className="shelf-picker-outfit-img-wrapper">
                                                                                        {renderOutfitImageGrid(
                                                                                            item.outfit
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                        </div>

                                                                        <div className="item-picker-card-info-wrapper">
                                                                            <p className="caption-copy black-text item-picker-card-type">
                                                                                {isPiece
                                                                                    ? "Piece"
                                                                                    : "Outfit"}
                                                                            </p>
                                                                            <p className="item-picker-card-name">
                                                                                {
                                                                                    item.name
                                                                                }
                                                                            </p>
                                                                            <button
                                                                                type="button"
                                                                                className={
                                                                                    "button item-picker-add-button" +
                                                                                    (selected
                                                                                        ? " piece-added"
                                                                                        : "")
                                                                                }
                                                                                disabled={
                                                                                    isBusy
                                                                                }
                                                                            >
                                                                                <p className="caption-copy bold-text">
                                                                                    {selected
                                                                                        ? "Added"
                                                                                        : "Add"}
                                                                                </p>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        )}
                                                </div>
                                            </SwiperSlide>
                                        </Swiper>
                                    </div>
                                </>
                            )}

                            {error && !isEditMode && (
                                <p className="error-text caption-copy shelf-step-2-error">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddShelfModal;
