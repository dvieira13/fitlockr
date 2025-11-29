import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "../styles/index.css";
import "../styles/nav.css";
import { useUser } from "../context/userContext";
import cartIcon from "../assets/cart_icon.svg";

const NavBar = () => {
    const { user } = useUser();
    const navigate = useNavigate();

    const handleAuthClick = () => {
        if (user) {
            navigate("/account");
        } else {
            navigate("/login");
        }
    };

    const cartCount = user?.carted_events?.length || 0;

    return (
        <nav className="nav-wrapper">
            <div className="nav-inner">
                {/* AUTH LINK */}
                <button
                    onClick={handleAuthClick}
                    className="auth-link button"
                >
                    <h5 className="bold-text">
                        {user ? "My Account" : "Login"}
                    </h5>
                </button>

                {/* HOME LINK */}
                <Link to="/" className="home-link">
                    <h2>DylTickets</h2>
                </Link>

                {/* CART LINK */}
                <NavLink
                    to="/cart"
                    className={({ isActive }) =>
                        `cart-link ${isActive ? "active-cart-link" : ""}`
                    }
                    style={{ position: "relative" }}
                >
                    <img src={cartIcon} alt="Cart" />

                    {/* Red circle badge */}
                    {cartCount > 0 && (
                        <span className="cart-badge"><p>{cartCount}</p></span>
                    )}
                </NavLink>
            </div>
        </nav>
    );
};

export default NavBar;
