import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

export default function HeartRateChart({ history, lastTimestamp, isDemo }) {
  const chartRef = useRef(null);

  const hasData = history && history.length > 0;

  const labels = hasData
    ? history.map((item) => {
        const t = new Date(item.timestamp);
        return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      })
    : [];

  const dataValues = hasData ? history.map((item) => item.heart_rate) : [];

  const formatLastUpdate = () => {
    if (!lastTimestamp) return 'Last update: --';
    const dateObj = new Date(lastTimestamp);
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `Last update: ${timeStr} ${isDemo ? '(Demo Data)' : ''}`;
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: dataValues,
        borderColor: '#EF4444',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(239, 68, 68, 0.15)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.00)');
          return gradient;
        },
        borderWidth: 2.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#EF4444',
        pointBorderWidth: 2,
        pointRadius: 3.5,
        pointHoverRadius: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 350,
      easing: 'linear'
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        titleFont: { size: 12 },
        bodyFont: { size: 13, weight: 'bold' },
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y} BPM`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 11 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 7
        }
      },
      y: {
        min: 50,
        max: 120,
        grid: { color: '#F1F5F9', drawBorder: false },
        ticks: {
          color: '#94A3B8',
          font: { size: 11 },
          stepSize: 15,
          callback: (val) => `${val} BPM`
        }
      }
    }
  };

  return (
    <section className="chart-panel">
      <div className="chart-header">
        <div className="chart-title">
          <div className="chart-pulse-dot"></div>
          <span>Live Heart Rate</span>
        </div>
        <span className="last-update">{formatLastUpdate()}</span>
      </div>

      <div className="chart-wrapper">
        {hasData ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div className="empty-chart-state active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <div>
              <strong>No heart rate data available</strong>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>
                Connect to your ESP32 Smart Glove or enable Demo Mode to view real-time telemetry.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

