import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import io from "socket.io-client";
import { useUser } from "../../context/userContext";
import "../../styles/index.css";
import "../../styles/confirmation.css";
import "../../styles/chat.css";
import EventCardConfirmation from "../../components/eventCardConfirmation";
import { EventWithQuantity } from "../../types/types";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:4005");

const Confirmation = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    const [purchasedEvents, setPurchasedEvents] = useState<EventWithQuantity[]>([]);
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState<{ user: string; message: string; time: string }[]>([]);
    const username = user?.name || "Guest";

    // Load purchased events
    useEffect(() => {
        const purchasedItems: EventWithQuantity[] = location.state?.purchasedItems || [];
        setPurchasedEvents(purchasedItems);
    }, [location.state]);

    // Join global confirmation chatroom
    useEffect(() => {
        socket.emit("joinRoom", "confirmationRoom");

        socket.on("chatHistory", (history) => setChat(history));
        socket.on("receiveMessage", (msg) => setChat((prev) => [...prev, msg]));

        return () => {
            socket.off("chatHistory");
            socket.off("receiveMessage");
        };
    }, []);

    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    // Send message
    const sendMessage = () => {
        if (!message.trim()) return;

        socket.emit("sendMessage", {
            roomId: "confirmationRoom",
            user: username,
            message,
        });
        setMessage("");
    };

    if (!purchasedEvents || purchasedEvents.length === 0) {
        return (
            <div className="confirmation-page">
                <div className="confirmation-page-header">
                    <button className="back-button" onClick={() => navigate("/")}>
                        <p className="body-copy bold-text">Back to Events</p>
                    </button>
                    <h1>Confirmation</h1>
                </div>
                <p className="empty-confirmation-message">No recent purchases found.</p>
                <button className="view-events-button button" onClick={() => navigate("/")}>
                    <p className="body-copy bold-text">View Events</p>
                </button>
            </div>
        );
    }

    return (
        <div className="confirmation-page">
            <div className="confirmation-page-header">
                <button className="back-button" onClick={() => navigate("/")}>
                    <p className="body-copy bold-text">Back to Events</p>
                </button>
                <h1>Confirmation</h1>
            </div>

            <div className="confirmation-wrapper">
                {/* Purchased Events */}
                <div className="confirmation-container">
                    {purchasedEvents.map((event) => (
                        <EventCardConfirmation key={event.event_id._id} event={event} />
                    ))}
                </div>

                {/* Chatroom */}
                <div className="chatroom">
                    <h3>Chat with other customers:</h3>
                    <div className="chat-box">
                        {chat.map((msg, i) => (
                            <div
                                key={i}
                                className={`chat-message ${msg.user === username ? "own-message" : "other-message"
                                    }`}
                            >
                                <div className="chat-text">
                                    <strong>{msg.user === username ? "You" : msg.user}:</strong> {msg.message}
                                </div>
                                <div className="chat-time">
                                    {new Date(msg.time).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                            </div>
                        ))}
                        {/* Invisible div to scroll into view */}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input">
                        <input
                            type="text"
                            value={message}
                            placeholder="Type your message..."
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        />
                        <button className="button send-button" onClick={sendMessage}>
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Confirmation;
