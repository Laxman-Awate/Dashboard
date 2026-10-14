import React from 'react';

export default function SensorCard({ title, icon, value, unit, isPill, pillType, accentClass }) {
  const displayValue = (value !== null && value !== undefined && value !== '') ? value : '--';

  return (
    <div className="sensor-card">
      <div className="card-top">
        <span className="card-title">{title}</span>
        <div className={`card-icon ${accentClass}`}>
          {icon}
        </div>
      </div>
      
      <div className="card-body">
        {isPill ? (
          <span className={`status-pill ${pillType}`}>
            {displayValue}
          </span>
        ) : (
          <>
            <span className="card-value">{displayValue}</span>
            {unit && <span className="card-unit">{unit}</span>}
          </>
        )}
      </div>
    </div>
  );
}

