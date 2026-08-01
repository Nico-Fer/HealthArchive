import React from 'react';

import './Avatar.scss';

interface AvatarProps {
    name: string;
    lastName: string;
    size?: 'md' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ name, lastName, size = 'md' }) => {
    const initials = `${name.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    return (
        <span className={`ha-avatar ha-avatar-${size}`} aria-hidden="true">
            {initials}
        </span>
    );
};

export default Avatar;
