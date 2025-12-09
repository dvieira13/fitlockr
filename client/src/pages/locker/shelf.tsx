import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import "../../styles/index.css";
import "../../styles/pages/lockerPage.css";
import "../../styles/pages/shelf.css";

import ListPageHeader from "../../components/listPageHeader";
import ListPageFilters from "../../components/listPageFilters";
import ListPageActions, {
    SortOption,
    ItemFilter,
} from "../../components/listPageActions";
import ListPageCardLayout from "../../components/listPageCardLayout";
import AddShelfModal from "../../components/modals/addShelfModal";
import EditPieceModal from "../../components/modals/editPieceModal";
import ViewPieceModal from "../../components/modals/viewPieceModal";
import EditOutfitModal from "../../components/modals/editOutfitModal";
import ViewOutfitModal from "../../components/modals/viewOutfitModal";

import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";
import { slugifyShelfName } from "../../utils/shelfSlug";

import type {
    ShelfAPI,
    PieceAPI,
    OutfitAPI,
} from "../../types/types.api";

interface PieceViewContext {
    piece: PieceAPI;
    fromOutfit: boolean;
    parentOutfit?: OutfitAPI | null;
}

const Shelf: React.FC = () => {
    const { shelfSlug } = useParams<{ shelfSlug: string }>();
    const navigate = useNavigate();
    const { user, refreshUser } = useUser();

    const [shelf, setShelf] = useState<ShelfAPI | null>(null);
    const [isLoadingShelf, setIsLoadingShelf] = useState(false);
    const [shelfError, setShelfError] = useState<string | null>(null);

    // full user items
    const [pieces, setPieces] = useState<PieceAPI[]>([]);
    const [outfits, setOutfits] = useState<OutfitAPI[]>([]);

    // loading / error for items (for ListPageCardLayout)
    const [isLoadingPieces, setIsLoadingPieces] = useState(false);
    const [piecesError, setPiecesError] = useState<string | null>(null);
    const [isLoadingOutfits, setIsLoadingOutfits] = useState(false);
    const [outfitsError, setOutfitsError] = useState<string | null>(null);

    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [filter, setFilter] = useState<ItemFilter>("all");

    // shelf modal
    const [showAddShelfModal, setShowAddShelfModal] = useState(false);
    const [shelfModalMode, setShelfModalMode] =
        useState<"update-items" | "edit">("update-items");

    // edit / view states
    const [editPiece, setEditPiece] = useState<PieceAPI | null>(null);
    const [viewOutfit, setViewOutfit] = useState<OutfitAPI | null>(null);
    const [editOutfit, setEditOutfit] = useState<OutfitAPI | null>(null);

    // ✅ unified piece view (from shelf or from outfit)
    const [pieceViewCtx, setPieceViewCtx] = useState<PieceViewContext | null>(
        null
    );

    // resolve pieces map (for outfits & shelf items)
    const piecesById = useMemo(() => {
        const map: Record<string, PieceAPI> = {};
        pieces.forEach((p) => {
            const id = (p as any)._id ?? (p as any).id;
            if (id) map[id] = p;
        });
        return map;
    }, [pieces]);

    const outfitsById = useMemo(() => {
        const map: Record<string, OutfitAPI> = {};
        outfits.forEach((o) => {
            const id = (o as any)._id ?? (o as any).id;
            if (id) map[id] = o;
        });
        return map;
    }, [outfits]);

    // fetch user's shelves, then resolve which one matches slug
    useEffect(() => {
        if (!user || !shelfSlug) return;

        let cancelled = false;

        const loadShelf = async () => {
            try {
                setIsLoadingShelf(true);
                setShelfError(null);

                const res = await apiClient.getUserShelves(user.id);
                if (cancelled) return;

                const shelves = (res.shelves || []) as ShelfAPI[];
                const found = shelves.find((s) => {
                    const name = s.name || "";
                    return slugifyShelfName(name) === shelfSlug;
                });

                if (!found) {
                    setShelfError("Shelf not found.");
                    setShelf(null);
                    return;
                }

                setShelf(found);
            } catch (err) {
                console.error("Failed to load shelf", err);
                if (!cancelled) {
                    setShelfError("Failed to load shelf.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingShelf(false);
                }
            }
        };

        loadShelf();

        return () => {
            cancelled = true;
        };
    }, [user?.id, shelfSlug]);

    // fetch user's pieces/outfits for full data
    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const loadItems = async () => {
            try {
                setIsLoadingPieces(true);
                setIsLoadingOutfits(true);
                setPiecesError(null);
                setOutfitsError(null);

                const [piecesRes, outfitsRes] = await Promise.all([
                    apiClient.getUserPieces(user.id),
                    apiClient.getUserOutfits(user.id),
                ]);
                if (cancelled) return;

                setPieces(piecesRes.pieces as PieceAPI[]);
                setOutfits(outfitsRes.outfits as OutfitAPI[]);
            } catch (err) {
                console.error("Failed to load items for shelf page", err);
                if (!cancelled) {
                    setPiecesError("Failed to load pieces for this shelf.");
                    setOutfitsError("Failed to load outfits for this shelf.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPieces(false);
                    setIsLoadingOutfits(false);
                }
            }
        };

        loadItems();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const resolveOutfitPieces = (
        outfit: OutfitAPI | null,
        piecesBy: Record<string, PieceAPI>
    ): PieceAPI[] => {
        if (!outfit) return [];
        const raw = ((outfit as any).pieces ?? []) as any[];

        return raw
            .map((entry) => {
                if (entry && typeof entry === "object" && "primary_img" in entry) {
                    return entry as PieceAPI;
                }
                if (typeof entry === "string") {
                    return piecesBy[entry] ?? null;
                }
                return null;
            })
            .filter((p): p is PieceAPI => !!p);
    };

    // build items for card layout (piece + outfit cards)
    const shelfItemsForCards = useMemo(() => {
        if (!shelf) {
            return { pieces: [] as PieceAPI[], outfits: [] as OutfitAPI[] };
        }

        const shelfItems = Array.isArray(shelf.items) ? shelf.items : [];

        const shelfPieces: PieceAPI[] = [];
        const shelfOutfits: OutfitAPI[] = [];

        shelfItems.forEach((si: any) => {
            const type = si.item_type;
            const raw = si.item_id;

            if (type === "Piece") {
                const id =
                    typeof raw === "string"
                        ? raw
                        : (raw as any)?._id ?? (raw as any)?.id;
                const piece =
                    (id && piecesById[id]) ||
                    ((raw && typeof raw === "object" && "primary_img" in raw
                        ? (raw as PieceAPI)
                        : null) as PieceAPI | null);
                if (piece) shelfPieces.push(piece);
            } else if (type === "Outfit") {
                const id =
                    typeof raw === "string"
                        ? raw
                        : (raw as any)?._id ?? (raw as any)?.id;
                const outfit =
                    (id && outfitsById[id]) ||
                    ((raw && typeof raw === "object" && "name" in raw
                        ? (raw as OutfitAPI)
                        : null) as OutfitAPI | null);
                if (outfit) shelfOutfits.push(outfit);
            }
        });

        return {
            pieces: shelfPieces,
            outfits: shelfOutfits,
        };
    }, [shelf, piecesById, outfitsById]);

    // open shelf modal
    const openUpdateItems = () => {
        if (!shelf) return;
        setShelfModalMode("update-items");
        setShowAddShelfModal(true);
    };

    const openEditShelf = () => {
        if (!shelf) return;
        setShelfModalMode("edit");
        setShowAddShelfModal(true);
    };

    const closeShelfModal = () => {
        setShowAddShelfModal(false);
    };

    // DELETE shelf -> same behavior as from list
    const handleDeleteShelf = async () => {
        if (!user || !shelf) return;
        try {
            await Promise.all([
                apiClient.removeShelfFromUser(user.id, shelf._id),
                apiClient.deleteShelf(shelf._id),
            ]);
            await refreshUser?.();
            navigate("/locker/shelves");
        } catch (err) {
            console.error("Failed to delete shelf", err);
        }
    };

    // remove item from this shelf (piece)
    const handleRemovePieceFromShelf = async (pieceId: string) => {
        if (!shelf) return;
        try {
            const res = await apiClient.removeShelfItem({
                shelf_id: shelf._id,
                item_id: pieceId,
                item_type: "Piece",
            });
            setShelf(res.shelf as ShelfAPI);
        } catch (err) {
            console.error("Failed to remove piece from shelf", err);
        }
    };

    // remove item from this shelf (outfit)
    const handleRemoveOutfitFromShelf = async (outfitId: string) => {
        if (!shelf) return;
        try {
            const res = await apiClient.removeShelfItem({
                shelf_id: shelf._id,
                item_id: outfitId,
                item_type: "Outfit",
            });
            setShelf(res.shelf as ShelfAPI);
        } catch (err) {
            console.error("Failed to remove outfit from shelf", err);
        }
    };

    // Item interactions
    const handleViewPiece = (piece: PieceAPI) => {
        setPieceViewCtx({ piece, fromOutfit: false, parentOutfit: null });
    };

    const handleEditPiece = (piece: PieceAPI) => {
        setEditPiece(piece);
    };

    const handleViewOutfit = (outfit: OutfitAPI) => {
        setViewOutfit(outfit);
    };

    const handleEditOutfit = (outfit: OutfitAPI) => {
        setEditOutfit(outfit);
    };

    const closePieceView = () => {
        setPieceViewCtx(null);
    };

    // used by ItemCard delete on shelf page
    const handleDeleteItemFromShelf = async (args: {
        mode: "pieces" | "outfits";
        pieceId?: string;
        outfitId?: string;
    }) => {
        if (!shelf) return;

        if (args.mode === "pieces" && args.pieceId) {
            await handleRemovePieceFromShelf(args.pieceId);
        } else if (args.mode === "outfits" && args.outfitId) {
            await handleRemoveOutfitFromShelf(args.outfitId);
        }
    };


    if (!user) {
        return (
            <div className="locker-page pieces-page">
                <div className="locker-page-content">
                    <p className="caption-copy">
                        You must be logged in to view this shelf.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoadingShelf) {
        return (
            <div className="locker-page pieces-page">
                <div className="locker-page-content">
                    <p className="caption-copy">Loading shelf...</p>
                </div>
            </div>
        );
    }

    if (shelfError || !shelf) {
        return (
            <div className="locker-page pieces-page">
                <div className="locker-page-content">
                    <p className="caption-copy error-text">
                        {shelfError || "Shelf not found."}
                    </p>
                </div>
            </div>
        );
    }

    const shelfName = shelf.name || "Shelf";

    return (
        <div className="locker-page shelf-page">
            <div className="list-page-header-container mobile-only">
                <ListPageHeader
                    headingOverride={shelfName}
                    breadcrumbLastLabelOverride={shelfName}
                />
            </div>
            <ListPageFilters />

            <div className="locker-page-content">
                <div className="list-page-header-container desktop-only">
                    <ListPageHeader
                        headingOverride={shelfName}
                        breadcrumbLastLabelOverride={shelfName}
                    />
                </div>
                <ListPageActions
                    sortOption={sortOption}
                    onChangeSort={setSortOption}
                    filter={filter}
                    onChangeFilter={setFilter}
                    onAddShelfItem={openUpdateItems}
                />

                <div className="single-shelf-header-bar">
                    <button
                        type="button"
                        className="button edit-button"
                        onClick={openEditShelf}
                    >
                        <p className="caption-copy bold-text">Rename Shelf</p>
                    </button>
                    <button
                        type="button"
                        className="button delete-button"
                        onClick={handleDeleteShelf}
                    >
                        <p className="caption-copy bold-text">
                            Delete Shelf
                        </p>
                    </button>
                </div>

                {/* Reuse card layout: pieces + outfits from this shelf */}
                <ListPageCardLayout
                    mode="mixed"
                    pieces={shelfItemsForCards.pieces}
                    outfits={shelfItemsForCards.outfits}
                    // loading / error for both collections
                    isLoadingPieces={isLoadingPieces}
                    piecesError={piecesError}
                    isLoadingOutfits={isLoadingOutfits}
                    outfitsError={outfitsError}
                    // sort & filters
                    sortOption={sortOption}
                    filter={filter}
                    // piece callbacks
                    onEditPiece={handleEditPiece}
                    onRemovePiece={handleRemovePieceFromShelf}
                    onViewPiece={handleViewPiece}
                    // outfit callbacks
                    onEditOutfit={handleEditOutfit}
                    onRemoveOutfit={handleRemoveOutfitFromShelf}
                    onViewOutfit={handleViewOutfit}
                    // for resolving outfit.pieces → images
                    piecesByIdForOutfits={piecesById}
                    // 🔹 delete on shelf page only removes from shelf
                    onDeleteFromShelf={handleDeleteItemFromShelf}
                />
            </div>

            {/* SHELF MODAL */}
            {showAddShelfModal && shelf && (
                <AddShelfModal
                    onClose={closeShelfModal}
                    mode={shelfModalMode}
                    shelfId={shelf._id}
                    initialName={shelf.name}
                    initialItems={shelf.items as any}
                    onShelfRenamed={(newName) => {
                        // update local shelf state so header + breadcrumb use new name
                        setShelf((prev) =>
                            prev ? ({ ...prev, name: newName } as ShelfAPI) : prev
                        );

                        // update URL slug if it changed
                        const newSlug = slugifyShelfName(newName);
                        if (newSlug && newSlug !== shelfSlug) {
                            navigate(`/locker/shelves/${newSlug}`, { replace: true });
                        }
                    }}
                    onShelfItemsUpdated={(updatedItems) => {
                        // keep local shelf.items in sync so the card layout + sort update
                        setShelf((prev) =>
                            prev ? ({ ...prev, items: updatedItems } as ShelfAPI) : prev
                        );
                    }}
                />
            )}

            {/* UNIFIED VIEW PIECE MODAL */}
            {pieceViewCtx && (
                <ViewPieceModal
                    piece={pieceViewCtx.piece}
                    fromOutfit={pieceViewCtx.fromOutfit}
                    onClose={closePieceView}
                    onBackToOutfit={
                        pieceViewCtx.fromOutfit &&
                            pieceViewCtx.parentOutfit
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

            {/* EDIT PIECE MODAL */}
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
                                    ((updated as any)._id ?? (updated as any).id)
                                    ? updated
                                    : p
                            )
                        );
                        setEditPiece(null);
                    }}
                />
            )}

            {/* EDIT OUTFIT MODAL */}
            {editOutfit && (
                <EditOutfitModal
                    mode="edit-outfit"
                    outfitId={
                        (editOutfit as any)._id ?? (editOutfit as any).id
                    }
                    initialName={editOutfit.name}
                    initialTags={(editOutfit as any).tags ?? null}
                    initialPieces={resolveOutfitPieces(editOutfit, piecesById)}
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
        </div>
    );
};

export default Shelf;
