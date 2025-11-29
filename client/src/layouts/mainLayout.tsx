/**
 * Defines the layout for all pages. <Navbar> pulls in nav component. <Outlet> pulls in route dictated by appRoutes 
 */
import { Outlet } from "react-router-dom";
import Navbar from "../components/nav";

const MainLayout = () => {
    return (
        <div>
            <Navbar />
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
