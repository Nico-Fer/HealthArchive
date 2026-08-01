import React from 'react';
import { FaPlus, FaSearch } from 'react-icons/fa';

import './PageHeader.scss';

interface PageHeaderProps {
    title: string;
    searchPlaceholder?: string;
    onSearchChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    actionLabel?: string;
    onAction?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    searchPlaceholder,
    onSearchChange,
    actionLabel,
    onAction,
}) => {
    return (
        <div className="ha-page-header d-print-none">
            <h1 className="ha-page-title">{title}</h1>
            {(onSearchChange || onAction) && (
                <div className="ha-page-header-tools">
                    {onSearchChange && (
                        <div className="ha-page-header-search">
                            <FaSearch className="ha-page-header-search-icon" aria-hidden="true" />
                            <input
                                type="search"
                                className="form-control"
                                placeholder={searchPlaceholder}
                                aria-label={searchPlaceholder}
                                onChange={onSearchChange}
                            />
                        </div>
                    )}
                    {onAction && actionLabel && (
                        <button type="button" className="btn btn-primary ha-page-header-action" onClick={onAction}>
                            <FaPlus aria-hidden="true" /> {actionLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
