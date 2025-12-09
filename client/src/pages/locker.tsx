// src/pages/locker/Locker.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/index.css";
import "../styles/pages/lockerPage.css";
import "../styles/pages/locker.css";

import ListPageFilters from "../components/listPageFilters";
import ItemCardCarousel from "../components/itemCardCarousel";
import ShelfCarousel from "../components/shelfCarousel";

import AddPieceModal from "../components/modals/addPieceModal";
import AddShelfModal from "../components/modals/addShelfModal";
import EditPieceModal from "../components/modals/editPieceModal";
import ViewPieceModal from "../components/modals/viewPieceModal";
import EditOutfitModal from "../components/modals/editOutfitModal";
import ViewOutfitModal from "../components/modals/viewOutfitModal";

import { useUser } from "../context/userContext";
import { apiClient } from "../apiClient";

import type { PieceAPI, OutfitAPI, ShelfAPI } from "../types/types.api";

type ShelfModalMode = "create" | "update-items" | "edit";

interface PieceViewContext {
    piece: PieceAPI;
    fromOutfit: boolean;
    parentOutfit?: OutfitAPI | null;
}

interface NewPieceInitialData {
    primaryImage: string | null;
    secondaryImages: string[];
    productUrl: string | null;
    name: string;
    brand: string;
    type: string;
    colors: string[];
    ownership: "owned" | "want";
}

const makeEmptyNewPieceInitialData = (): NewPieceInitialData => ({
    primaryImage: null,
    secondaryImages: [],
    productUrl: null,
    name: "",
    brand: "",
    type: "",
    colors: [],
    ownership: "owned",
});

