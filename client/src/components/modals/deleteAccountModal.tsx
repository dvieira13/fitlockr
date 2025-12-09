// src/components/DeleteAccountModal.tsx
import { useEffect } from "react";
import { useModalBehavior } from "../../utils/useModalBehavior";
import "../../styles/index.css";
import "../../styles/components/modal.css";
import "../../styles/components/deleteAccountModal.css";
import closeicon from "../../assets/icons/close_icon.svg";

interface DeleteAccountModalProps {
    onClose: () => void;
    onDelete: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ onClose, onDelete }) => {

    const { handleOverlayClick } = useModalBehavior(onClose);

    return (
        <div className="modal-wrapper" onClick={handleOverlayClick}>
            <div className="modal-container delete-account-modal">

                <button
                    type="button"
                    className="close-modal-button"
                    onClick={onClose}
                >
                    <img className="close-icon" src={closeicon} alt="Close Icon" />
                </button>

                <div className="modal-content">
                    <p className="body-copy">
                        Are you sure you want to delete your account?
                    </p>
                    <p className="body-copy">This action is irreversible.</p>

                    <button
                        type="button"
                        className="button cancel-button"
                        onClick={onClose}
                    >
                        <p className="caption-copy bold-text">Cancel</p>
                    </button>

                    <p
                        className="caption-copy hyperlink-text delete-button"
                        onClick={onDelete}
                    >
                        Delete Account
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountModal;
