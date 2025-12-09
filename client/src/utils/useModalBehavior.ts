// src/utils/useModalBehavior.ts
import { useEffect, useCallback } from "react";

export const useModalBehavior = (onClose: () => void) => {
    // 🔒 Disable background scroll while modal is open
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Close when clicking outside the modal content
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    return { handleOverlayClick };
};
