// src/components/listPageFilters.tsx
import "../styles/index.css";
import "../styles/components/listPageFilters.css";
import leftArrowIcon from "../assets/icons/arrow_left_icon.svg";


const ListPageFilters = () => {

    return (
        <div className="list-page-filters">
            <div className="list-page-filters-header">
                <h5 className="bold-text">Filters</h5>
                <div className="toggle-filters-button">
                    <img className="left-arrow-icon" src={leftArrowIcon} alt="Left Arrow Icon"></img>
                    <img className="left-arrow-icon" src={leftArrowIcon} alt="Left Arrow Icon"></img>
                </div>
            </div>
        </div>
    );
};

export default ListPageFilters;
