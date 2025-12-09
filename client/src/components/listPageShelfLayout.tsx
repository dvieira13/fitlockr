// src/components/listPageShelfLayout.tsx
import { useEffect, useMemo, useState } from "react";
import "../styles/index.css";
import "../styles/components/listPageShelfLayout.css";

import { apiClient } from "../apiClient";
import { useUser } from "../context/userContext";
import ListPageShelfContainer from "./listPageShelfContainer";
import type { SortOption } from "./listPageActions";
import type { ShelfAPI, PieceAPI, OutfitAPI } from "../types/types.api";
import type { ShelfItemType } from "../types/types";

interface ListPageShelfLayoutProps {
    sortOption: SortOption;
    onOpenAddItems: (shelf: ShelfAPI) => void;
    onOpenEditShelf: (shelf: ShelfAPI) => void;
    onDeleteShelf?: (shelfId: string) => Promise<void> | void;
    refreshKey: number;
    piecesByIdForOutfits?: Record<string, PieceAPI>;
    onViewPiece?: (piece: PieceAPI) => void;
    onViewOutfit?: (outfit: OutfitAPI) => void;
    onEditPiece?: (piece: PieceAPI) => void;
    onEditOutfit?: (outfit: OutfitAPI) => void;
}

// helpers (same behavior as card layout)
const toTimestamp = (value: any): number => {
    if (!value) return 0;
    const t = new Date(value as any).getTime();
    return Number.isNaN(t) ? 0 : t;
};

function sortShelves(items: ShelfAPI[], sortOption: SortOption): ShelfAPI[] {
    const copy = [...items];

    switch (sortOption) {
        case "newest":
            return copy.sort(
                (a, b) =>
                    toTimestamp(b.created_date) - toTimestamp(a.created_date)
            );
        case "oldest":
            return copy.sort(
                (a, b) =>
                    toTimestamp(a.created_date) - toTimestamp(b.created_date)
            );
        case "az":
            return copy.sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            );
        case "za":
            return copy.sort((a, b) =>
                b.name.toLowerCase().localeCompare(a.name.toLowerCase())
            );
        default:
            return copy;
    }
}

const ListPageShelfLayout: React.FC<ListPageShelfLayoutProps> = ({
    sortOption,
    onOpenAddItems,
    onOpenEditShelf,
    onDeleteShelf,
    refreshKey,
    piecesByIdForOutfits,
    onViewPiece,
    onViewOutfit,
    onEditPiece,
    onEditOutfit,
}) => {
    const { user, refreshUser } = useUser();

    const [shelves, setShelves] = useState<ShelfAPI[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [outfits, setOutfits] = useState<OutfitAPI[]>([]);

    // map for resolving outfits from shelf items
    const outfitsByIdForShelves = useMemo(() => {
        const map: Record<string, OutfitAPI> = {};
        outfits.forEach((o: any) => {
            const id = o._id ?? o.id;
            if (id) {
                map[id] = o;
            }
        });
        return map;
    }, [outfits]);

    // 🔹 Fetch ONLY this user's shelves via /users/:id/shelves
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const fetchShelves = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const res = await apiClient.getUserShelves(user.id);
                if (!cancelled) {
                    setShelves(res.shelves as ShelfAPI[]);
                }
            } catch (err) {
                console.error("Failed to load shelves", err);
                if (!cancelled) {
                    setError("Failed to load shelves.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchShelves();

        return () => {
            cancelled = true;
        };
        // 🔹 re-fetch when refreshKey changes or when user's shelves array changes
    }, [user?.id, (user as any)?.shelves?.length, refreshKey]);

    // Fetch all user's outfits (for full data in view/edit modals)
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const fetchOutfits = async () => {
            try {
                const res = await apiClient.getUserOutfits(user.id);
                if (!cancelled) {
                    setOutfits(res.outfits as OutfitAPI[]);
                }
            } catch (err) {
                console.error("Failed to load outfits for shelf layout", err);
            }
        };

        fetchOutfits();

        return () => {
            cancelled = true;
        };
        // 🔹 include refreshKey so outfits are refreshed after edits
    }, [user?.id, refreshKey]);

    const sortedShelves = useMemo(
        () => sortShelves(shelves, sortOption),
        [shelves, sortOption]
    );

    const handleRemoveShelfItem = async (
        shelfId: string,
        itemId: string,
        itemType: ShelfItemType
    ) => {
        try {
            const res = await apiClient.removeShelfItem({
                shelf_id: shelfId,
                item_id: itemId,
                item_type: itemType,
            });
            const updatedShelf = res.shelf as ShelfAPI;

            setShelves((prev) =>
                prev.map((s) => (s._id === updatedShelf._id ? updatedShelf : s))
            );
        } catch (err) {
            console.error("Failed to remove item from shelf", err);
        }
    };

    const handleDeleteShelf = async (shelfId: string) => {
        // If parent provided a handler, delegate to it
        if (onDeleteShelf) {
            await onDeleteShelf(shelfId);
            // Optimistically update local state
            setShelves((prev) => prev.filter((s) => s._id !== shelfId));
            return;
        }

        // Fallback: delete here (user relation + shelf doc)
        if (!user) return;

        try {
            await Promise.all([
                apiClient.removeShelfFromUser(user.id, shelfId),
                apiClient.deleteShelf(shelfId),
            ]);
            await refreshUser?.();
            setShelves((prev) => prev.filter((s) => s._id !== shelfId));
        } catch (err) {
            console.error("Failed to delete shelf", err);
        }
    };

    if (!user) {
        return (
            <div className="list-page-shelf-layout">
                <p className="caption-copy">
                    You must be logged in to view shelves.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="list-page-shelf-layout">
                <p className="caption-copy">Loading shelves...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="list-page-shelf-layout">
                <p className="caption-copy error-text">{error}</p>
            </div>
        );
    }

    if (!sortedShelves.length) {
        return (
            <div className="list-page-shelf-layout">
                <p className="caption-copy">
                    You don&apos;t have any shelves yet.
                </p>
            </div>
        );
    }

    const count = sortedShelves.length;
    const label = count === 1 ? "Shelf" : "Shelves";

    return (
        <div className="list-page-shelf-layout">
            <div className="list-page-shelf-header">
                <p className="caption-copy shelf-count">
                    {count} {label}
                </p>
                <div className="separator-line"></div>
            </div>
            <div className="list-page-shelf-container-wrapper">
                {sortedShelves.map((shelf) => (
                    <ListPageShelfContainer
                        key={shelf._id}
                        shelf={shelf}
                        piecesByIdForOutfits={piecesByIdForOutfits}
                        outfitsByIdForShelves={outfitsByIdForShelves}
                        onDeleteShelf={handleDeleteShelf}
                        onOpenAddItems={onOpenAddItems}
                        onOpenEditShelf={onOpenEditShelf}
                        onRemoveShelfItem={handleRemoveShelfItem}
                        onViewPiece={onViewPiece}
                        onViewOutfit={onViewOutfit}
                        onEditPiece={onEditPiece}
                        onEditOutfit={onEditOutfit}
                    />
                ))}
            </div>
        </div>
    );
};

export default ListPageShelfLayout;
