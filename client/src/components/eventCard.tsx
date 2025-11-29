import { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/scrollbar";
import "swiper/css/navigation";
import { Scrollbar, Navigation } from "swiper/modules";
import { getImageByName } from "../utils/assets";
import leftArrow from "../assets/arrow_prev.svg";
import rightArrow from "../assets/arrow_next.svg";
import plus from "../assets/plus.svg";
import minus from "../assets/minus.svg";
import { useUser } from "../context/userContext";
import { apiClient } from "../apiClient";
import { EventWithQuantity } from "../types/types";

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

interface EventCardProps {
    event: EventData;
    isPurchased?: boolean;
}

const EventCard = ({ event, isPurchased = false }: EventCardProps) => {
    const { user, setUser } = useUser();
    const [mainImage, setMainImage] = useState(getImageByName(event.primary_img_src));
    const [isFading, setIsFading] = useState(false);
    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [ctaState, setCtaState] = useState<"add" | "update" | "added">("add");
    const prevRef = useRef<HTMLDivElement>(null);
    const nextRef = useRef<HTMLDivElement>(null);

    const allImages = [event.primary_img_src, ...(event.alt_img_srcs || [])];

    // Cart & Purchased items
    const cartItem = user?.carted_events?.find(item => item.event_id._id === event._id);
    const purchasedItem = user?.purchased_events?.find(item => item.event_id._id === event._id);

    const isInCart = !!cartItem;

    // Sync quantity & CTA from cart
    useEffect(() => {
        if (cartItem) {
            setTicketQuantity(cartItem.ticket_quantity);
            setCtaState("added"); // already in cart → show Added
        }
    }, [cartItem]);

    const handleThumbnailClick = (imgName: string) => {
        const newImg = getImageByName(imgName);
        if (newImg === mainImage) return;
        setIsFading(true);
        setTimeout(() => {
            setMainImage(newImg);
            setIsFading(false);
        }, 200);
    };

    const increaseQuantity = () => {
        setTicketQuantity(prev => prev + 1);
        if (isInCart) setCtaState("update"); // changing quantity shows "Update Quantity"
    };
    const decreaseQuantity = () => {
        setTicketQuantity(prev => Math.max(1, prev - 1));
        if (isInCart) setCtaState("update");
    };

    const toggleCart = async () => {
        if (!user) return;

        let updatedCart: EventWithQuantity[] = [];

        if (ctaState === "added") {
            // Remove from cart
            updatedCart = user.carted_events!.filter(item => item.event_id._id !== event._id);
            setCtaState("add"); // revert button to "Add to Cart"
        } else if (isInCart) {
            // Update quantity
            updatedCart = user.carted_events!.map(item =>
                item.event_id._id === event._id
                    ? { ...item, ticket_quantity: ticketQuantity }
                    : item
            );
            setCtaState("added"); // after updating → show "Added"
        } else {
            // Add to cart
            updatedCart = [
                ...(user.carted_events || []),
                {
                    event_id: {
                        _id: event._id,
                        name: event.name,
                        slogan: event.slogan || "",
                        city: event.city || "",
                        date: event.date instanceof Date ? event.date : new Date(event.date),
                        time: event.time || "",
                        primary_img_src: event.primary_img_src,
                        alt_img_srcs: event.alt_img_srcs,
                    },
                    ticket_quantity: ticketQuantity,
                }
            ];
            setCtaState("added"); // after adding → show "Added"
        }

        try {
            await apiClient.updateUserPartial({
                id: user.id,
                carted_events: updatedCart
            });
            setUser({ ...user, carted_events: updatedCart });
        } catch (err) {
            await apiClient.addLogToServer("error", "Failed to update cart", err);
        }
    };


    return (
        <div className="event-item">
            <div className="event-img-container">
                <div className={`event-primary-img-container ${isFading ? "fade-out" : "fade-in"}`}>
                    <img className="event-primary-img" src={mainImage} alt={event.name} />
                </div>

                {allImages.length > 0 && (
                    <div className="swiper-container-wrapper">
                        <div ref={prevRef} className="swiper-button-prev custom-prev">
                            <img src={leftArrow} alt="Previous" />
                        </div>
                        <div ref={nextRef} className="swiper-button-next custom-next">
                            <img src={rightArrow} alt="Next" />
                        </div>

                        <Swiper
                            slidesPerView={4}
                            spaceBetween={15}
                            cssMode
                            scrollbar={{ hide: false, draggable: true }}
                            grabCursor
                            modules={[Scrollbar, Navigation]}
                            breakpoints={{
                                0: {
                                    slidesPerView: 3,
                                    spaceBetween: 10,
                                },
                                769: {
                                    slidesPerView: 4,
                                    spaceBetween: 15,
                                },
                            }}
                            onBeforeInit={swiper => {
                                // @ts-ignore
                                swiper.params.navigation.prevEl = prevRef.current;
                                // @ts-ignore
                                swiper.params.navigation.nextEl = nextRef.current;
                            }}
                            navigation={{
                                prevEl: prevRef.current,
                                nextEl: nextRef.current,
                            }}
                            className="mySwiper"
                        >
                            {allImages.map((imgName, index) => {
                                const imgSrc = getImageByName(imgName);
                                const isActive = imgSrc === mainImage;
                                return (
                                    <SwiperSlide key={index}>
                                        <div
                                            className={`thumbnail-wrapper ${isActive ? "active-thumb" : ""}`}
                                            onClick={() => handleThumbnailClick(imgName)}
                                        >
                                            <img
                                                className="event-alt-img"
                                                src={imgSrc}
                                                alt={`${event.name} image ${index + 1}`}
                                            />
                                            {isActive && <div className="thumbnail-overlay" />}
                                        </div>
                                    </SwiperSlide>
                                );
                            })}
                        </Swiper>

                    </div>
                )}
            </div>

            <div className="event-info-container">
                <h2 className="event-name">{event.name}</h2>
                {event.slogan && <h4 className="event-slogan">{event.slogan}</h4>}
                <div className="event-info-sep"></div>
                {event.city && <h4 className="bold-text event-city">{event.city}</h4>}

                <div className="event-datetime-container">
                    {event.date && <h5 className="event-date">{new Date(event.date).toLocaleDateString()}</h5>}
                    {event.time && <h5 className="event-time">{event.time}</h5>}
                </div>

                <div className="event-quantity-container">
                    <div className="event-quantity-button decrease-quantity-button" onClick={decreaseQuantity}>
                        <img src={minus} alt="Decrease quantity" />
                    </div>
                    <p className="event-quantity body-copy bold-text">{ticketQuantity}</p>
                    <div className="event-quantity-button increase-quantity-button" onClick={increaseQuantity}>
                        <img src={plus} alt="Increase quantity" />
                    </div>
                </div>

                <button
                    onClick={toggleCart}
                    className="addtocart-button button"
                >
                    <p className="body-copy bold-text">
                        {ctaState === "add" && "Add to Cart"}
                        {ctaState === "update" && "Update Quantity"}
                        {ctaState === "added" && "Added"}
                    </p>
                </button>

                {purchasedItem && purchasedItem.ticket_quantity > 0 && (
                    <p className="purchased-text caption-copy">
                        {purchasedItem.ticket_quantity} {purchasedItem.ticket_quantity === 1 ? "ticket" : "tickets"} already purchased
                    </p>
                )}
            </div>
        </div>
    );
};

export default EventCard;
