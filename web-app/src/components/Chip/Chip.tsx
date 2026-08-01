import React from 'react';

import './Chip.scss';

interface ChipProps {
    label: string;
    tone?: 'blue' | 'gray';
}

const Chip: React.FC<ChipProps> = ({ label, tone = 'blue' }) => {
    return <span className={`ha-chip ha-chip-${tone}`}>{label}</span>;
};

export default Chip;
