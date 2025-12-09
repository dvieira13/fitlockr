/**
 * Defines the layout for all pages. <Navbar> pulls in nav component. <Outlet> pulls in route dictated by appRoutes 
 */
import { Outlet } from "react-router-dom";
import Navbar from "../components/nav";
import Redirect from "../routes/redirects";

const MainLayout = () => {
    return (
        <div>
            <Redirect />
            <Navbar />
            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
