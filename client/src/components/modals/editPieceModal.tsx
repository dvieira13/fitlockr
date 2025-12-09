// src/components/modals/editPieceModal.tsx
import { useState, useEffect, useRef } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";
import { Swiper, SwiperSlide } from "swiper/react";
import { Scrollbar, Mousewheel } from "swiper/modules";
import "swiper/css";
import "swiper/css/scrollbar";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/editPieceModal.css";
import closeicon from "../../assets/icons/close_icon.svg";
import addIconWhite from "../../assets/icons/add_white_icon.svg";
import upArrowIcon from "../../assets/icons/arrow_up_icon.svg";
import deleteIconWhite from "../../assets/icons/delete_white_icon.svg";
import type { PieceAPI } from "../../types/types.api";

type EditPieceMode = "add-piece" | "edit-piece";

interface EditPieceModalProps {
    onClose: () => void;
    mode: EditPieceMode;
    pieceId?: string;
    initialPrimaryImage?: string | null;
    initialProductUrl?: string | null;
    initialSecondaryImages?: string[];
    initialName?: string | null;
    initialBrand?: string | null;
    initialType?: string | null; // map to PieceType
    initialColors?: string[];
    initialOwnership?: "owned" | "want";
    initialNotes?: string | null;
    initialSubtype?: string | null;
    initialSize?: string | null;
    initialPrice?: string | null;
    // either you can pass these…
    initialComfortTags?: string[];
    initialSeasonTags?: string[];

    // …or pass the raw tags object from the backend:
    initialTags?: PieceTagGroups | null;
    onPieceCreated?: (piece: PieceAPI) => void;
    onPieceUpdated?: (piece: PieceAPI) => void;
}

interface TagOption {
    key: string;
    label: string;
}

type PieceType = "Headwear" | "Outerwear" | "Top" | "Bottom" | "Footwear";

type PieceTagGroups = Record<string, Record<string, boolean>>;

type DragSource =
    | { type: "primary" }
    | { type: "secondary"; index: number }
    | null;

