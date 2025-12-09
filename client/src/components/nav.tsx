import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "../styles/index.css";
import "../styles/components/nav.css";
import { useUser } from "../context/userContext";
import fitlockrLogo from "../assets/icons/fitlockr_logo.svg";
import userIconWhite from "../assets/icons/user_white_icon.svg";
import userIcon from "../assets/icons/user_icon.svg";
import menuIcon from "../assets/icons/menu_icon.svg";

const NavBar = () => {
    const { user } = useUser();

    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLinkClick = () => {
        setMobileOpen(false); // close menu on any internal navigation
    };

    return (
        <nav className="nav-wrapper">
            <div className="nav-inner">
                <div className="nav-top">

                    {/* HOME */}
                    <Link to={user ? "/locker" : "/"} className="home-link" onClick={handleLinkClick}>
                        <img src={fitlockrLogo} alt="FitLockr Logo" />
                    </Link>

                    {/* MOBILE MENU TOGGLE — DOES NOT HIDE */}
                    <button
                        className="mobile-nav-menu-button button mobile-only"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <img className="menu-icon" src={menuIcon} alt="Mobile Menu Icon" />
                    </button>
                </div>

                {/* NAV LINKS */}
                <div className={`nav-links-container ${mobileOpen ? "open" : ""}`}>
                    <div className="nav-links">

                        {/* LOCKER (exact only) */}
                        <NavLink
                            to="/locker"
                            end
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active-nav-link" : ""}`
                            }
                            onClick={handleLinkClick}
                        >
                            <p className="caption-copy">Locker</p>
                        </NavLink>

                        <div className="nav-link-divider"></div>

                        {/* SHELVES */}
                        <NavLink
                            to="/locker/shelves"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active-nav-link" : ""}`
                            }
                            onClick={handleLinkClick}
                        >
                            <p className="caption-copy">Shelves</p>
                        </NavLink>

                        <div className="nav-link-divider"></div>

                        {/* OUTFITS */}
                        <NavLink
                            to="/locker/outfits"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active-nav-link" : ""}`
                            }
                            onClick={handleLinkClick}
                        >
                            <p className="caption-copy">Outfits</p>
                        </NavLink>

                        <div className="nav-link-divider"></div>

                        {/* PIECES */}
                        <NavLink
                            to="/locker/pieces"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active-nav-link" : ""}`
                            }
                            onClick={handleLinkClick}
                        >
                            <p className="caption-copy">Pieces</p>
                        </NavLink>

                    </div>

                    {/* AUTH LINK */}
                    <NavLink
                        to={user ? "/account" : "/auth/login"}
                        className={({ isActive }) =>
                            `auth-link button ${user ? "account-link" : "login-link"} ${isActive ? "active-auth-link" : ""
                            }`
                        }
                        onClick={handleLinkClick}
                    >
                        {({ isActive }) => (
                            <>
                                <img
                                    className="user-icon"
                                    src={isActive ? userIcon : userIconWhite}
                                    alt="User Icon"
                                />
                                <p className="body-copy bold-text">
                                    {user ? "Account" : "Login"}
                                </p>
                            </>
                        )}
                    </NavLink>
                </div>
            </div>
        </nav>
    );
};

export default NavBar;
