// src/pages/locker/Shelves.tsx
import { useEffect, useMemo, useState } from "react";
import "../../styles/index.css";
import "../../styles/pages/lockerPage.css";
import "../../styles/pages/shelves.css";

import ListPageHeader from "../../components/listPageHeader";
import ListPageActions, {
    SortOption,
} from "../../components/listPageActions";
import ListPageShelfLayout from "../../components/listPageShelfLayout";
import AddShelfModal from "../../components/modals/addShelfModal";

import EditPieceModal from "../../components/modals/editPieceModal";
import ViewPieceModal from "../../components/modals/viewPieceModal";
import EditOutfitModal from "../../components/modals/editOutfitModal";
import ViewOutfitModal from "../../components/modals/viewOutfitModal";

import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";

import type { ShelfAPI, PieceAPI, OutfitAPI } from "../../types/types.api";

type ShelfModalMode = "create" | "update-items" | "edit";

interface PieceViewContext {
    piece: PieceAPI;
    fromOutfit: boolean;
    parentOutfit?: OutfitAPI | null;
}

const Shelves = () => {
    const { user, refreshUser } = useUser();

    const [showAddShelfModal, setShowAddShelfModal] = useState(false);
    const [shelfModalMode, setShelfModalMode] =
        useState<ShelfModalMode>("create");
    const [activeShelf, setActiveShelf] = useState<ShelfAPI | null>(null);

    const [sortOption, setSortOption] = useState<SortOption>("newest");

    // force ListPageShelfLayout to re-fetch shelves
    const [shelvesRefreshKey, setShelvesRefreshKey] = useState(0);

    // view/edit item state
    const [editPiece, setEditPiece] = useState<PieceAPI | null>(null);
    const [viewOutfit, setViewOutfit] = useState<OutfitAPI | null>(null);
    const [editOutfit, setEditOutfit] = useState<OutfitAPI | null>(null);

    // ✅ unified piece view (from cards OR from outfit)
    const [pieceViewCtx, setPieceViewCtx] = useState<PieceViewContext | null>(
        null
    );

    // Fetch all user's pieces for resolving outfits (used by shelves + modals)
    const [pieces, setPieces] = useState<PieceAPI[]>([]);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const fetchPieces = async () => {
            try {
                const res = await apiClient.getUserPieces(user.id);
                if (!cancelled) {
                    setPieces(res.pieces as PieceAPI[]);
                }
            } catch (err) {
                console.error("Failed to load pieces for shelves page", err);
            }
        };

        fetchPieces();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const piecesByIdForOutfits = useMemo(() => {
        const map: Record<string, PieceAPI> = {};
        pieces.forEach((p) => {
            const id = (p as any)._id ?? (p as any).id;
            if (id) {
                map[id] = p;
            }
        });
        return map;
    }, [pieces]);

    const resolveOutfitPieces = (
        outfit: OutfitAPI | null,
        piecesById: Record<string, PieceAPI>
    ): PieceAPI[] => {
        if (!outfit) return [];

        const raw = ((outfit as any).pieces ?? []) as any[];

        return raw
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
    };

    // ─────────────────────────────
    // SHELF MODAL OPEN/CLOSE
    // ─────────────────────────────
    const handleOpenCreateShelf = () => {
        setShelfModalMode("create");
        setActiveShelf(null);
        setShowAddShelfModal(true);
    };

    const handleOpenUpdateItems = (shelf: ShelfAPI) => {
        setShelfModalMode("update-items");
        setActiveShelf(shelf);
        setShowAddShelfModal(true);
    };

    const handleOpenEditShelf = (shelf: ShelfAPI) => {
        setShelfModalMode("edit");
        setActiveShelf(shelf);
        setShowAddShelfModal(true);
    };

    const handleCloseModal = () => {
        setShowAddShelfModal(false);
        setActiveShelf(null);
        setShelfModalMode("create");
        setShelvesRefreshKey((prev) => prev + 1);
    };

    // DELETE SHELF (user + shelves collection)
    const handleDeleteShelf = async (shelfId: string) => {
        if (!user) return;

        try {
            await Promise.all([
                apiClient.removeShelfFromUser(user.id, shelfId),
                apiClient.deleteShelf(shelfId),
            ]);

            await refreshUser?.();
            setShelvesRefreshKey((prev) => prev + 1);
        } catch (err) {
            console.error("Failed to fully delete shelf", err);
        }
    };

    // ─────────────────────────────
    // ITEMCARD CALLBACKS
    // ─────────────────────────────
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

    // close unified piece view
    const closePieceView = () => {
        setPieceViewCtx(null);
    };

    return (
        <div className="locker-page shelves-page">
            <div className="locker-page-content">
                <ListPageHeader />
                <ListPageActions
                    onAddShelf={handleOpenCreateShelf}
                    sortOption={sortOption}
                    onChangeSort={setSortOption}
                />
                <ListPageShelfLayout
                    sortOption={sortOption}
                    onOpenAddItems={handleOpenUpdateItems}
                    onOpenEditShelf={handleOpenEditShelf}
                    onDeleteShelf={handleDeleteShelf}
                    refreshKey={shelvesRefreshKey}
                    piecesByIdForOutfits={piecesByIdForOutfits}
                    onViewPiece={handleViewPiece}
                    onViewOutfit={handleViewOutfit}
                    onEditPiece={handleEditPiece}
                    onEditOutfit={handleEditOutfit}
                />
            </div>

            {/* SHELF MODAL */}
            {showAddShelfModal && (
                <AddShelfModal
                    onClose={handleCloseModal}
                    mode={shelfModalMode}
                    shelfId={activeShelf?._id}
                    initialName={activeShelf?.name}
                    initialItems={activeShelf?.items as any}
                />
            )}

            {/* UNIFIED VIEW PIECE MODAL (card or from outfit) */}
            {pieceViewCtx && (
                <ViewPieceModal
                    piece={pieceViewCtx.piece}
                    fromOutfit={pieceViewCtx.fromOutfit}
                    onClose={closePieceView}
                    onBackToOutfit={
                        pieceViewCtx.fromOutfit &&
                            pieceViewCtx.parentOutfit
                            ? () => {
                                // close piece modal and reopen outfit modal
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
                    piecesByIdForOutfits={piecesByIdForOutfits}
                    onEdit={(o) => {
                        setViewOutfit(null);
                        setEditOutfit(o);
                    }}
                    onOpenPieceFromOutfit={(piece, outfit) => {
                        // close outfit modal, open piece modal in from-outfit mode
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
                    onClose={() => setEditPiece(null)}
                    initialTags={(editPiece as any).tags ?? null}
                    onPieceUpdated={(updated) => {
                        // keep pieces cache for outfit resolver in sync
                        setPieces((prev) =>
                            prev.map((p) => {
                                const prevId = (p as any)._id ?? (p as any).id;
                                const updatedId =
                                    (updated as any)._id ??
                                    (updated as any).id;
                                return prevId === updatedId ? updated : p;
                            })
                        );
                        setEditPiece(null);
                        setShelvesRefreshKey((prev) => prev + 1);
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
                    initialPieces={resolveOutfitPieces(
                        editOutfit,
                        piecesByIdForOutfits
                    )}
                    onClose={() => setEditOutfit(null)}
                    onOutfitUpdated={() => {
                        setEditOutfit(null);
                        setShelvesRefreshKey((prev) => prev + 1);
                    }}
                />
            )}
        </div>
    );
};

export default Shelves;
