/**
 * API Service for communicating with Flask Backend
 */

const API_BASE = '/api';

export async function getLatestSensorData() {
  const res = await fetch(`${API_BASE}/sensor-data/latest`);
  if (!res.ok) throw new Error('Failed to fetch latest sensor data');
  return res.json();
}

export async function getHeartRateHistory(limit = 30) {
  const res = await fetch(`${API_BASE}/sensor-data/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch heart rate history');
  return res.json();
}

export async function connectDevice(ip) {
  const res = await fetch(`${API_BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip })
  });
  return res.json();
}

export async function disconnectDevice() {
  const res = await fetch(`${API_BASE}/disconnect`, { method: 'POST' });
  return res.json();
}

export async function getConnectionStatus() {
  const res = await fetch(`${API_BASE}/connection/status`);
  if (!res.ok) throw new Error('Failed to fetch connection status');
  return res.json();
}

export async function toggleDemoMode() {
  const res = await fetch(`${API_BASE}/demo/toggle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle demo mode');
  return res.json();
}

