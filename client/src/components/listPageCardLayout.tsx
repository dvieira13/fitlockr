// src/components/listPageCardLayout.tsx
import "../styles/index.css";
import "../styles/components/listPageCardLayout.css";

import ItemCard from "./itemCard";
import type { PieceAPI, OutfitAPI } from "../types/types.api";
import type { SortOption, ItemFilter } from "./listPageActions";

type LayoutMode = "pieces" | "outfits" | "mixed";

interface ListPageCardLayoutProps {
    mode: LayoutMode;

    // pieces mode / mixed
    pieces?: PieceAPI[];
    isLoadingPieces?: boolean;
    piecesError?: string | null;
    sortOption?: SortOption;
    filter?: ItemFilter;
    onEditPiece?: (piece: PieceAPI) => void;
    onRemovePiece?: (pieceId: string) => void;
    onViewPiece?: (piece: PieceAPI) => void;

    // outfits mode / mixed
    outfits?: OutfitAPI[];
    isLoadingOutfits?: boolean;
    outfitsError?: string | null;
    onEditOutfit?: (outfit: OutfitAPI) => void;
    onRemoveOutfit?: (outfitId: string) => void;
    onViewOutfit?: (outfit: OutfitAPI) => void;

    /** map of user's pieces for resolving outfit.pieces ids */
    piecesByIdForOutfits?: Record<string, PieceAPI>;

    /** Shelf-only override: delete button removes from shelf instead of DB */
    onDeleteFromShelf?: (args: {
        mode: "pieces" | "outfits";
        pieceId?: string;
        outfitId?: string;
    }) => void;
}

// ---------- Generic helpers ----------

const toTimestamp = (value: any): number => {
    if (!value) return 0;
    const t = new Date(value as any).getTime();
    return Number.isNaN(t) ? 0 : t;
};

function sortEntities<T extends { name?: string | null; created_date?: any }>(
    items: T[],
    sortOption: SortOption = "newest"
): T[] {
    const copy = [...items];

    switch (sortOption) {
        case "newest":
            return copy.sort(
                (a, b) =>
                    toTimestamp((b as any).created_date) -
                    toTimestamp((a as any).created_date)
            );
        case "oldest":
            return copy.sort(
                (a, b) =>
                    toTimestamp((a as any).created_date) -
                    toTimestamp((b as any).created_date)
            );
        case "az":
            return copy.sort((a, b) => {
                const aName = (a.name ?? "").toLowerCase();
                const bName = (b.name ?? "").toLowerCase();
                return aName.localeCompare(bName);
            });
        case "za":
            return copy.sort((a, b) => {
                const aName = (a.name ?? "").toLowerCase();
                const bName = (b.name ?? "").toLowerCase();
                return bName.localeCompare(aName);
            });
        default:
            return copy;
    }
}

// Only ownership-related filters affect pieces
function filterPiecesByFilter<T extends { owned?: boolean }>(
    items: T[],
    filter: ItemFilter = "all"
): T[] {
    if (filter === "owned") {
        return items.filter((item) => item.owned === true);
    }

    if (filter === "want") {
        // "want" -> not owned (explicit false or missing)
        return items.filter(
            (item) => item.owned === false || item.owned === undefined
        );
    }

    // "all", "pieces", "outfits" → do not change the pieces list
    return items;
}

// Mixed item union
type MixedItem =
    | { kind: "piece"; piece: PieceAPI }
    | { kind: "outfit"; outfit: OutfitAPI };

function sortMixed(
    items: MixedItem[],
    sortOption: SortOption = "newest"
): MixedItem[] {
    const getCreated = (item: MixedItem) =>
        item.kind === "piece"
            ? toTimestamp((item.piece as any).created_date)
            : toTimestamp((item.outfit as any).created_date);

    const getName = (item: MixedItem) =>
        (item.kind === "piece" ? item.piece.name : item.outfit.name) ?? "";

    const copy = [...items];

    switch (sortOption) {
        case "newest":
            return copy.sort((a, b) => getCreated(b) - getCreated(a));
        case "oldest":
            return copy.sort((a, b) => getCreated(a) - getCreated(b));
        case "az":
            return copy.sort((a, b) =>
                getName(a).toLowerCase().localeCompare(getName(b).toLowerCase())
            );
        case "za":
            return copy.sort((a, b) =>
                getName(b).toLowerCase().localeCompare(getName(a).toLowerCase())
            );
        default:
            return copy;
    }
}

