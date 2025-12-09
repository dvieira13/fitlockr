import "../styles/index.css";
import "../styles/components/listPageHeader.css";
import { Link, useLocation } from "react-router-dom";

const toTitleCaseFromSegment = (segment: string): string => {
    // Drop any file extension just in case (e.g. "pieces.html" → "pieces")
    const noExtension = segment.split(".")[0];

    // Replace "-" and "_" with spaces and title-case each word
    return noExtension
        .split(/[-_]/g)
        .filter(Boolean)
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
};

interface ListPageHeaderProps {
    /** Override the big banner heading (e.g. show full shelf name instead of slug) */
    headingOverride?: string;
    /** Override the label of the LAST breadcrumb item */
    breadcrumbLastLabelOverride?: string;
}

const ListPageHeader: React.FC<ListPageHeaderProps> = ({
    headingOverride,
    breadcrumbLastLabelOverride,
}) => {
    const location = useLocation();

    // Strip query params / hash if somehow present
    const pathWithoutQuery = location.pathname.split("?")[0].split("#")[0];

    // All non-empty segments after the domain
    // e.g. "/locker/pieces" -> ["locker", "pieces"]
    const segments = pathWithoutQuery.split("/").filter(Boolean);

    // Default heading from last segment
    const computedHeading =
        segments.length > 0
            ? toTitleCaseFromSegment(segments[segments.length - 1])
            : "Home";

    // Final heading: override if provided
    const heading = headingOverride || computedHeading;

    // Build breadcrumb data
    const breadcrumbs = segments.map((seg, index) => {
        const url = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;

        // For the LAST crumb, allow label override
        const baseLabel = toTitleCaseFromSegment(seg);
        const label =
            isLast && breadcrumbLastLabelOverride
                ? breadcrumbLastLabelOverride
                : baseLabel;

        return {
            label,
            url,
            isLast,
        };
    });

    return (
        <div className="list-page-header">
            <div className="list-page-banner">
                <h1 className="extrabold-text">{heading}</h1>
            </div>

            <div className="list-page-breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                    <span className="breadcrumb-item" key={crumb.url}>
                        {/* Add ">" separator between items, not before the first */}
                        {index > 0 && (
                            <p className="caption-copy breadcrumb-next">&gt;</p>
                        )}

                        {crumb.isLast ? (
                            // Final crumb is plain text (but with override label if given)
                            <p className="caption-copy">{crumb.label}</p>
                        ) : (
                            // Intermediate crumbs are links
                            <Link
                                className="breadcrumb-link"
                                to={crumb.url}
                                aria-label={`Link to ${crumb.label}`}
                            >
                                <p className="caption-copy">{crumb.label}</p>
                            </Link>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default ListPageHeader;
