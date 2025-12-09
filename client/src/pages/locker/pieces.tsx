// src/pages/locker/Pieces.tsx
import { useEffect, useState } from "react";
import "../../styles/index.css";
import "../../styles/pages/lockerPage.css";
import "../../styles/pages/pieces.css";
import ListPageHeader from "../../components/listPageHeader";
import ListPageFilters from "../../components/listPageFilters";
import ListPageActions, {
    SortOption,
    ItemFilter,
} from "../../components/listPageActions";
import ListPageCardLayout from "../../components/listPageCardLayout";
import AddPieceModal from "../../components/modals/addPieceModal";
import EditPieceModal from "../../components/modals/editPieceModal";
import ViewPieceModal from "../../components/modals/viewPieceModal"; // NEW
import { useUser } from "../../context/userContext";
import { apiClient } from "../../apiClient";
import type { PieceAPI } from "../../types/types.api";

type EditMode = "add-piece" | "edit-piece";

interface EditInitialData {
    primaryImage: string | null;
    secondaryImages: string[];
    productUrl: string | null;
    name: string;
    brand: string;
    type: string;
    colors: string[];
    ownership: "owned" | "want";
}

const Pieces = () => {
    const { user } = useUser();

    const [pieces, setPieces] = useState<PieceAPI[]>([]);
    const [isLoadingPieces, setIsLoadingPieces] = useState(false);
    const [piecesError, setPiecesError] = useState<string | null>(null);

    const [showAddPieceModal, setShowAddPieceModal] = useState(false);
    const [showEditPieceModal, setShowEditPieceModal] = useState(false);

    const [editMode, setEditMode] = useState<EditMode>("add-piece");

    const [editInitialData, setEditInitialData] = useState<EditInitialData>({
        primaryImage: null,
        secondaryImages: [],
        productUrl: null,
        name: "",
        brand: "",
        type: "",
        colors: [],
        ownership: "owned",
    });

    const [editingPieceId, setEditingPieceId] = useState<string | undefined>(
        undefined
    );

    const [sortOption, setSortOption] = useState<SortOption>("newest");
    const [filter, setFilter] = useState<ItemFilter>("all");

    const [viewPiece, setViewPiece] = useState<PieceAPI | null>(null);

    const editingPiece =
        editingPieceId && pieces.length
            ? pieces.find(
                (p) =>
                    (p as any)._id === editingPieceId ||
                    (p as any).id === editingPieceId
            ) ?? null
            : null;


    // Fetch user's pieces
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const loadPieces = async () => {
            try {
                setIsLoadingPieces(true);
                setPiecesError(null);
                const res = await apiClient.getUserPieces(user.id);
                if (!cancelled) {
                    setPieces(res.pieces as PieceAPI[]);
                }
            } catch (err) {
                console.error("Failed to load user pieces", err);
                if (!cancelled) {
                    setPiecesError("Failed to load pieces.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPieces(false);
                }
            }
        };

        loadPieces();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const openAddPieceModal = () => {
        setEditMode("add-piece");
        setEditingPieceId(undefined);
        setShowAddPieceModal(true);
    };

    const closeAddPieceModal = () => {
        setShowAddPieceModal(false);
    };

    const closeEditPieceModal = () => {
        setShowEditPieceModal(false);
        setEditingPieceId(undefined);
        setEditInitialData({
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

    // When clicking Edit on a card OR from view modal
    const handleEditPieceFromCard = (piece: PieceAPI) => {
        setEditMode("edit-piece");
        setEditingPieceId(piece._id);

        setEditInitialData({
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

    // When a piece is deleted from a card
    const handlePieceRemoved = (pieceId: string) => {
        setPieces((prev) => prev.filter((p) => p._id !== pieceId));
    };

    // when a piece is created from EditPieceModal
    const handlePieceCreated = (piece: PieceAPI) => {
        setPieces((prev) => [piece, ...prev]);
    };

    // when a piece is updated from EditPieceModal
    const handlePieceUpdated = (updated: PieceAPI) => {
        setPieces((prev) =>
            prev.map((p) => (p._id === updated._id ? updated : p))
        );
    };

    // NEW: when clicking anywhere on card (except overlay buttons)
    const handleViewPiece = (piece: PieceAPI) => {
        setViewPiece(piece);
    };

    const handleCloseViewPiece = () => {
        setViewPiece(null);
    };

    return (
        <div className="locker-page pieces-page">
            <div className="list-page-header-container mobile-only">
                <ListPageHeader />
            </div>
            <ListPageFilters />

            <div className="locker-page-content">
                <div className="list-page-header-container desktop-only">
                    <ListPageHeader />
                </div>
                <ListPageActions
                    onAddPiece={openAddPieceModal}
                    sortOption={sortOption}
                    onChangeSort={setSortOption}
                    filter={filter}
                    onChangeFilter={setFilter}
                />

                <ListPageCardLayout
                    mode="pieces"
                    pieces={pieces}
                    isLoadingPieces={isLoadingPieces}
                    piecesError={piecesError}
                    onEditPiece={handleEditPieceFromCard}
                    onRemovePiece={handlePieceRemoved}
                    sortOption={sortOption}
                    filter={filter}
                    onViewPiece={handleViewPiece} // NEW
                />
            </div>

            {showAddPieceModal && (
                <AddPieceModal
                    onClose={closeAddPieceModal}
                    onOpenEditWithImage={(imgSrc) => {
                        setEditMode("add-piece");
                        setEditingPieceId(undefined);
                        setEditInitialData({
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
                        setShowEditPieceModal(true);
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
                        setEditMode("add-piece");
                        setEditingPieceId(undefined);
                        setEditInitialData({
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
                        setShowEditPieceModal(true);
                    }}
                />
            )}

            {showEditPieceModal && (
                <EditPieceModal
                    onClose={closeEditPieceModal}
                    mode={editMode}
                    pieceId={editingPieceId}
                    initialPrimaryImage={editInitialData.primaryImage}
                    initialProductUrl={editInitialData.productUrl}
                    initialSecondaryImages={editInitialData.secondaryImages}
                    initialName={editInitialData.name}
                    initialBrand={editInitialData.brand}
                    initialType={editInitialData.type}
                    initialColors={editInitialData.colors}
                    initialOwnership={editInitialData.ownership}
                    initialTags={
                        editMode === "edit-piece" && editingPiece
                            ? ((editingPiece as any).tags ?? null)
                            : null
                    }
                    onPieceCreated={handlePieceCreated}
                    onPieceUpdated={handlePieceUpdated}
                />
            )}

            {viewPiece && (
                <ViewPieceModal
                    piece={viewPiece}
                    onClose={handleCloseViewPiece}
                    onEdit={(piece) => {
                        handleEditPieceFromCard(piece);
                        setViewPiece(null);
                    }}
                />
            )}
        </div>
    );
};

export default Pieces;