const ListPageCardLayout: React.FC<ListPageCardLayoutProps> = (props) => {
    const {
        mode,

        pieces = [],
        isLoadingPieces,
        piecesError,
        sortOption = "newest",
        filter = "all",
        onEditPiece,
        onRemovePiece,
        onViewPiece,

        outfits = [],
        isLoadingOutfits,
        outfitsError,
        onEditOutfit,
        onRemoveOutfit,
        onViewOutfit,
        piecesByIdForOutfits,

        onDeleteFromShelf,
    } = props;

    const isPiecesMode = mode === "pieces";
    const isOutfitsMode = mode === "outfits";
    const isMixedMode = mode === "mixed";

    // ---------- Precompute sorted / filtered data ----------

    // Pieces page / pieces portion of mixed
    const filteredPieces = filterPiecesByFilter(pieces, filter);
    const sortedPieces = sortEntities(filteredPieces, sortOption);

    // Outfits are never filtered by ownership in this component
    const sortedOutfits = sortEntities(outfits, sortOption);

    let mixedItems: MixedItem[] = [];

    if (isMixedMode) {
        if (filter === "pieces") {
            // Shelf: only pieces
            mixedItems = sortMixed(
                pieces.map((p) => ({ kind: "piece", piece: p } as const)),
                sortOption
            );
        } else if (filter === "outfits") {
            // Shelf: only outfits
            mixedItems = sortMixed(
                outfits.map((o) => ({ kind: "outfit", outfit: o } as const)),
                sortOption
            );
        } else {
            // "all" (and any ownership filters if ever used here) → show both
            const rawCombined: MixedItem[] = [
                ...pieces.map(
                    (p) => ({ kind: "piece", piece: p } as const)
                ),
                ...outfits.map(
                    (o) => ({ kind: "outfit", outfit: o } as const)
                ),
            ];
            mixedItems = sortMixed(rawCombined, sortOption);
        }
    }

    const containerClassName =
        "list-page-card-container " +
        (isPiecesMode
            ? "pieces-mode"
            : isOutfitsMode
                ? "outfits-mode"
                : "mixed-mode");

    // counts / labels
    const count = isPiecesMode
        ? sortedPieces.length
        : isOutfitsMode
            ? sortedOutfits.length
            : mixedItems.length;

    let label: string;
    if (isPiecesMode) {
        label = count === 1 ? "Piece" : "Pieces";
    } else if (isOutfitsMode) {
        label = count === 1 ? "Outfit" : "Outfits";
    } else {
        label = count === 1 ? "Item" : "Items";
    }

    // ---------- Loading / error / empty ----------

    if (isPiecesMode) {
        if (isLoadingPieces) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">
                            {count} {label}
                        </p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">Loading pieces...</p>
                    </div>
                </div>
            );
        }
        if (piecesError) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">
                            {count} {label}
                        </p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy error-text">
                            {piecesError}
                        </p>
                    </div>
                </div>
            );
        }
        if (!pieces.length) {
            // truly no data for this user
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">0 Pieces</p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">No pieces yet.</p>
                    </div>
                </div>
            );
        }
        // have pieces, but filters might hide them all
        if (!sortedPieces.length) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">0 Pieces</p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">
                            No pieces match your filters.
                        </p>
                    </div>
                </div>
            );
        }
    } else if (isOutfitsMode) {
        if (isLoadingOutfits) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">
                            {count} {label}
                        </p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">Loading outfits...</p>
                    </div>
                </div>
            );
        }
        if (outfitsError) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">
                            {count} {label}
                        </p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy error-text">
                            {outfitsError}
                        </p>
                    </div>
                </div>
            );
        }
        if (!outfits.length) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">0 Outfits</p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">No outfits yet.</p>
                    </div>
                </div>
            );
        }
    } else if (isMixedMode) {
        const baseTotal = pieces.length + outfits.length;

        if (isLoadingPieces || isLoadingOutfits) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">
                            {count} {label}
                        </p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">Loading items...</p>
                    </div>
                </div>
            );
        }

        if (piecesError || outfitsError) {
            const msg =
                piecesError && outfitsError
                    ? `${piecesError} ${outfitsError}`
                    : piecesError || outfitsError || "Failed to load items.";
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">
                            {count} {label}
                        </p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy error-text">{msg}</p>
                    </div>
                </div>
            );
        }

        if (baseTotal === 0) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">0 Items</p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">No items yet.</p>
                    </div>
                </div>
            );
        }

        if (!mixedItems.length) {
            return (
                <div className="list-page-card-layout">
                    <div className="list-page-cards-header">
                        <p className="caption-copy card-count">0 Items</p>
                        <div className="separator-line"></div>
                    </div>
                    <div className={containerClassName}>
                        <p className="caption-copy">
                            No items match your filters.
                        </p>
                    </div>
                </div>
            );
        }
    }

    // ---------- Render pieces-only ----------

    if (isPiecesMode) {
        return (
            <div className="list-page-card-layout">
                <div className="list-page-cards-header">
                    <p className="caption-copy card-count">
                        {count} {label}
                    </p>
                    <div className="separator-line"></div>
                </div>
                <div className={containerClassName}>
                    {sortedPieces.map((piece) => (
                        <ItemCard
                            key={(piece as any)._id ?? (piece as any).id}
                            mode="pieces"
                            piece={piece}
                            onRemovedPiece={onRemovePiece}
                            onEditPiece={onEditPiece}
                            onViewPiece={onViewPiece}
                            // shelf override: if provided, delete only removes from shelf
                            onDeleteFromShelf={onDeleteFromShelf}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // ---------- Render outfits-only ----------

    if (isOutfitsMode) {
        return (
            <div className="list-page-card-layout">
                <div className="list-page-cards-header">
                    <p className="caption-copy card-count">
                        {count} {label}
                    </p>
                    <div className="separator-line"></div>
                </div>
                <div className={containerClassName}>
                    {sortedOutfits.map((outfit) => (
                        <ItemCard
                            key={(outfit as any)._id ?? (outfit as any).id}
                            mode="outfits"
                            outfit={outfit}
                            piecesByIdForOutfits={piecesByIdForOutfits}
                            onEditOutfit={onEditOutfit}
                            onRemovedOutfit={onRemoveOutfit}
                            onViewOutfit={onViewOutfit}
                            onDeleteFromShelf={onDeleteFromShelf}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // ---------- Render mixed mode ----------

    return (
        <div className="list-page-card-layout">
            <div className="list-page-cards-header">
                <p className="caption-copy card-count">
                    {count} {label}
                </p>
                <div className="separator-line"></div>
            </div>
            <div className={containerClassName}>
                {mixedItems.map((item, index) => {
                    if (item.kind === "piece") {
                        const piece = item.piece;
                        return (
                            <ItemCard
                                key={
                                    (piece as any)._id ??
                                    (piece as any).id ??
                                    `piece-${index}`
                                }
                                mode="pieces"
                                piece={piece}
                                onRemovedPiece={onRemovePiece}
                                onEditPiece={onEditPiece}
                                onViewPiece={onViewPiece}
                                onDeleteFromShelf={onDeleteFromShelf}
                            />
                        );
                    }
                    const outfit = item.outfit;
                    return (
                        <ItemCard
                            key={
                                (outfit as any)._id ??
                                (outfit as any).id ??
                                `outfit-${index}`
                            }
                            mode="outfits"
                            outfit={outfit}
                            piecesByIdForOutfits={piecesByIdForOutfits}
                            onEditOutfit={onEditOutfit}
                            onRemovedOutfit={onRemoveOutfit}
                            onViewOutfit={onViewOutfit}
                            onDeleteFromShelf={onDeleteFromShelf}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ListPageCardLayout;
