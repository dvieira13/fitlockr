import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import "../styles/index.css";
import "../styles/pages/home.css";
import closetIcon from "../assets/icons/closet_icon.svg";
import pieceIcon from "../assets/icons/piece_icon.svg";
import outfitIcon from "../assets/icons/outfit_icon.svg";
import visualizeIcon from "../assets/icons/visualize_icon.svg";


const Home = () => {
    const navigate = useNavigate();

    return (
        <div className="home-page">
            <div className="banner-section">
                <div className="banner-text-block">
                    <h1 className="bold-text">Your wardrobe,<br></br><span className="gradient-text">simplified.</span></h1>
                    <div className="banner-info-container">
                        <div>
                            <h4>FitLockr is the smarter way to track your wardrobe, plan outfits, and add new pieces.</h4>
                            <a className="button" href="/auth/create-account" title="Create an Account to Get Started">
                                <p className="body-copy bold-text">Start Your Locker<span className="desktop-only"> Now</span></p>
                            </a>
                        </div>
                        <img className="closet-icon mobile-only" src={closetIcon} alt="Closet Icon"></img>
                    </div>
                </div>
                <img className="closet-icon desktop-only" src={closetIcon} alt="Closet Icon"></img>
            </div>
            <div className="steps-section">
                <h2 className="bold-text">How It Works</h2>
                <div className="step-tile-container">
                    <div className="step-tiles">
                        <div className="step-tile shadow">
                            <div className="step-tile-header">
                                <img className="step-icon" src={pieceIcon} alt="Piece Icon"></img>
                                <h4 className="bold-text">Add pieces to your locker</h4>
                            </div>
                            <p className="body-copy">Snap a photo, upload an image, or paste a shopping link to create a new piece.</p>
                        </div>
                        <div className="step-tile shadow">
                            <div className="step-tile-header">
                                <img className="step-icon" src={outfitIcon} alt="Outfit Icon"></img>
                                <h4 className="bold-text">Create outfits</h4>
                            </div>
                            <p className="body-copy">Build outfit combinations to see how pieces look together before wearing or buying them.</p>
                        </div>
                        <div className="step-tile shadow">
                            <div className="step-tile-header">
                                <img className="step-icon" src={visualizeIcon} alt="Visualize Icon"></img>
                                <h4 className="bold-text">Visualize your wardrobe</h4>
                            </div>
                            <p className="body-copy">See your entire collection at a glance to organize, plan, and tailor your style.</p>
                        </div>
                    </div>
                    <div className="step-tiles-background"></div>
                </div>
            </div>
            <a className="cta-section" href="/auth/create-account" title="Create an Account to Get Started">
                <p className="h1-copy">Ready to start building your personalized locker?</p>
                <div className="button">
                    <p className="body-copy bold-text">Get Started Now</p>
                </div>
            </a>
        </div>
    );
};

export default Home;
