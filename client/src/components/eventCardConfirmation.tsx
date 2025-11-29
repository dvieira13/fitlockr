import { getImageByName } from "../utils/assets";
import { EventWithQuantity } from "../types/types";

interface EventCardConfirmationProps {
    event: EventWithQuantity;
}

const EventCardConfirmation = ({ event }: EventCardConfirmationProps) => {

    return (
        <div className="confirmation-event-item">
            <div className="confirmation-event-img">
                <img
                    src={getImageByName(event.event_id.primary_img_src)}
                    alt={event.event_id.name}
                />
            </div>
            <div className="confirmation-event-info">
                <h2 className="confirmation-event-name">{event.event_id.name}</h2>
                {event.event_id.slogan && <h4 className="confirmation-event-slogan">{event.event_id.slogan}</h4>}
                <div className="confirmation-event-info-sep"></div>
                {event.event_id.city && <h4 className="bold-text confirmation-event-city">{event.event_id.city}</h4>}
                {event.event_id.date && <h5 className="confirmation-event-date">{new Date(event.event_id.date).toLocaleDateString()}</h5>}
                {event.event_id.time && <h5 className="confirmation-event-time">{event.event_id.time}</h5>}
                <p className="ticket-quantity">Quantity: {event.ticket_quantity}</p>
            </div>
        </div>
    );
};

export default EventCardConfirmation;