const EditPieceModal: React.FC<EditPieceModalProps> = ({
    onClose,
    mode,
    pieceId,
    initialPrimaryImage,
    initialProductUrl,
    initialSecondaryImages,
    initialName,
    initialBrand,
    initialType,
    initialColors,
    initialOwnership,
    initialNotes,
    initialSubtype,
    initialSize,
    initialPrice,
    initialComfortTags,
    initialSeasonTags,
    initialTags,
    onPieceCreated,
    onPieceUpdated,
}) => {
    const { handleOverlayClick } = useModalBehavior(onClose);
    const { user, refreshUser } = useUser();

    const [primaryImage, setPrimaryImage] = useState<string | null>(
        initialPrimaryImage ?? null
    );

    const [name, setName] = useState("");
    const [notes, setNotes] = useState("");
    const [ownership, setOwnership] = useState<"owned" | "want">(
        // default to prop if provided, fallback to "owned"
        (initialOwnership ?? "owned")
    );
    const [type, setType] = useState<PieceType | "">("");
    const [brand, setBrand] = useState("");
    const [subtype, setSubtype] = useState("");
    const [size, setSize] = useState("");

    // secondary images (up to 6)
    const [secondaryImages, setSecondaryImages] = useState<string[]>([]);

    // colors is an array (multi-select, up to 4)
    const [colors, setColors] = useState<string[]>([]);

    const [price, setPrice] = useState("");
    const [productUrl, setProductUrl] = useState(initialProductUrl ?? "");

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // upload state
    const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
    const [isUploadingSecondary, setIsUploadingSecondary] = useState(false);

    // show/hide extra button rows
    const [showPrimaryReplaceButtons, setShowPrimaryReplaceButtons] =
        useState(false);
    const [showSecondaryUploadButtons, setShowSecondaryUploadButtons] =
        useState(false);

    // drag and drop state
    const [dragSource, setDragSource] = useState<DragSource>(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [dragOverPrimary, setDragOverPrimary] = useState(false);
    const [dragOverSecondaryIndex, setDragOverSecondaryIndex] = useState<number | null>(null);

    // Main modal Swiper
    const swiperRef = useRef<any>(null);

    // Dropdown Swipers
    const typeDropdownSwiperRef = useRef<any>(null);
    const subtypeDropdownSwiperRef = useRef<any>(null);
    const sizeDropdownSwiperRef = useRef<any>(null);
    const colorsDropdownSwiperRef = useRef<any>(null);

    // file input refs
    const primaryCameraInputRef = useRef<HTMLInputElement | null>(null);
    const primaryFileInputRef = useRef<HTMLInputElement | null>(null);
    const secondaryCameraInputRef = useRef<HTMLInputElement | null>(null);
    const secondaryFileInputRef = useRef<HTMLInputElement | null>(null);

    // Dropdown open/closed state
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const [isSubtypeOpen, setIsSubtypeOpen] = useState(false);
    const [isSizeOpen, setIsSizeOpen] = useState(false);
    const [isColorsOpen, setIsColorsOpen] = useState(false);

    const resetDragState = () => {
        setDragSource(null);
        setIsDraggingImage(false);
        setDragOverPrimary(false);
        setDragOverSecondaryIndex(null);
    };

    // Subtype options per type
    const subtypeOptionsByType: Record<PieceType, string[]> = {
        Headwear: ["Hats", "Beanies"],
        Outerwear: [
            "Coats",
            "Jackets",
            "Sweatshirts",
            "Sweaters",
            "Cardigans",
            "Other",
        ],
        Top: [
            "T-Shirts",
            "Shirts",
            "Polo Shirts",
            "Blouses",
            "Crop Tops",
            "Tank Tops",
            "Corsets",
            "Bodysuits",
            "Other",
        ],
        Bottom: [
            "Jeans",
            "Pants",
            "Sweatpants",
            "Shorts",
            "Leggings",
            "Skirts",
            "Other",
        ],
        Footwear: [
            "Sneakers",
            "Oxfords",
            "Loafers",
            "Boots",
            "Clogs",
            "Pumps",
            "Mules",
            "Slippers",
            "Slides",
            "Sandals",
            "Flip Flops",
            "Other",
        ],
    };

    // Size options per type
    const sizeOptionsByType: Record<PieceType, string[]> = {
        Headwear: [],
        Outerwear: [
            "3XS",
            "XXS",
            "XS",
            "S",
            "M",
            "L",
            "XL",
            "XXL",
            "3XL",
            "4XL",
            "5XL",
            "6XL",
            "One Size",
            "Other",
        ],
        Top: [
            "3XS",
            "XXS",
            "XS",
            "S",
            "M",
            "L",
            "XL",
            "XXL",
            "3XL",
            "4XL",
            "5XL",
            "6XL",
            "One Size",
            "Other",
        ],
        Bottom: [
            "3XS",
            "XXS",
            "XS",
            "S",
            "M",
            "L",
            "XL",
            "XXL",
            "3XL",
            "4XL",
            "5XL",
            "6XL",
            "26\"",
            "27\"",
            "28\"",
            "29\"",
            "30\"",
            "31\"",
            "32\"",
            "33\"",
            "34\"",
            "35\"",
            "36\"",
            "37\"",
            "38\"",
            "39\"",
            "40\"",
            "41\"",
            "42\"",
            "43\"",
            "44\"",
            "45\"",
            "46\"",
            "47\"",
            "48\"",
            "49\"",
            "50\"",
            "51\"",
            "52\"",
            "53\"",
            "54\"",
            "55\"",
            "56\"",
            "57\"",
            "58\"",
            "59\"",
            "60\"",
            "61\"",
            "One Size",
            "Other",
        ],
        Footwear: [
            "US 3",
            "US 4",
            "US 5",
            "US 6",
            "US 6.5",
            "US 7",
            "US 7.5",
            "US 8",
            "US 8.5",
            "US 9",
            "US 9.5",
            "US 10",
            "US 10.5",
            "US 11",
            "US 11.5",
            "US 12",
            "US 12.5",
            "US 13",
            "US 13.5",
            "US 14",
            "US 14.5",
            "US 15",
            "US 15.5",
            "US 16",
            "Other",
        ],
    };

    // backend colors list
    const colorOptions = [
        "Black",
        "White",
        "Grey",
        "Brown",
        "Blue",
        "Green",
        "Yellow",
        "Orange",
        "Tan",
        "Red",
        "Purple",
        "Pink",
        "Multi",
    ];

    // Tag metadata from backend
    const [comfortTagOptions, setComfortTagOptions] = useState<TagOption[]>([]);
    const [seasonTagOptions, setSeasonTagOptions] = useState<TagOption[]>([]);

    // Selected tags
    const [selectedComfortTags, setSelectedComfortTags] = useState<string[]>([]);
    const [selectedSeasonTags, setSelectedSeasonTags] = useState<string[]>([]);

    // Hydrate initial values
    useEffect(() => {
        if (initialPrimaryImage !== undefined) {
            setPrimaryImage(initialPrimaryImage ?? null);
        }
        if (initialSecondaryImages && initialSecondaryImages.length) {
            setSecondaryImages(initialSecondaryImages.slice(0, 6));
        }
        if (initialProductUrl) {
            setProductUrl(initialProductUrl);
        }
        if (initialName) {
            setName(initialName);
        }
        if (initialBrand) {
            setBrand(initialBrand);
        }
        if (initialType) {
            const maybeType = initialType as PieceType;
            if (["Headwear", "Outerwear", "Top", "Bottom", "Footwear"].includes(maybeType)) {
                setType(maybeType);
            }
        }
        if (initialColors && initialColors.length) {
            const allowed = new Set(colorOptions);
            setColors(initialColors.filter((c) => allowed.has(c)));
        }
        if (initialOwnership) {
            setOwnership(initialOwnership);
        }
        if (initialNotes) setNotes(initialNotes);
        if (initialSubtype) setSubtype(initialSubtype);
        if (initialSize) setSize(initialSize);
        if (initialPrice) setPrice(initialPrice);
        if (initialComfortTags) setSelectedComfortTags(initialComfortTags);
        if (initialSeasonTags) setSelectedSeasonTags(initialSeasonTags);
    }, [
        initialPrimaryImage,
        initialSecondaryImages,
        initialProductUrl,
        initialName,
        initialBrand,
        initialType,
        initialColors,
        initialOwnership,
        initialNotes,
        initialSubtype,
        initialSize,
        initialPrice,
        initialComfortTags,
        initialSeasonTags,
    ]);

    // If a full tags object is provided (backend shape), hydrate from that
    useEffect(() => {
        if (!initialTags) return;

        const comfortFlags = initialTags.comfort || {};
        const seasonFlags = initialTags.season || {};

        const comfortSelected = Object.entries(comfortFlags)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key);

        const seasonSelected = Object.entries(seasonFlags)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key);

        setSelectedComfortTags(comfortSelected);
        setSelectedSeasonTags(seasonSelected);
    }, [initialTags]);


    // Fetch tag metadata
    useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await apiClient.getPieceTags();
                setComfortTagOptions(res.tags.comfort || []);
                setSeasonTagOptions(res.tags.season || []);
            } catch (err) {
                console.error("Failed to load piece tags", err);
            }
        };

        fetchTags();
    }, []);

    const headerLabel =
        mode === "add-piece" ? "Add a New Piece" : "Edit Piece";

    const submitLabel =
        mode === "add-piece" ? "Create Piece" : "Update Piece";

    const validateForm = () => {
        if (!primaryImage) {
            setError("Primary image is required.");
            return false;
        }
        if (!name.trim()) {
            setError("Name is required.");
            return false;
        }
        if (!type.trim()) {
            setError("Type is required.");
            return false;
        }
        if (colors.length === 0) {
            setError("At least one color is required.");
            return false;
        }
        setError(null);
        return true;
    };

    const buildTagsPayload = () => {
        const comfort: Record<string, boolean> = {};
        comfortTagOptions.forEach((opt) => {
            comfort[opt.key] = selectedComfortTags.includes(opt.key);
        });

        const season: Record<string, boolean> = {};
        seasonTagOptions.forEach((opt) => {
            season[opt.key] = selectedSeasonTags.includes(opt.key);
        });

        return {
            comfort,
            season,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError("You must be logged in to save a piece.");
            return;
        }

        if (!validateForm()) return;

        setIsSubmitting(true);

        const tagsPayload = buildTagsPayload();
        const owned = ownership === "owned";
        const colorArray = colors;

        try {
            if (mode === "add-piece") {
                const payload: any = {
                    primary_img: primaryImage!,
                    secondary_imgs: secondaryImages.slice(0, 6),
                    name: name.trim(),
                    notes: notes.trim() || undefined,
                    owned,
                    type: type || undefined,
                    subtype: subtype.trim() || undefined,
                    colors: colorArray,
                    brand: brand || undefined,
                    size: size || undefined,
                    price: price || undefined,
                    product_link: productUrl || undefined,
                    tags: tagsPayload,
                    created_by_name: user.name,
                    created_by_username: user.username,
                    created_by_id: user.id,
                };

                const createRes: any = await apiClient.createPiece(payload);
                const createdPiece = createRes.piece ?? createRes;

                const pieceIdToUse = createdPiece._id ?? createdPiece.id;
                if (pieceIdToUse) {
                    await apiClient.addPieceToUser(user.id, pieceIdToUse);
                }

                onPieceCreated?.(createdPiece);

                onClose();
            } else {
                if (!pieceId) {
                    setError("Missing piece ID to update.");
                    setIsSubmitting(false);
                    return;
                }

                const payload: any = {
                    id: pieceId,
                    primary_img: primaryImage || undefined,
                    secondary_imgs: secondaryImages.length
                        ? secondaryImages.slice(0, 6)
                        : undefined,
                    name: name.trim() || undefined,
                    notes: notes.trim() || undefined,
                    owned,
                    type: type || undefined,
                    subtype: subtype.trim() || undefined,
                    colors: colorArray.length ? colorArray : undefined,
                    brand: brand || undefined,
                    size: size || undefined,
                    price: price || undefined,
                    product_link: productUrl || undefined,
                    tags: tagsPayload,
                };

                const updateRes: any = await apiClient.updatePiece(payload);
                const updatedPiece: PieceAPI =
                    updateRes.piece ?? updateRes;

                await refreshUser();

                // 🔔 notify parent so it can update local list
                onPieceUpdated?.(updatedPiece);

                onClose();
            }
        } catch (err) {
            console.error("Error saving piece", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ----- Swiper helpers -----

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

    useEffect(() => {
        updateModalSwiper();
    }, [
        comfortTagOptions,
        seasonTagOptions,
        selectedComfortTags,
        selectedSeasonTags,
        colors,
        name,
        notes,
        price,
        productUrl,
        type,
        subtype,
        size,
        secondaryImages,
    ]);

    const closeAllDropdowns = () => {
        setIsTypeOpen(false);
        setIsSubtypeOpen(false);
        setIsSizeOpen(false);
        setIsColorsOpen(false);

        resetDropdownSwiper(typeDropdownSwiperRef);
        resetDropdownSwiper(subtypeDropdownSwiperRef);
        resetDropdownSwiper(sizeDropdownSwiperRef);
        resetDropdownSwiper(colorsDropdownSwiperRef);

        updateModalSwiper();
    };

    const handleOwnershipClick = (value: "owned" | "want") => {
        closeAllDropdowns();
        setOwnership(value);
    };

    const toggleComfortTag = (key: string) => {
        closeAllDropdowns();
        setSelectedComfortTags((prev) =>
            prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key]
        );
    };

    const toggleSeasonTag = (key: string) => {
        closeAllDropdowns();
        setSelectedSeasonTags((prev) =>
            prev.includes(key)
                ? prev.filter((k) => k !== key)
                : [...prev, key]
        );
    };

    // Single-select options renderer
    const renderSingleSelectOptionsWithSeparators = (
        options: string[],
        selected: string,
        onSelect: (value: string) => void
    ) => {
        return options.map((opt, index) => {
            const isActive = selected === opt;

            return (
                <div key={opt}>
                    <div
                        className={
                            "dropdown-option" +
                            (isActive ? " active-dropdown-option" : "")
                        }
                        onClick={() => onSelect(opt)}
                    >
                        <p className="caption-copy">{opt}</p>
                    </div>

                    {index < options.length - 1 && (
                        <div className="dropdown-separator-line"></div>
                    )}
                </div>
            );
        });
    };

    // Multi-select options renderer (colors)
    const renderMultiSelectOptionsWithSeparators = (
        options: string[],
        selected: string[],
        onToggle: (value: string) => void,
        getCheckboxClass?: (value: string) => string | undefined
    ) => {
        return options.map((opt, index) => {
            const isActive = selected.includes(opt);
            const colorClass = getCheckboxClass ? getCheckboxClass(opt) : "";

            return (
                <div key={opt}>
                    <div
                        className={
                            "dropdown-option" +
                            (isActive ? " active-dropdown-option" : "")
                        }
                        onClick={() => onToggle(opt)}
                    >
                        <div
                            className={
                                "dropdown-option-checkbox" +
                                (colorClass ? ` ${colorClass}` : "")
                            }
                        ></div>
                        <p className="caption-copy">{opt}</p>
                    </div>

                    {index < options.length - 1 && (
                        <div className="dropdown-separator-line"></div>
                    )}
                </div>
            );
        });
    };

    // when type changes, reset subtype + size and close related dropdowns
    const handleSelectType = (value: string) => {
        const typed = value as PieceType;
        setType(typed);
        setSubtype("");
        setSize("");
        setIsTypeOpen(false);
        setIsSubtypeOpen(false);
        setIsSizeOpen(false);

        resetDropdownSwiper(typeDropdownSwiperRef);
        resetDropdownSwiper(subtypeDropdownSwiperRef);
        resetDropdownSwiper(sizeDropdownSwiperRef);

        updateModalSwiper();
    };

    const handleSelectSubtype = (value: string) => {
        setSubtype(value);
        setIsSubtypeOpen(false);
        resetDropdownSwiper(subtypeDropdownSwiperRef);
        updateModalSwiper();
    };

    const handleSelectSize = (value: string) => {
        setSize(value);
        setIsSizeOpen(false);
        resetDropdownSwiper(sizeDropdownSwiperRef);
        updateModalSwiper();
    };

    // Multi-select colors (max 4)
    const handleToggleColor = (value: string) => {
        setColors((prev) => {
            const alreadySelected = prev.includes(value);
            if (alreadySelected) {
                return prev.filter((c) => c !== value);
            }
            if (prev.length >= 4) {
                return prev;
            }
            return [...prev, value];
        });
    };

    const typeLabel = type || "Select Type";
    const subtypeLabel = subtype || "Select Subtype";
    const sizeLabel = size || "Select Size";
    const colorsTopLabel = "Colors";

    const currentSubtypeOptions =
        type && subtypeOptionsByType[type] ? subtypeOptionsByType[type] : [];
    const currentSizeOptions =
        type && sizeOptionsByType[type] ? sizeOptionsByType[type] : [];

    const isSubtypeDisabled = !type;
    const isSizeDisabled = !type || type === "Headwear";

    // Dropdown toggles
    const toggleTypeDropdown = () => {
        setIsTypeOpen((prev) => {
            const next = !prev;
            if (next) {
                setIsSubtypeOpen(false);
                setIsSizeOpen(false);
                setIsColorsOpen(false);

                setTimeout(() => {
                    updateDropdownSwiper(typeDropdownSwiperRef);
                    updateModalSwiper();
                }, 0);
            } else {
                resetDropdownSwiper(typeDropdownSwiperRef);
                updateModalSwiper();
            }
            return next;
        });
    };

    const toggleSubtypeDropdown = () => {
        if (!type) return;
        setIsSubtypeOpen((prev) => {
            const next = !prev;
            if (next) {
                setIsTypeOpen(false);
                setIsSizeOpen(false);
                setIsColorsOpen(false);

                setTimeout(() => {
                    updateDropdownSwiper(subtypeDropdownSwiperRef);
                    updateModalSwiper();
                }, 0);
            } else {
                resetDropdownSwiper(subtypeDropdownSwiperRef);
                updateModalSwiper();
            }
            return next;
        });
    };

    const toggleSizeDropdown = () => {
        if (!type) return;
        setIsSizeOpen((prev) => {
            const next = !prev;
            if (next) {
                setIsTypeOpen(false);
                setIsSubtypeOpen(false);
                setIsColorsOpen(false);

                setTimeout(() => {
                    updateDropdownSwiper(sizeDropdownSwiperRef);
                    updateModalSwiper();
                }, 0);
            } else {
                resetDropdownSwiper(sizeDropdownSwiperRef);
                updateModalSwiper();
            }
            return next;
        });
    };

    const toggleColorsDropdown = () => {
        setIsColorsOpen((prev) => {
            const next = !prev;
            if (next) {
                setIsTypeOpen(false);
                setIsSubtypeOpen(false);
                setIsSizeOpen(false);

                setTimeout(() => {
                    updateDropdownSwiper(colorsDropdownSwiperRef);
                    updateModalSwiper();
                }, 0);
            } else {
                resetDropdownSwiper(colorsDropdownSwiperRef);
                updateModalSwiper();
            }
            return next;
        });
    };

    // Mouse enter/leave helpers for nested dropdown swipers
    const handleDropdownMouseEnter = () => {
        const swiper = swiperRef.current;
        if (swiper && swiper.mousewheel && swiper.mousewheel.disable) {
            swiper.mousewheel.disable();
        }
    };

    const handleDropdownMouseLeave = () => {
        const swiper = swiperRef.current;
        if (swiper && swiper.mousewheel && swiper.mousewheel.enable) {
            swiper.mousewheel.enable();
        }
    };

    // Dropdown-bottom Swiper (single-select)
    const renderDropdownBottomSwiperSingle = (
        options: string[],
        selected: string,
        onSelect: (value: string) => void,
        dropdownSwiperRef?: any
    ) => (
        <div
            className="dropdown-bottom"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
        >
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
                    if (dropdownSwiperRef) {
                        dropdownSwiperRef.current = swiper;
                        swiper.update?.();
                        swiper.scrollbar?.updateSize?.();
                    }
                }}
            >
                <SwiperSlide>
                    {renderSingleSelectOptionsWithSeparators(
                        options,
                        selected,
                        onSelect
                    )}
                </SwiperSlide>
            </Swiper>
        </div>
    );

    // Dropdown-bottom Swiper (multi-select) – for colors
    const renderDropdownBottomSwiperMulti = (
        options: string[],
        selected: string[],
        onToggle: (value: string) => void,
        getCheckboxClass?: (value: string) => string | undefined,
        dropdownSwiperRef?: any
    ) => (
        <div
            className="dropdown-bottom"
            onMouseEnter={handleDropdownMouseEnter}
            onMouseLeave={handleDropdownMouseLeave}
        >
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
                    if (dropdownSwiperRef) {
                        dropdownSwiperRef.current = swiper;
                        swiper.update?.();
                        swiper.scrollbar?.updateSize?.();
                    }
                }}
            >
                <SwiperSlide>
                    {renderMultiSelectOptionsWithSeparators(
                        options,
                        selected,
                        onToggle,
                        getCheckboxClass
                    )}
                </SwiperSlide>
            </Swiper>
        </div>
    );

    // ----- Primary image upload (Cloudinary) -----

    const handleTogglePrimaryReplace = () => {
        closeAllDropdowns();
        setShowPrimaryReplaceButtons((prev) => !prev);
    };

    const handlePrimaryTakePictureClick = () => {
        if (isUploadingPrimary) return;
        primaryCameraInputRef.current?.click();
    };

    const handlePrimaryUploadImageClick = () => {
        if (isUploadingPrimary) return;
        primaryFileInputRef.current?.click();
    };

    const handlePrimaryFileSelected = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64DataUrl = reader.result as string;

            try {
                setIsUploadingPrimary(true);
                setError(null);

                const res = await apiClient.uploadPieceImage({
                    image: base64DataUrl,
                });
                const cloudinaryUrl = (res as any).url;
                if (!cloudinaryUrl) {
                    throw new Error("No URL returned from upload");
                }

                setPrimaryImage(cloudinaryUrl);
                setShowPrimaryReplaceButtons(false);
            } catch (err) {
                console.error("Failed to upload primary piece image", err);
                setError("Failed to upload primary image. Please try again.");
            } finally {
                setIsUploadingPrimary(false);
                e.target.value = "";
            }
        };

        reader.readAsDataURL(file);
    };

    // ----- Secondary images upload (Cloudinary) -----

    const handleStartAddSecondaryImage = () => {
        if (secondaryImages.length >= 6) return;
        closeAllDropdowns();
        setShowSecondaryUploadButtons(true);
    };

    const handleStartAddSecondaryImageFromTile = (
        e: React.MouseEvent<HTMLDivElement>
    ) => {
        e.stopPropagation();
        handleStartAddSecondaryImage();
    };

    const handleDeleteSecondaryImage = (
        e: React.MouseEvent<HTMLDivElement>,
        index: number
    ) => {
        e.stopPropagation();
        setSecondaryImages((prev) => prev.filter((_, i) => i !== index));
        setShowSecondaryUploadButtons(false);
    };

    const handleSecondaryTakePictureClick = () => {
        if (isUploadingSecondary) return;
        secondaryCameraInputRef.current?.click();
    };

    const handleSecondaryUploadImageClick = () => {
        if (isUploadingSecondary) return;
        secondaryFileInputRef.current?.click();
    };

    const handleSecondaryFileSelected = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64DataUrl = reader.result as string;

            try {
                setIsUploadingSecondary(true);
                setError(null);

                const res = await apiClient.uploadPieceImage({
                    image: base64DataUrl,
                });
                const cloudinaryUrl = (res as any).url;
                if (!cloudinaryUrl) {
                    throw new Error("No URL returned from upload");
                }

                setSecondaryImages((prev) => {
                    if (prev.length >= 6) return prev;
                    return [...prev, cloudinaryUrl];
                });

                setShowSecondaryUploadButtons(false);
            } catch (err) {
                console.error("Failed to upload secondary piece image", err);
                setError("Failed to upload secondary image. Please try again.");
            } finally {
                setIsUploadingSecondary(false);
                e.target.value = "";
            }
        };

        reader.readAsDataURL(file);
    };

    // ----- Drag & drop helpers -----

    const handlePrimaryDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!primaryImage) return;
        setDragSource({ type: "primary" });
        setIsDraggingImage(true);
        e.dataTransfer.effectAllowed = "move";
        // some browsers need at least one data item to consider it a drag
        e.dataTransfer.setData("text/plain", "primary");
    };

    const handlePrimaryDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        if (!dragSource) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverPrimary(true);
    };

    const handlePrimaryDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        // only clear if we're actually leaving the primary container
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            setDragOverPrimary(false);
        }
    };

    const handlePrimaryDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOverPrimary(false);

        if (!dragSource) {
            resetDragState();
            return;
        }

        if (dragSource.type === "secondary") {
            const sourceIndex = dragSource.index;
            const sourceImg = secondaryImages[sourceIndex];
            if (!sourceImg) {
                resetDragState();
                return;
            }

            // CASE 1: primary already has an image → swap primary & that secondary
            if (primaryImage) {
                const nextSecondary = [...secondaryImages];
                nextSecondary[sourceIndex] = primaryImage;
                setSecondaryImages(nextSecondary);
                setPrimaryImage(sourceImg);
            } else {
                // CASE 2: primary is empty → move secondary into primary, remove from list
                const filtered = secondaryImages.filter((_, idx) => idx !== sourceIndex);
                setSecondaryImages(filtered);
                setPrimaryImage(sourceImg);
            }
        }

        resetDragState();
    };


    const handleImageDragEnd = () => {
        resetDragState();
    };

    const handleSecondaryDragStart = (
        e: React.DragEvent<HTMLDivElement>,
        index: number
    ) => {
        const imgSrc = secondaryImages[index];
        if (!imgSrc) return;
        setDragSource({ type: "secondary", index });
        setIsDraggingImage(true);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `secondary-${index}`);
    };

    const handleSecondaryDragOver = (
        e: React.DragEvent<HTMLDivElement>,
        index: number
    ) => {
        if (!dragSource) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverSecondaryIndex(index);
    };

    const handleSecondaryDragLeave = (
        e: React.DragEvent<HTMLDivElement>,
        index: number
    ) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            if (dragOverSecondaryIndex === index) {
                setDragOverSecondaryIndex(null);
            }
        }
    };

    const handleSecondaryDrop = (
        e: React.DragEvent<HTMLDivElement>,
        index: number
    ) => {
        e.preventDefault();
        setDragOverSecondaryIndex(null);

        if (!dragSource) {
            resetDragState();
            return;
        }

        // ── secondary → secondary ─────────────────────────────
        if (dragSource.type === "secondary") {
            const sourceIndex = dragSource.index;
            if (sourceIndex === index) {
                resetDragState();
                return;
            }

            const len = secondaryImages.length;
            const sourceImg = secondaryImages[sourceIndex];
            if (!sourceImg) {
                resetDragState();
                return;
            }

            if (index < len) {
                // swap two secondary slots
                const next = [...secondaryImages];
                const targetImg = next[index];
                next[index] = sourceImg;
                next[sourceIndex] = targetImg;
                setSecondaryImages(next);
            } else {
                // drop onto an "empty" tile → move to next available slot (end)
                const filtered = secondaryImages.filter((_, i) => i !== sourceIndex);
                if (filtered.length < 6) {
                    filtered.push(sourceImg);
                }
                setSecondaryImages(filtered);
            }

            resetDragState();
            return;
        }

        // ── primary → secondary ───────────────────────────────
        if (dragSource.type === "primary") {
            if (!primaryImage) {
                resetDragState();
                return;
            }

            const oldPrimary = primaryImage;
            const len = secondaryImages.length;

            if (index < len) {
                // swap primary with occupied secondary tile
                const next = [...secondaryImages];
                const targetImg = next[index];
                next[index] = oldPrimary;
                setSecondaryImages(next);
                setPrimaryImage(targetImg);
            } else {
                // drop onto empty secondary → append primary, clear primary
                if (len < 6) {
                    const next = [...secondaryImages, oldPrimary];
                    setSecondaryImages(next);
                    setPrimaryImage(null);
                }
            }

            resetDragState();
            return;
        }

        resetDragState();
    };

    const handleModalInnerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;

        // Are we clicking one of the hidden file inputs?
        const isPrimaryFileInput =
            target === primaryCameraInputRef.current ||
            target === primaryFileInputRef.current;

        const isSecondaryFileInput =
            target === secondaryCameraInputRef.current ||
            target === secondaryFileInputRef.current;

        // ─── PRIMARY IMAGE CONTROLS ─────────────────────────────
        const insidePrimaryControls =
            isPrimaryFileInput ||
            (
                target.closest(".primary-img-container") && (
                    target.closest(".replace-img-button") ||
                    target.closest(".replace-primary-img-buttons") ||
                    target.closest(".take-picture-button") ||
                    target.closest(".upload-image-button")
                )
            );

        if (!insidePrimaryControls) {
            setShowPrimaryReplaceButtons(false);
        }

        // ─── SECONDARY IMAGE CONTROLS ──────────────────────────
        const insideSecondaryControls =
            isSecondaryFileInput ||
            (
                target.closest(".secondary-imgs-container") && (
                    target.closest(".upload-new-img-button") ||
                    target.closest(".upload-secondary-img-buttons") ||
                    target.closest(".secondary-img-overlay") ||
                    target.closest(".secondary-img-empty-overlay") ||
                    target.closest(".take-picture-button") ||
                    target.closest(".upload-image-button")
                )
            );

        if (!insideSecondaryControls) {
            setShowSecondaryUploadButtons(false);
        }

        // ─── DROPDOWNS (type, subtype, size, colors) ───────────
        const insideAnyDropdown = target.closest(".dropdown");
        if (!insideAnyDropdown) {
            closeAllDropdowns();
        }
    };

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div
                className={
                    "modal-container edit-piece-modal" +
                    (isDraggingImage ? " edit-piece-modal--dragging" : "")
                }
                onClick={handleModalInnerClick}
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
                    <h4 className="bold-text">{headerLabel}</h4>
                    <div className="separator-line"></div>
                </div>

                <div className="modal-content">
                    <form
                        className="edit-piece-form"
                        onSubmit={handleSubmit}
                    >
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

                                <div className="img-inputs-container">
                                    {/* PRIMARY IMAGE */}
                                    <div className="primary-img-container">
                                        <p className="caption-copy label-copy">
                                            primary image*
                                        </p>
                                        <div
                                            className={
                                                "img-input-container shadow" +
                                                (dragOverPrimary ? " img-drop-target" : "") +
                                                (isDraggingImage ? " img-dragging-active" : "")
                                            }
                                            draggable={!!primaryImage}
                                            onDragStart={handlePrimaryDragStart}
                                            onDragOver={handlePrimaryDragOver}
                                            onDragEnter={handlePrimaryDragOver}
                                            onDragLeave={handlePrimaryDragLeave}
                                            onDrop={handlePrimaryDrop}
                                            onDragEnd={handleImageDragEnd}
                                        >
                                            {primaryImage ? (
                                                <img
                                                    className="primary-img"
                                                    src={primaryImage}
                                                    alt="Primary Piece Image"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="primary-img placeholder">
                                                    <p className="caption-copy">Image will appear here</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Replace Image trigger OR the expanded controls (mutually exclusive) */}
                                        {!showPrimaryReplaceButtons ? (
                                            <button
                                                type="button"
                                                className="button replace-img-button"
                                                onClick={handleTogglePrimaryReplace}
                                                disabled={isUploadingPrimary}
                                            >
                                                <p className="caption-copy bold-text">
                                                    {isUploadingPrimary ? "Uploading..." : "Replace Image"}
                                                </p>
                                            </button>
                                        ) : (
                                            <div className="replace-primary-img-buttons">
                                                <button
                                                    type="button"
                                                    className="button take-picture-button"
                                                    onClick={handlePrimaryTakePictureClick}
                                                    disabled={isUploadingPrimary}
                                                >
                                                    <p className="caption-copy bold-text">
                                                        {isUploadingPrimary ? "Uploading..." : "Take Picture"}
                                                    </p>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button upload-image-button"
                                                    onClick={handlePrimaryUploadImageClick}
                                                    disabled={isUploadingPrimary}
                                                >
                                                    <p className="caption-copy bold-text">
                                                        {isUploadingPrimary ? "Uploading..." : "Upload Image"}
                                                    </p>
                                                </button>
                                            </div>
                                        )}

                                        {/* hidden inputs for primary image */}
                                        <input
                                            ref={primaryCameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: "none" }}
                                            onChange={handlePrimaryFileSelected}
                                        />
                                        <input
                                            ref={primaryFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={handlePrimaryFileSelected}
                                        />
                                    </div>

                                    {/* SECONDARY IMAGES */}
                                    <div className="secondary-imgs-container">
                                        <p className="caption-copy label-copy">
                                            secondary images
                                        </p>
                                        <div className="secondary-imgs-wrapper">
                                            {[0, 1, 2, 3, 4, 5].map((i) => {
                                                const imgSrc =
                                                    secondaryImages[i] ?? null;

                                                return (
                                                    <div
                                                        key={i}
                                                        className={
                                                            "secondary-img-item shadow" +
                                                            (dragOverSecondaryIndex === i ? " img-drop-target" : "") +
                                                            (isDraggingImage ? " img-dragging-active" : "")
                                                        }
                                                        onClick={closeAllDropdowns}
                                                        draggable={!!imgSrc}
                                                        onDragStart={(e) => handleSecondaryDragStart(e, i)}
                                                        onDragOver={(e) => handleSecondaryDragOver(e, i)}
                                                        onDragEnter={(e) => handleSecondaryDragOver(e, i)}
                                                        onDragLeave={(e) => handleSecondaryDragLeave(e, i)}
                                                        onDrop={(e) => handleSecondaryDrop(e, i)}
                                                        onDragEnd={handleImageDragEnd}
                                                    >
                                                        {imgSrc && (
                                                            <>
                                                                <img
                                                                    className="secondary-img"
                                                                    src={imgSrc}
                                                                    alt="Secondary Piece Image"
                                                                    draggable={false}
                                                                />
                                                                <div className="secondary-img-overlay">
                                                                    <div
                                                                        className="secondary-img-overlay-button secondary-img-delete"
                                                                        onClick={(e) =>
                                                                            handleDeleteSecondaryImage(e, i)
                                                                        }
                                                                    >
                                                                        <img className="delete-icon" src={deleteIconWhite} alt="Delete Icon" />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}

                                                        {!imgSrc && (
                                                            <div
                                                                className="secondary-img-empty-overlay"
                                                                onClick={handleStartAddSecondaryImageFromTile}
                                                            >
                                                                <img
                                                                    className="add-icon"
                                                                    src={addIconWhite}
                                                                    alt="Add Icon White"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Upload New Image button (always shown, but disabled at 6) */}
                                        {!showSecondaryUploadButtons && (
                                            <button
                                                type="button"
                                                className={
                                                    "button upload-new-img-button" +
                                                    (secondaryImages.length >= 6
                                                        ? " button-disabled"
                                                        : "")
                                                }
                                                onClick={handleStartAddSecondaryImage}
                                                disabled={
                                                    isUploadingSecondary ||
                                                    secondaryImages.length >= 6
                                                }
                                            >
                                                <p className="caption-copy bold-text">
                                                    {isUploadingSecondary
                                                        ? "Uploading..."
                                                        : "Upload New Image"}
                                                </p>
                                            </button>
                                        )}

                                        {/* Secondary upload controls row */}
                                        {showSecondaryUploadButtons && (
                                            <div className="upload-secondary-img-buttons">
                                                <button
                                                    type="button"
                                                    className="button take-picture-button"
                                                    onClick={
                                                        handleSecondaryTakePictureClick
                                                    }
                                                    disabled={
                                                        isUploadingSecondary
                                                    }
                                                >
                                                    <p className="caption-copy bold-text">
                                                        {isUploadingSecondary
                                                            ? "Uploading..."
                                                            : "Take Picture"}
                                                    </p>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button upload-image-button"
                                                    onClick={
                                                        handleSecondaryUploadImageClick
                                                    }
                                                    disabled={
                                                        isUploadingSecondary
                                                    }
                                                >
                                                    <p className="caption-copy bold-text">
                                                        {isUploadingSecondary
                                                            ? "Uploading..."
                                                            : "Upload Image"}
                                                    </p>
                                                </button>
                                            </div>
                                        )}

                                        {/* hidden inputs for secondary images */}
                                        <input
                                            ref={secondaryCameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: "none" }}
                                            onChange={
                                                handleSecondaryFileSelected
                                            }
                                        />
                                        <input
                                            ref={secondaryFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={
                                                handleSecondaryFileSelected
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="separator-line"></div>

                                <div className="details-inputs-container">
                                    <div className="details-left-container">
                                        <label
                                            className="input-label caption-copy"
                                            htmlFor="name"
                                        >
                                            name*
                                            <textarea
                                                id="name"
                                                name="name"
                                                className="name-input"
                                                value={name}
                                                onChange={(e) =>
                                                    setName(e.target.value)
                                                }
                                                onFocus={closeAllDropdowns}
                                                rows={2}
                                            />
                                        </label>

                                        <label
                                            className="input-label caption-copy notes-input-label"
                                            htmlFor="notes"
                                        >
                                            notes
                                            <textarea
                                                id="notes"
                                                name="notes"
                                                className="notes-input"
                                                value={notes}
                                                onChange={(e) =>
                                                    setNotes(e.target.value)
                                                }
                                                onFocus={closeAllDropdowns}
                                                rows={4}
                                            />
                                        </label>

                                        <div className="ownership-input">
                                            <p className="caption-copy label-copy">
                                                ownership*
                                            </p>
                                            <div className="ownership-selector">
                                                <div
                                                    className={
                                                        "ownership-option ownership-owned" +
                                                        (ownership === "owned"
                                                            ? " active-ownership-option"
                                                            : "")
                                                    }
                                                    onClick={() =>
                                                        handleOwnershipClick(
                                                            "owned"
                                                        )
                                                    }
                                                >
                                                    <p className="caption-copy">
                                                        Owned
                                                    </p>
                                                </div>
                                                <div
                                                    className={
                                                        "ownership-option ownership-want" +
                                                        (ownership === "want"
                                                            ? " active-ownership-option"
                                                            : "")
                                                    }
                                                    onClick={() =>
                                                        handleOwnershipClick(
                                                            "want"
                                                        )
                                                    }
                                                >
                                                    <p className="caption-copy">
                                                        Want
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="details-right-container">
                                        {/* ROW 1: Type + Brand */}
                                        <div className="form-row">
                                            <div className="dropdown-input-container">
                                                <p className="caption-copy label-copy">
                                                    type*
                                                </p>
                                                <div
                                                    className={
                                                        "dropdown type-dropdown" +
                                                        (isTypeOpen
                                                            ? ""
                                                            : " dropdown-closed")
                                                    }
                                                >
                                                    <div
                                                        className="dropdown-top"
                                                        onClick={
                                                            toggleTypeDropdown
                                                        }
                                                    >
                                                        <p className="caption-copy">
                                                            {typeLabel}
                                                        </p>
                                                        <img
                                                            className="up-arrow-icon"
                                                            src={upArrowIcon}
                                                            alt="Up Arrow Icon"
                                                        />
                                                    </div>
                                                    {renderDropdownBottomSwiperSingle(
                                                        [
                                                            "Headwear",
                                                            "Outerwear",
                                                            "Top",
                                                            "Bottom",
                                                            "Footwear",
                                                        ],
                                                        type,
                                                        handleSelectType,
                                                        typeDropdownSwiperRef
                                                    )}
                                                </div>
                                            </div>

                                            <label
                                                className="input-label caption-copy"
                                                htmlFor="brand"
                                            >
                                                brand
                                                <input
                                                    id="brand"
                                                    name="brand"
                                                    type="text"
                                                    className="brand-input"
                                                    value={brand}
                                                    onChange={(e) =>
                                                        setBrand(
                                                            e.target.value
                                                        )
                                                    }
                                                    onFocus={closeAllDropdowns}
                                                />
                                            </label>
                                        </div>

                                        {/* ROW 2: Subtype + Size */}
                                        <div className="form-row">
                                            <div className="dropdown-input-container">
                                                <p className="caption-copy label-copy">
                                                    subtype
                                                </p>
                                                <div
                                                    className={
                                                        "dropdown subtype-dropdown" +
                                                        (isSubtypeOpen
                                                            ? ""
                                                            : " dropdown-closed") +
                                                        (isSubtypeDisabled
                                                            ? " input-disabled"
                                                            : "")
                                                    }
                                                >
                                                    <div
                                                        className="dropdown-top"
                                                        onClick={
                                                            toggleSubtypeDropdown
                                                        }
                                                        aria-disabled={
                                                            isSubtypeDisabled
                                                        }
                                                    >
                                                        <p className="caption-copy">
                                                            {subtypeLabel}
                                                        </p>
                                                        <img
                                                            className="up-arrow-icon"
                                                            src={upArrowIcon}
                                                            alt="Up Arrow Icon"
                                                        />
                                                    </div>
                                                    {renderDropdownBottomSwiperSingle(
                                                        currentSubtypeOptions,
                                                        subtype,
                                                        handleSelectSubtype,
                                                        subtypeDropdownSwiperRef
                                                    )}
                                                </div>
                                            </div>

                                            <div className="dropdown-input-container">
                                                <p className="caption-copy label-copy">
                                                    size
                                                </p>
                                                <div
                                                    className={
                                                        "dropdown size-dropdown" +
                                                        (isSizeOpen
                                                            ? ""
                                                            : " dropdown-closed") +
                                                        (isSizeDisabled
                                                            ? " input-disabled"
                                                            : "")
                                                    }
                                                >
                                                    <div
                                                        className="dropdown-top"
                                                        onClick={
                                                            toggleSizeDropdown
                                                        }
                                                        aria-disabled={
                                                            isSizeDisabled
                                                        }
                                                    >
                                                        <p className="caption-copy">
                                                            {sizeLabel}
                                                        </p>
                                                        <img
                                                            className="up-arrow-icon"
                                                            src={upArrowIcon}
                                                            alt="Up Arrow Icon"
                                                        />
                                                    </div>
                                                    {renderDropdownBottomSwiperSingle(
                                                        currentSizeOptions,
                                                        size,
                                                        handleSelectSize,
                                                        sizeDropdownSwiperRef
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ROW 3: Colors + Price */}
                                        <div className="form-row">
                                            <div className="dropdown-input-container">
                                                <p className="caption-copy label-copy">
                                                    color(s)*
                                                </p>
                                                <div
                                                    className={
                                                        "dropdown colors-dropdown" +
                                                        (isColorsOpen
                                                            ? ""
                                                            : " dropdown-closed")
                                                    }
                                                >
                                                    <div
                                                        className="dropdown-top"
                                                        onClick={
                                                            toggleColorsDropdown
                                                        }
                                                    >
                                                        <p className="caption-copy">
                                                            {colorsTopLabel}
                                                        </p>
                                                        <img
                                                            className="up-arrow-icon"
                                                            src={upArrowIcon}
                                                            alt="Up Arrow Icon"
                                                        />
                                                    </div>
                                                    {renderDropdownBottomSwiperMulti(
                                                        colorOptions,
                                                        colors,
                                                        handleToggleColor,
                                                        (opt) =>
                                                            opt.toLowerCase(),
                                                        colorsDropdownSwiperRef
                                                    )}
                                                </div>

                                                <div className="selected-colors-container">
                                                    {colors.map((color) => {
                                                        const colorClass =
                                                            color.toLowerCase();
                                                        return (
                                                            <div
                                                                key={color}
                                                                className="selected-color"
                                                                onClick={
                                                                    closeAllDropdowns
                                                                }
                                                            >
                                                                <div
                                                                    className={`selected-color-tile ${colorClass}`}
                                                                ></div>
                                                                <p className="caption-copy">
                                                                    {color}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <label
                                                className="input-label caption-copy"
                                                htmlFor="price"
                                            >
                                                price
                                                <input
                                                    id="price"
                                                    name="price"
                                                    type="text"
                                                    className="price-input"
                                                    placeholder="$0.00"
                                                    value={price}
                                                    onChange={(e) =>
                                                        setPrice(
                                                            e.target.value
                                                        )
                                                    }
                                                    onFocus={closeAllDropdowns}
                                                />
                                            </label>
                                        </div>

                                        {/* Product link */}
                                        <label
                                            className="input-label caption-copy"
                                            htmlFor="url"
                                        >
                                            product link
                                            <input
                                                id="url"
                                                name="url"
                                                type="url"
                                                placeholder="Paste URL here"
                                                className="url-input"
                                                value={productUrl}
                                                onChange={(e) =>
                                                    setProductUrl(
                                                        e.target.value
                                                    )
                                                }
                                                onFocus={closeAllDropdowns}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="separator-line"></div>

                                {/* Tags */}
                                <div className="tags-inputs-container">
                                    <p className="caption-copy bold-text">
                                        Tags:
                                    </p>
                                    <div className="tags-container-wrapper">
                                        <div className="tags-container">
                                            <p className="caption-copy label-copy">
                                                comfort
                                            </p>
                                            <div className="tags-wrapper">
                                                {comfortTagOptions.map((tag) => (
                                                    <div
                                                        key={tag.key}
                                                        className={
                                                            "tag-item" +
                                                            (selectedComfortTags.includes(
                                                                tag.key
                                                            )
                                                                ? " active-tag-item"
                                                                : "")
                                                        }
                                                        onClick={() =>
                                                            toggleComfortTag(
                                                                tag.key
                                                            )
                                                        }
                                                    >
                                                        <p className="caption-copy">
                                                            {tag.label}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="tags-container">
                                            <p className="caption-copy label-copy">
                                                season
                                            </p>
                                            <div className="tags-wrapper">
                                                {seasonTagOptions.map((tag) => (
                                                    <div
                                                        key={tag.key}
                                                        className={
                                                            "tag-item" +
                                                            (selectedSeasonTags.includes(
                                                                tag.key
                                                            )
                                                                ? " active-tag-item"
                                                                : "")
                                                        }
                                                        onClick={() =>
                                                            toggleSeasonTag(
                                                                tag.key
                                                            )
                                                        }
                                                    >
                                                        <p className="caption-copy">
                                                            {tag.label}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="separator-line"></div>

                            </SwiperSlide>
                        </Swiper>
                        <div className={"edit-piece-form-submit-container" +
                            (error
                                ? " submit-container-error" : "")}>
                            {error && (
                                <p className="error-text caption-copy">
                                    {error}
                                </p>
                            )}
                            <button
                                type="submit"
                                className="button update-piece-button"
                                disabled={isSubmitting}
                                onClick={closeAllDropdowns}
                            >
                                <p className="caption-copy bold-text">
                                    {isSubmitting ? "Saving..." : submitLabel}
                                </p>
                            </button>
                        </div>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default EditPieceModal;
