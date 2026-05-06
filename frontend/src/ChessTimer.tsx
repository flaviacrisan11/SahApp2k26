import React, { useEffect, useRef } from 'react';
import './ChessTimer.css';

interface ChessTimerProps {
    timeLeft: number;        // secunde rămase
    isActive: boolean;       // e rândul acestui jucător?
    label: string;           // "Albe" sau "Negre"
    isWhite: boolean;        // pentru stilizare
}

const ChessTimer: React.FC<ChessTimerProps> = ({ timeLeft, isActive, label, isWhite }) => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Format MM:SS
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const isLow = timeLeft <= 30; // sub 30 secunde = pericol

    return (
        <div className={`timer ${isActive ? 'timer-active' : 'timer-inactive'} ${isLow ? 'timer-low' : ''} ${isWhite ? 'timer-white' : 'timer-black'}`}>
            <div className="timer-label">{label}</div>
            <div className="timer-display">{display}</div>
        </div>
    );
};

export default ChessTimer;