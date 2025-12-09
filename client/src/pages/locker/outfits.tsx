// src/pages/locker/Outfits.tsx
import { useEffect, useMemo, useState } from "react";
import "../../styles/index.css";
import "../../styles/pages/lockerPage.css";
import "../../styles/pages/outfits.css";

import ListPageHeader from "../../components/listPageHeader";
import ListPageFilters from "../../components/listPageFilters";
import ListPageActions, {
    SortOption,
} from "../../components/listPageActions";
import ListPageCardLayout from "../../components/listPageCardLayout";
import EditOutfitModal from "../../components/modals/editOutfitModal";
import ViewOutfitModal from "../../components/modals/viewOutfitModal";
import ViewPieceModal from "../../components/modals/viewPieceModal";
import EditPieceModal from "../../components/modals/editPieceModal";

import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";
import type { OutfitAPI, PieceAPI } from "../../types/types.api";
import type { ItemTags } from "../../types/types";

type EditOutfitMode = "add-outfit" | "edit-outfit";

// piece edit mode just mirrors Pieces page
type EditPieceMode = "add-piece" | "edit-piece";

interface EditInitialData {
    name: string;
    tags: ItemTags | null;
    pieces: PieceAPI[];
}

interface EditPieceInitialData {
    primaryImage: string | null;
    secondaryImages: string[];
    productUrl: string | null;
    name: string;
    brand: string;
    type: string;
    colors: string[];
    ownership: "owned" | "want";
}

