import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/index.css";
import "../styles/cart.css";
import { apiClient } from "../apiClient";
import { useUser } from "../context/userContext";
import EventCardCart from "../components/eventCardCart";
import { EventWithQuantity, Event } from "../types/types";

const Cart = () => {
    const { user, setUser } = useUser();
    const navigate = useNavigate();
    const [cartEvents, setCartEvents] = useState<EventWithQuantity[]>([]);
    const [loading, setLoading] = useState(true);
    const [ticketQuantity, setTicketQuantity] = useState(1);

    useEffect(() => {
        let isMounted = true;

        const fetchCartEvents = async () => {
            // Don’t block navigation while user context loads
            if (!user) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                const res = await apiClient.getEvents();
                const allEvents: Event[] = res.events.map(e => ({
                    _id: e._id,
                    name: e.name,
                    slogan: e.slogan,
                    primary_img_src: e.primary_img_src,
                    alt_img_srcs: e.alt_img_srcs,
                    city: e.city,
                    date: new Date(e.date),
                    time: e.time,
                }));

                const mapped: EventWithQuantity[] = user.carted_events
                    ?.map(item => {
                        const eventId =
                            typeof item.event_id === "string"
                                ? item.event_id
                                : item.event_id._id;
                        const fullEvent = allEvents.find(e => e._id === eventId);
                        if (!fullEvent) return null;

                        return {
                            event_id: fullEvent,
                            ticket_quantity: item.ticket_quantity,
                        };
                    })
                    .filter(Boolean) as EventWithQuantity[];

                if (isMounted) setCartEvents(mapped);
            } catch (err) {
                await apiClient.addLogToServer("error", "Failed to load cart events", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchCartEvents();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleRemove = async (id: string) => {
        if (!user) return;

        const updatedCart = cartEvents.filter(e => e.event_id._id !== id);
        const updatedUserCart = updatedCart.map(e => ({
            event_id: e.event_id,
            ticket_quantity: e.ticket_quantity,
        }));

        try {
            await apiClient.updateUserPartial({
                id: user.id,
                carted_events: updatedUserCart,
            });
            setCartEvents(updatedCart);
            setUser({ ...user, carted_events: updatedUserCart });
        } catch (err) {
            await apiClient.addLogToServer("error", "Failed to remove event", err);
        }
    };

    const handleCheckout = async () => {
        if (!user || cartEvents.length === 0) return;

        try {
            // Create a transaction for each event
            for (const item of cartEvents) {
                await apiClient.createTransaction({
                    user_id: user.id,
                    event_id: item.event_id._id,
                    ticket_quantity: item.ticket_quantity,
                });
            }

            // Merge cart events into purchased_events
            const updatedPurchased = [...(user.purchased_events || [])];

            for (const item of cartEvents) {
                const existing = updatedPurchased.find(p => p.event_id._id === item.event_id._id);
                if (existing) {
                    existing.ticket_quantity += item.ticket_quantity; // add quantity if already purchased
                } else {
                    updatedPurchased.push(item);
                }
            }

            // Save purchased_events and clear cart
            await apiClient.updateUserPartial({
                id: user.id,
                carted_events: [],
                purchased_events: updatedPurchased,
            });

            setUser({ ...user, carted_events: [], purchased_events: updatedPurchased });

            // Pass **just purchased items** via navigation state
            navigate("/confirmation", { state: { purchasedItems: cartEvents } });
        } catch (err) {
            await apiClient.addLogToServer("error", "Checkout failed", err);
        }
    };



    if (loading)
        return (
            <div className="loading-container">
                <p className="loading-text">Loading your cart...</p>
            </div>
        );

    return (
        <div className="cart-page">
            <div className="cart-page-header">
                <button className="back-button" onClick={() => navigate("/")}>
                    <p className="body-copy bold-text">Back to Events</p>
                </button>
                <h1>Cart</h1>
            </div>

            {cartEvents.length === 0 ? (
                <>
                    <p className="empty-cart-message">No Events Added</p>
                    <button
                        className="view-events-button button"
                        onClick={() => navigate("/")}
                    >
                        <p className="body-copy bold-text">View Events</p>
                    </button>
                </>
            ) : (
                <div className="cart-wrapper">
                    <div className="cart-container">
                        {cartEvents.map(event => (
                            <EventCardCart
                                key={event.event_id._id}
                                event={event}
                                onRemove={handleRemove}
                            />
                        ))}
                    </div>
                    <button
                        className="checkout-button button"
                        onClick={handleCheckout}
                    >
                        <p className="body-copy bold-text">Checkout</p>
                    </button>
                </div>
            )}
        </div>
    );
};

export default Cart;
