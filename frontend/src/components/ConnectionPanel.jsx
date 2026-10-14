import React from 'react';

export default function ConnectionPanel({
  espIp,
  setEspIp,
  isConnected,
  isConnecting,
  onConnect,
  isDemoMode,
  onToggleDemo
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onConnect();
  };

  return (
    <section className="connection-panel">
      <form onSubmit={handleSubmit} className="connection-row">
        <div className="ip-input-group">
          <label htmlFor="espIpInput">ESP32 IP Address:</label>
          <input
            id="espIpInput"
            type="text"
            className="ip-input"
            placeholder="e.g. 192.168.4.1"
            value={espIp}
            onChange={(e) => setEspIp(e.target.value)}
          />
          <button
            type="submit"
            disabled={isConnecting}
            className={`btn ${isConnected ? 'btn-danger' : 'btn-primary'}`}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>

        <div className="status-group">
          {/* Connection status indicator */}
          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="dot"></span>
            <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
          </div>

          {/* Demo Mode Toggle */}
          <button
            type="button"
            className="btn btn-secondary demo-toggle-btn"
            onClick={onToggleDemo}
            title="Toggle simulated test telemetry"
          >
            Demo Mode: <strong style={{ color: isDemoMode ? '#F59E0B' : '#64748B', marginLeft: '4px' }}>
              {isDemoMode ? 'ON' : 'OFF'}
            </strong>
          </button>
        </div>
      </form>

      {/* Advisory Message */}
      <div className="helper-text">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>The device and browser must be connected to the same Wi-Fi network when using a local ESP32 server.</span>
      </div>
    </section>
  );
}