const Outfits = () => {
    const { user } = useUser();

    const [outfits, setOutfits] = useState<OutfitAPI[]>([]);
    const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
    const [outfitsError, setOutfitsError] = useState<string | null>(null);

    const [viewOutfit, setViewOutfit] = useState<OutfitAPI | null>(null);
    const [viewPieceFromOutfit, setViewPieceFromOutfit] =
        useState<PieceAPI | null>(null);
    const [outfitForPieceView, setOutfitForPieceView] =
        useState<OutfitAPI | null>(null);

    // pieces only used to resolve outfit.pieces IDs → PieceAPI for images & modal
    const [pieces, setPieces] = useState<PieceAPI[]>([]);

    // OUTIFT EDIT STATE
    const [showEditOutfitModal, setShowEditOutfitModal] = useState(false);
    const [editMode, setEditMode] = useState<EditOutfitMode>("add-outfit");
    const [editingOutfitId, setEditingOutfitId] = useState<string | undefined>(
        undefined
    );

    const [editInitialData, setEditInitialData] = useState<EditInitialData>({
        name: "",
        tags: null,
        pieces: [],
    });

    // PIECE EDIT STATE (for editing a piece from outfit context)
    const [showEditPieceModal, setShowEditPieceModal] = useState(false);
    const [pieceEditMode, setPieceEditMode] =
        useState<EditPieceMode>("edit-piece");
    const [editingPieceId, setEditingPieceId] = useState<string | undefined>(
        undefined
    );

    const [pieceEditInitialData, setPieceEditInitialData] =
        useState<EditPieceInitialData>({
            primaryImage: null,
            secondaryImages: [],
            productUrl: null,
            name: "",
            brand: "",
            type: "",
            colors: [],
            ownership: "owned",
        });

    // NEW: sorting state for outfits
    const [sortOption, setSortOption] = useState<SortOption>("newest");

    // ─────────────────────────────────────────
    // Fetch user's outfits
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const loadOutfits = async () => {
            try {
                setIsLoadingOutfits(true);
                setOutfitsError(null);

                const res = await apiClient.getUserOutfits(user.id);
                if (!cancelled) {
                    setOutfits((res as any).outfits as OutfitAPI[]);
                }
            } catch (err) {
                console.error("Failed to load user outfits", err);
                if (!cancelled) {
                    setOutfitsError("Failed to load outfits.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingOutfits(false);
                }
            }
        };

        loadOutfits();

        return () => {
            cancelled = true;
        };
    }, [user]);

    // ─────────────────────────────────────────
    // Fetch user's pieces (for resolving outfit.pieces → PieceAPI)
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const loadPieces = async () => {
            try {
                const res = await apiClient.getUserPieces(user.id);
                if (!cancelled) {
                    setPieces(res.pieces as PieceAPI[]);
                }
            } catch (err) {
                console.error("Failed to load user pieces for outfits page", err);
            }
        };

        loadPieces();

        return () => {
            cancelled = true;
        };
    }, [user]);

    // Map piece _id → PieceAPI for outfit cards & edit modal
    const piecesByIdForOutfits = useMemo(() => {
        const map: Record<string, PieceAPI> = {};
        pieces.forEach((p) => {
            if (p._id) {
                map[p._id] = p;
            }
        });
        return map;
    }, [pieces]);

    // Helper: resolve an outfit's pieces into full PieceAPI objects
    const resolveOutfitPieces = (outfit: OutfitAPI): PieceAPI[] => {
        const raw = ((outfit as any).pieces ?? []) as any[];

        return raw
            .map((entry) => {
                // Already populated
                if (entry && typeof entry === "object" && "primary_img" in entry) {
                    return entry as PieceAPI;
                }
                // Just an id string
                if (typeof entry === "string") {
                    return piecesByIdForOutfits[entry] ?? null;
                }
                return null;
            })
            .filter((p): p is PieceAPI => !!p);
    };

    // ─────────────────────────────────────────
    // Outfit handlers
    // ─────────────────────────────────────────
    const handleOpenAddOutfit = () => {
        setEditMode("add-outfit");
        setEditingOutfitId(undefined);
        setEditInitialData({
            name: "",
            tags: null,
            pieces: [],
        });
        setShowEditOutfitModal(true);
    };

    const handleCloseEditOutfit = () => {
        setShowEditOutfitModal(false);
        setEditingOutfitId(undefined);
        setEditInitialData({
            name: "",
            tags: null,
            pieces: [],
        });
    };

    // Called from outfit item-card “Edit” and from ViewOutfitModal
    const handleEditOutfitFromCard = (outfit: OutfitAPI) => {
        setEditMode("edit-outfit");
        setEditingOutfitId((outfit as any)._id ?? (outfit as any).id);

        const resolvedPieces = resolveOutfitPieces(outfit);

        setEditInitialData({
            name: outfit.name ?? "",
            tags: (outfit as any).tags ?? null,
            pieces: resolvedPieces,
        });

        setShowEditOutfitModal(true);
    };

    const handleOutfitCreated = (created: OutfitAPI) => {
        setOutfits((prev) => [created, ...prev]);
    };

    const handleOutfitUpdated = (updated: OutfitAPI) => {
        const updatedId = (updated as any)._id ?? (updated as any).id;
        if (!updatedId) return;

        setOutfits((prev) =>
            prev.map((o) =>
                ((o as any)._id ?? (o as any).id) === updatedId ? updated : o
            )
        );
    };

    const handleOutfitRemoved = (outfitId: string) => {
        setOutfits((prev) =>
            prev.filter(
                (o) => ((o as any)._id ?? (o as any).id) !== outfitId
            )
        );
    };

    // ─────────────────────────────────────────
    // Piece edit handlers (for ViewPieceModal → EditPieceModal)
    // ─────────────────────────────────────────
    const handleEditPieceFromCard = (piece: PieceAPI) => {
        // Only ever used for editing from outfit context
        setPieceEditMode("edit-piece");
        setEditingPieceId(piece._id);

        setPieceEditInitialData({
            primaryImage: piece.primary_img ?? null,
            secondaryImages: piece.secondary_imgs ?? [],
            productUrl: piece.product_link ?? null,
            name: piece.name ?? "",
            brand: piece.brand ?? "",
            type: piece.type ?? "",
            colors: piece.colors ?? [],
            ownership: piece.owned ? "owned" : "want",
        });

        setShowEditPieceModal(true);
    };

    const handleCloseEditPieceModal = () => {
        setShowEditPieceModal(false);
        setEditingPieceId(undefined);
        setPieceEditInitialData({
            primaryImage: null,
            secondaryImages: [],
            productUrl: null,
            name: "",
            brand: "",
            type: "",
            colors: [],
            ownership: "owned",
        });
    };

    const handlePieceCreated = (piece: PieceAPI) => {
        // probably rarely used from this page, but keep consistent
        setPieces((prev) => [piece, ...prev]);
    };

    const handlePieceUpdated = (updated: PieceAPI) => {
        // keep local pieces up to date so outfits/cards re-render with new info
        setPieces((prev) =>
            prev.map((p) => (p._id === updated._id ? updated : p))
        );
    };

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <div className="locker-page outfits-page">
            <div className="list-page-header-container mobile-only">
                <ListPageHeader />
            </div>
            <ListPageFilters />

            <div className="locker-page-content">
                <div className="list-page-header-container desktop-only">
                    <ListPageHeader />
                </div>
                <ListPageActions
                    onAddOutfit={handleOpenAddOutfit}
                    sortOption={sortOption}
                    onChangeSort={setSortOption}
                // no ownership filter for outfits
                />

                <ListPageCardLayout
                    mode="outfits"
                    outfits={outfits}
                    isLoadingOutfits={isLoadingOutfits}
                    outfitsError={outfitsError}
                    onEditOutfit={handleEditOutfitFromCard}
                    onRemoveOutfit={handleOutfitRemoved}
                    onViewOutfit={setViewOutfit}
                    piecesByIdForOutfits={piecesByIdForOutfits}
                    sortOption={sortOption}
                />
            </div>

            {/* OUTFIT EDIT MODAL */}
            {showEditOutfitModal && (
                <EditOutfitModal
                    mode={editMode}
                    outfitId={editingOutfitId}
                    initialName={editInitialData.name}
                    initialTags={editInitialData.tags}
                    initialPieces={editInitialData.pieces}
                    onOutfitCreated={handleOutfitCreated}
                    onOutfitUpdated={handleOutfitUpdated}
                    onClose={handleCloseEditOutfit}
                />
            )}

            {/* VIEW OUTFIT MODAL */}
            {viewOutfit && (
                <ViewOutfitModal
                    outfit={viewOutfit}
                    piecesByIdForOutfits={piecesByIdForOutfits}
                    onClose={() => setViewOutfit(null)}
                    onEdit={handleEditOutfitFromCard}
                    onOpenPieceFromOutfit={(piece, outfit) => {
                        setViewOutfit(null);
                        setOutfitForPieceView(outfit);
                        setViewPieceFromOutfit(piece);
                    }}
                />
            )}

            {/* VIEW PIECE (FROM OUTFIT) MODAL */}
            {viewPieceFromOutfit && outfitForPieceView && (
                <ViewPieceModal
                    piece={viewPieceFromOutfit}
                    fromOutfit={true}
                    onBackToOutfit={() => {
                        setViewPieceFromOutfit(null);
                        setViewOutfit(outfitForPieceView);
                    }}
                    onClose={() => setViewPieceFromOutfit(null)}
                    onEdit={(piece) => {
                        // open edit-piece modal and close the piece viewer
                        handleEditPieceFromCard(piece);
                        setViewPieceFromOutfit(null);
                    }}
                />
            )}

            {/* EDIT PIECE MODAL (opened from viewPieceFromOutfit) */}
            {showEditPieceModal && (
                <EditPieceModal
                    onClose={handleCloseEditPieceModal}
                    mode={pieceEditMode}
                    pieceId={editingPieceId}
                    initialPrimaryImage={pieceEditInitialData.primaryImage}
                    initialProductUrl={pieceEditInitialData.productUrl}
                    initialSecondaryImages={pieceEditInitialData.secondaryImages}
                    initialName={pieceEditInitialData.name}
                    initialBrand={pieceEditInitialData.brand}
                    initialType={pieceEditInitialData.type}
                    initialColors={pieceEditInitialData.colors}
                    initialOwnership={pieceEditInitialData.ownership}
                    onPieceCreated={handlePieceCreated}
                    onPieceUpdated={handlePieceUpdated}
                />
            )}
        </div>
    );
};

export default Outfits;
