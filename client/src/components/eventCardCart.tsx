import { useState, useEffect } from "react";
import { useUser } from "../context/userContext";
import { apiClient } from "../apiClient";
import { getImageByName } from "../utils/assets";
import { EventWithQuantity } from "../types/types";
import plus from "../assets/plus.svg";
import minus from "../assets/minus.svg";

interface EventCardCartProps {
    event: EventWithQuantity;
    onRemove: (id: string) => void;
}

const EventCardCart = ({ event, onRemove }: EventCardCartProps) => {
    const { user, setUser } = useUser();
    const [ticketQuantity, setTicketQuantity] = useState(event.ticket_quantity);

    useEffect(() => {
        setTicketQuantity(event.ticket_quantity); // sync when prop changes
    }, [event.ticket_quantity]);

    /**
     * @param newQuantity as number from frontend state
     * updates ticket quantity in cart, using updateUserPartial
     */
    const updateQuantity = async (newQuantity: number) => {
        if (!user) return;
        const updatedCart = user.carted_events!.map(item =>
            item.event_id._id === event.event_id._id
                ? { ...item, ticket_quantity: newQuantity }
                : item
        );

        try {
            await apiClient.updateUserPartial({
                id: user.id,
                carted_events: updatedCart,
            });
            setUser({ ...user, carted_events: updatedCart });
            setTicketQuantity(newQuantity);
        } catch (err) {
            await apiClient.addLogToServer("error", "Failed to update quantity", err);
        }
    };

    const increaseQuantity = () => {
        const newQuantity = ticketQuantity + 1;
        updateQuantity(newQuantity);
    };

    const decreaseQuantity = () => {
        const newQuantity = Math.max(1, ticketQuantity - 1);
        updateQuantity(newQuantity);
    };

    /**
     * removes event from cart, using updateUserPartial
     */
    const removeFromCart = async () => {
        if (!user) return;
        const updatedCart = user.carted_events!
            .filter(item => item.event_id._id !== event.event_id._id)
            .map(item => ({ event_id: item.event_id, ticket_quantity: item.ticket_quantity }));

        try {
            await apiClient.updateUserPartial({
                id: user.id,
                carted_events: updatedCart,
            });
            setUser({ ...user, carted_events: updatedCart });
            onRemove(event.event_id._id);
        } catch (err) {
            await apiClient.addLogToServer("error", "Failed to remove event from cart", err);
        }
    };

    return (
        <div className="cart-event-item">
            <div className="cart-event-img">
                <img
                    src={getImageByName(event.event_id.primary_img_src)}
                    alt={event.event_id.name}
                />
            </div>
            <div className="cart-event-info">
                <h2 className="cart-event-name">{event.event_id.name}</h2>
                {event.event_id.slogan && (
                    <h4 className="cart-event-slogan">{event.event_id.slogan}</h4>
                )}
                <div className="cart-event-info-sep"></div>
                {event.event_id.city && (
                    <h4 className="bold-text cart-event-city">{event.event_id.city}</h4>
                )}
                {event.event_id.date && (
                    <h5 className="cart-event-date">
                        {new Date(event.event_id.date).toLocaleDateString()}
                    </h5>
                )}
                {event.event_id.time && (
                    <h5 className="cart-event-time">{event.event_id.time}</h5>
                )}

                {/* Ticket quantity selector */}
                <div className="event-quantity-container">
                    <div className="event-quantity-button decrease-quantity-button" onClick={decreaseQuantity}>
                        <img src={minus} alt="Decrease quantity" />
                    </div>
                    <p className="event-quantity body-copy bold-text">{ticketQuantity}</p>
                    <div className="event-quantity-button increase-quantity-button" onClick={increaseQuantity}>
                        <img src={plus} alt="Increase quantity" />
                    </div>
                </div>

                <button className="cart-button" onClick={removeFromCart}>
                    <p className="body-copy bold-text">Remove</p>
                </button>
            </div>
        </div>
    );
};

export default EventCardCart;
