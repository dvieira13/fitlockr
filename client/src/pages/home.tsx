import { useState, useEffect } from "react";
import "../styles/index.css";
import "../styles/home.css";
import { apiClient } from "../apiClient";
import EventCard from "../components/eventCard";
import { useUser } from "../context/userContext";

interface EventData {
    _id: string;
    name: string;
    slogan?: string;
    city?: string;
    date: string | Date;
    time?: string;
    primary_img_src: string;
    alt_img_srcs: string[];
}

const Home = () => {
    const { user } = useUser();
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await apiClient.getEvents(); // /api/events
                if (response?.events) setEvents(response.events);
                else setError("No events found.");
            } catch (err: any) {
                await apiClient.addLogToServer("error", "Failed to load events", err);
                setError("Failed to load events.");
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading)
        return (
            <div className="loading-container">
                <p className="loading-text">Loading events...</p>
            </div>
        );

    if (error)
        return (
            <div className="error-container">
                <p className="error-text">{error}</p>
            </div>
        );

    return (
        <div className="home-page">
            <h1>All Events</h1>
            <div className="event-container">
                {events.map((event) => {
                    const isPurchased = user?.purchased_events?.some(
                        (item) => item.event_id._id === event._id
                    ) || false;
                    return <EventCard key={event._id} event={event} isPurchased={isPurchased} />;
                })}
            </div>
        </div>
    );
};

export default Home;