const Locker: React.FC = () => {
    const { user, refreshUser } = useUser();
    const navigate = useNavigate();

    // Full user collections
    const [pieces, setPieces] = useState<PieceAPI[]>([]);
    const [outfits, setOutfits] = useState<OutfitAPI[]>([]);
    const [shelves, setShelves] = useState<ShelfAPI[]>([]);

    const [isLoadingPieces, setIsLoadingPieces] = useState(false);
    const [piecesError, setPiecesError] = useState<string | null>(null);
    const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
    const [outfitsError, setOutfitsError] = useState<string | null>(null);
    const [isLoadingShelves, setIsLoadingShelves] = useState(false);
    const [shelvesError, setShelvesError] = useState<string | null>(null);

    // Edit / view states
    const [editPiece, setEditPiece] = useState<PieceAPI | null>(null);
    const [viewOutfit, setViewOutfit] = useState<OutfitAPI | null>(null);
    const [editOutfit, setEditOutfit] = useState<OutfitAPI | null>(null);

    const [pieceViewCtx, setPieceViewCtx] = useState<PieceViewContext | null>(
        null
    );

    // Add flows
    const [showAddPieceModal, setShowAddPieceModal] = useState(false);
    const [showAddPieceEditModal, setShowAddPieceEditModal] = useState(false);
    const [newPieceInitialData, setNewPieceInitialData] =
        useState<NewPieceInitialData>(makeEmptyNewPieceInitialData);

    const [showAddOutfitModal, setShowAddOutfitModal] = useState(false);

    // Shelf modal state (create / update-items / edit)
    const [showAddShelfModal, setShowAddShelfModal] = useState(false);
    const [shelfModalMode, setShelfModalMode] =
        useState<ShelfModalMode>("create");
    const [activeShelf, setActiveShelf] = useState<ShelfAPI | null>(null);

    // Map pieces/outfits by id
    const piecesById = useMemo(() => {
        const map: Record<string, PieceAPI> = {};
        pieces.forEach((p) => {
            const id = (p as any)._id ?? (p as any).id;
            if (id) map[id] = p;
        });
        return map;
    }, [pieces]);

    const outfitsByIdForShelves = useMemo(() => {
        const map: Record<string, OutfitAPI> = {};
        outfits.forEach((o) => {
            const id = (o as any)._id ?? (o as any).id;
            if (id) map[id] = o;
        });
        return map;
    }, [outfits]);

    // Fetch all user pieces + outfits + shelves
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const loadItems = async () => {
            try {
                setIsLoadingPieces(true);
                setIsLoadingOutfits(true);
                setIsLoadingShelves(true);
                setPiecesError(null);
                setOutfitsError(null);
                setShelvesError(null);

                const [piecesRes, outfitsRes, shelvesRes] = await Promise.all([
                    apiClient.getUserPieces(user.id),
                    apiClient.getUserOutfits(user.id),
                    apiClient.getUserShelves(user.id),
                ]);

                if (cancelled) return;

                setPieces(piecesRes.pieces as PieceAPI[]);
                setOutfits(outfitsRes.outfits as OutfitAPI[]);
                setShelves((shelvesRes as any).shelves as ShelfAPI[]);
            } catch (err) {
                console.error("Failed to load items for locker page", err);
                if (!cancelled) {
                    setPiecesError("Failed to load pieces.");
                    setOutfitsError("Failed to load outfits.");
                    setShelvesError("Failed to load shelves.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPieces(false);
                    setIsLoadingOutfits(false);
                    setIsLoadingShelves(false);
                }
            }
        };

        loadItems();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    // header helpers
    const fullName = user?.name || user?.username || "Your";
    const firstName = fullName.split(" ")[0];
    const possessiveFirstName =
        firstName && firstName.toLowerCase().endsWith("s")
            ? `${firstName}'`
            : `${firstName}'s`;

    const profileImg =
        (user as any)?.profile_img ??
        (user as any)?.avatar_url ??
        "https://api.dicebear.com/7.x/initials/svg?seed=" +
        encodeURIComponent(user?.name || "User") +
        "&backgroundColor=D8D8D8";

    // add piece / outfit handlers
    const openAddPiece = () => {
        setNewPieceInitialData(makeEmptyNewPieceInitialData());
        setShowAddPieceModal(true);
    };

    const closeAddPieceModal = () => setShowAddPieceModal(false);

    const closeAddPieceEditModal = () => {
        setShowAddPieceEditModal(false);
        setNewPieceInitialData(makeEmptyNewPieceInitialData());
    };

    const openAddOutfit = () => setShowAddOutfitModal(true);

    // shelf handlers
    const handleOpenCreateShelf = () => {
        setShelfModalMode("create");
        setActiveShelf(null);
        setShowAddShelfModal(true);
    };

    const handleOpenUpdateShelfItems = (shelf: ShelfAPI) => {
        setShelfModalMode("update-items");
        setActiveShelf(shelf);
        setShowAddShelfModal(true);
    };

    const handleOpenEditShelf = (shelf: ShelfAPI) => {
        setShelfModalMode("edit");
        setActiveShelf(shelf);
        setShowAddShelfModal(true);
    };

    const handleCloseShelfModal = async () => {
        setShowAddShelfModal(false);
        setActiveShelf(null);
        setShelfModalMode("create");

        if (!user) return;
        try {
            const res = await apiClient.getUserShelves(user.id);
            setShelves((res as any).shelves as ShelfAPI[]);
            await refreshUser?.();
        } catch (err) {
            console.error("Failed to refresh shelves after modal close", err);
        }
    };

    const handleDeleteShelf = async (shelfId: string) => {
        if (!user) return;

        try {
            await Promise.all([
                apiClient.removeShelfFromUser(user.id, shelfId),
                apiClient.deleteShelf(shelfId),
            ]);

            await refreshUser?.();
            setShelves((prev) => prev.filter((s) => s._id !== shelfId));
        } catch (err) {
            console.error("Failed to fully delete shelf", err);
        }
    };

    // piece / outfit view & edit handlers (unchanged from your version)
    const handleViewPieceFromGrid = (piece: PieceAPI) => {
        setPieceViewCtx({ piece, fromOutfit: false, parentOutfit: null });
    };

    const handleEditPiece = (piece: PieceAPI) => {
        setEditPiece(piece);
    };

    const handlePieceRemoved = (pieceId: string) => {
        setPieces((prev) =>
            prev.filter(
                (p) => ((p as any)._id ?? (p as any).id) !== pieceId
            )
        );
    };

    const handleViewOutfit = (outfit: OutfitAPI) => setViewOutfit(outfit);

    const handleEditOutfit = (outfit: OutfitAPI) => setEditOutfit(outfit);

    const handleOutfitRemoved = (outfitId: string) => {
        setOutfits((prev) =>
            prev.filter(
                (o) => ((o as any)._id ?? (o as any).id) !== outfitId
            )
        );
    };

    const closePieceView = () => setPieceViewCtx(null);

    const resolveOutfitPieces = (
        outfit: OutfitAPI | null,
        byId: Record<string, PieceAPI>
    ): PieceAPI[] => {
        if (!outfit) return [];
        const raw = ((outfit as any).pieces ?? []) as any[];

        return raw
            .map((entry) => {
                if (
                    entry &&
                    typeof entry === "object" &&
                    "primary_img" in entry
                ) {
                    return entry as PieceAPI;
                }
                if (typeof entry === "string") {
                    return byId[entry] ?? null;
                }
                return null;
            })
            .filter((p): p is PieceAPI => !!p);
    };

    if (!user) {
        return (
            <div className="locker-page">
                <div className="locker-page-content">
                    <p className="caption-copy">
                        You must be logged in to view your locker.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="locker-page locker-main-page">
            <ListPageFilters />

            <div className="locker-page-inner">
                <div className="locker-page-header">
                    <div className="locker-page-header-inner">
                        <div className="locker-page-header-user">
                            <div className="locker-page-user-img-container">
                                <img
                                    className="locker-page-user-img"
                                    src={profileImg}
                                    alt={
                                        (user.name || user.username || "User") +
                                        " FitLockr Profile Image"
                                    }
                                />
                            </div>
                            <h1 className="locker-page-title extrabold-text">
                                {possessiveFirstName} Locker
                            </h1>
                        </div>

                        <div className="locker-page-header-actions">
                            <button
                                type="button"
                                className="button add-piece-button"
                                onClick={openAddPiece}
                            >
                                <p className="body-copy bold-text">Add Piece</p>
                            </button>
                            <button
                                type="button"
                                className="button add-outfit-button"
                                onClick={openAddOutfit}
                            >
                                <p className="body-copy bold-text">
                                    Add Outfit
                                </p>
                            </button>
                        </div>
                    </div>
                    <div className="separator-line"></div>
                </div>

                <div className="locker-page-content">
                    {/* Recent Adds */}
                    <ItemCardCarousel
                        mode="recent-adds"
                        pieces={pieces}
                        outfits={outfits}
                        piecesByIdForOutfits={piecesById}
                        onViewPiece={handleViewPieceFromGrid}
                        onEditPiece={handleEditPiece}
                        onRemovePiece={handlePieceRemoved}
                        onViewOutfit={handleViewOutfit}
                        onEditOutfit={handleEditOutfit}
                        onRemoveOutfit={handleOutfitRemoved}
                        isLoadingRecentItems={isLoadingPieces || isLoadingOutfits}
                    />

                    {/* Shelves carousel */}
                    <ShelfCarousel
                        shelves={shelves}
                        piecesByIdForShelves={piecesById}
                        outfitsByIdForShelves={outfitsByIdForShelves}
                        onOpenCreateShelf={handleOpenCreateShelf}
                        onOpenAddItems={handleOpenUpdateShelfItems}
                        onOpenEditShelf={handleOpenEditShelf}
                        onDeleteShelf={handleDeleteShelf}
                        isLoadingShelves={isLoadingShelves}
                    />

                    {/* Outfits carousel */}
                    <ItemCardCarousel
                        mode="outfits"
                        outfits={outfits}
                        piecesByIdForOutfits={piecesById}
                        onViewOutfit={handleViewOutfit}
                        onEditOutfit={handleEditOutfit}
                        onRemoveOutfit={handleOutfitRemoved}
                        onClickViewAll={() => navigate("/locker/outfits")}
                        onAddOutfit={openAddOutfit}
                        isLoadingOutfits={isLoadingOutfits}
                    />

                    {/* Pieces grid */}
                    <ItemCardCarousel
                        mode="pieces"
                        pieces={pieces}
                        onViewPiece={handleViewPieceFromGrid}
                        onEditPiece={handleEditPiece}
                        onRemovePiece={handlePieceRemoved}
                        onClickViewAll={() => navigate("/locker/pieces")}
                        onAddPiece={openAddPiece}
                        isLoadingPieces={isLoadingPieces}
                    />
                </div>
            </div>




            {/* UNIFIED VIEW PIECE MODAL */}
            {pieceViewCtx && (
                <ViewPieceModal
                    piece={pieceViewCtx.piece}
                    fromOutfit={pieceViewCtx.fromOutfit}
                    onClose={closePieceView}
                    onBackToOutfit={
                        pieceViewCtx.fromOutfit && pieceViewCtx.parentOutfit
                            ? () => {
                                const parent = pieceViewCtx.parentOutfit!;
                                setPieceViewCtx(null);
                                setViewOutfit(parent);
                            }
                            : undefined
                    }
                    onEdit={(p) => {
                        setPieceViewCtx(null);
                        setEditPiece(p);
                    }}
                />
            )}

            {/* VIEW OUTFIT MODAL */}
            {viewOutfit && (
                <ViewOutfitModal
                    outfit={viewOutfit}
                    onClose={() => setViewOutfit(null)}
                    piecesByIdForOutfits={piecesById}
                    onEdit={(o) => {
                        setViewOutfit(null);
                        setEditOutfit(o);
                    }}
                    onOpenPieceFromOutfit={(piece, outfit) => {
                        setViewOutfit(null);
                        setPieceViewCtx({
                            piece,
                            fromOutfit: true,
                            parentOutfit: outfit,
                        });
                    }}
                />
            )}

            {/* EDIT EXISTING PIECE MODAL */}
            {editPiece && (
                <EditPieceModal
                    mode="edit-piece"
                    pieceId={(editPiece as any)._id ?? (editPiece as any).id}
                    initialPrimaryImage={editPiece.primary_img ?? null}
                    initialSecondaryImages={
                        Array.isArray(editPiece.secondary_imgs)
                            ? editPiece.secondary_imgs
                            : []
                    }
                    initialProductUrl={editPiece.product_link ?? ""}
                    initialName={editPiece.name ?? ""}
                    initialBrand={editPiece.brand ?? ""}
                    initialType={editPiece.type ?? null}
                    initialColors={
                        Array.isArray(editPiece.colors) ? editPiece.colors : []
                    }
                    initialOwnership={editPiece.owned ? "owned" : "want"}
                    initialTags={(editPiece as any).tags ?? null}
                    onClose={() => setEditPiece(null)}
                    onPieceUpdated={(updated) => {
                        setPieces((prev) =>
                            prev.map((p) =>
                                ((p as any)._id ?? (p as any).id) ===
                                    ((updated as any)._id ??
                                        (updated as any).id)
                                    ? updated
                                    : p
                            )
                        );
                        setEditPiece(null);
                    }}
                />
            )}

            {/* ADD NEW PIECE FLOW: EditPieceModal in add mode */}
            {showAddPieceEditModal && (
                <EditPieceModal
                    mode="add-piece"
                    pieceId={undefined}
                    initialPrimaryImage={newPieceInitialData.primaryImage}
                    initialSecondaryImages={
                        newPieceInitialData.secondaryImages
                    }
                    initialProductUrl={newPieceInitialData.productUrl}
                    initialName={newPieceInitialData.name}
                    initialBrand={newPieceInitialData.brand}
                    initialType={newPieceInitialData.type}
                    initialColors={newPieceInitialData.colors}
                    initialOwnership={newPieceInitialData.ownership}
                    initialTags={null}
                    onClose={closeAddPieceEditModal}
                    onPieceCreated={(created) => {
                        setPieces((prev) => [created, ...prev]);
                        setShowAddPieceEditModal(false);
                    }}
                />
            )}

            {/* EDIT EXISTING OUTFIT MODAL */}
            {editOutfit && (
                <EditOutfitModal
                    mode="edit-outfit"
                    outfitId={
                        (editOutfit as any)._id ?? (editOutfit as any).id
                    }
                    initialName={editOutfit.name}
                    initialTags={(editOutfit as any).tags ?? null}
                    initialPieces={resolveOutfitPieces(
                        editOutfit,
                        piecesById
                    )}
                    onClose={() => setEditOutfit(null)}
                    onOutfitUpdated={(updatedOutfit) => {
                        setOutfits((prev) =>
                            prev.map((o) =>
                                ((o as any)._id ?? (o as any).id) ===
                                    ((updatedOutfit as any)._id ??
                                        (updatedOutfit as any).id)
                                    ? (updatedOutfit as OutfitAPI)
                                    : o
                            )
                        );
                        setEditOutfit(null);
                    }}
                />
            )}

            {/* ADD NEW OUTFIT MODAL (using EditOutfitModal in add mode) */}
            {showAddOutfitModal && (
                <EditOutfitModal
                    mode="add-outfit"
                    outfitId={undefined}
                    initialName=""
                    initialTags={null}
                    initialPieces={[]}
                    onClose={() => setShowAddOutfitModal(false)}
                    onOutfitCreated={(created) => {
                        setOutfits((prev) => [created, ...prev]);
                        setShowAddOutfitModal(false);
                    }}
                />
            )}

            {/* ADD PIECE ENTRY MODAL (url / image scrape step) */}
            {showAddPieceModal && (
                <AddPieceModal
                    onClose={closeAddPieceModal}
                    onOpenEditWithImage={(imgSrc) => {
                        setNewPieceInitialData({
                            primaryImage: imgSrc,
                            secondaryImages: [],
                            productUrl: null,
                            name: "",
                            brand: "",
                            type: "",
                            colors: [],
                            ownership: "owned",
                        });
                        setShowAddPieceModal(false);
                        setShowAddPieceEditModal(true);
                    }}
                    onValidUrl={({
                        url,
                        primaryImage,
                        secondaryImages,
                        name,
                        brand,
                        type,
                        colors,
                        ownership,
                    }) => {
                        setNewPieceInitialData({
                            primaryImage: primaryImage ?? null,
                            secondaryImages: secondaryImages ?? [],
                            productUrl: url,
                            name: name ?? "",
                            brand: brand ?? "",
                            type: type ?? "",
                            colors: colors ?? [],
                            ownership: ownership ?? "want",
                        });
                        setShowAddPieceModal(false);
                        setShowAddPieceEditModal(true);
                    }}
                />
            )}

            {/* SHELF MODAL */}
            {showAddShelfModal && (
                <AddShelfModal
                    onClose={handleCloseShelfModal}
                    mode={shelfModalMode}
                    shelfId={activeShelf?._id}
                    initialName={activeShelf?.name}
                    initialItems={activeShelf?.items as any}
                />
            )}
        </div>
    );
};

export default Locker;