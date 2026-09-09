import { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import './DateRangePicker.css';

export default function DateRangePicker({ startDate = '', endDate = '', onChange }) {
  const [preset, setPreset] = useState('all');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  // Sync internal dates if parent props change
  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setPreset(val);

    const now = new Date();
    let start = '';
    let end = '';

    if (val === 'today') {
      start = formatDate(now);
      end = formatDate(now);
    } else if (val === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = formatDate(y);
      end = formatDate(y);
    } else if (val === 'last7') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      start = formatDate(s);
      end = formatDate(now);
    } else if (val === 'last30') {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      start = formatDate(s);
      end = formatDate(now);
    } else if (val === 'thisMonth') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatDate(s);
      end = formatDate(now);
    } else if (val === 'all') {
      start = '';
      end = '';
    }

    if (val !== 'custom') {
      setCustomStart(start);
      setCustomEnd(end);
      if (onChange) {
        onChange({ startDate: start, endDate: end });
      }
    }
  };

  const handleStartChange = (e) => {
    const val = e.target.value;
    setCustomStart(val);
    setPreset('custom');
    if (onChange) {
      onChange({ startDate: val, endDate: customEnd });
    }
  };

  const handleEndChange = (e) => {
    const val = e.target.value;
    setCustomEnd(val);
    setPreset('custom');
    if (onChange) {
      onChange({ startDate: customStart, endDate: val });
    }
  };

  const handleClear = () => {
    setPreset('all');
    setCustomStart('');
    setCustomEnd('');
    if (onChange) {
      onChange({ startDate: '', endDate: '' });
    }
  };

  const hasFilter = customStart || customEnd || preset !== 'all';

  return (
    <div className="date-range-picker">
      <div className="date-range-picker-icon">
        <Calendar size={15} />
      </div>

      <select
        className="date-range-select"
        value={preset}
        onChange={handlePresetChange}
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="last7">Last 7 Days</option>
        <option value="last30">Last 30 Days</option>
        <option value="thisMonth">This Month</option>
        <option value="custom">Custom Range</option>
      </select>

      <div className="date-range-inputs">
        <input
          type="date"
          className="date-range-input"
          value={customStart}
          onChange={handleStartChange}
          title="Start Date"
        />
        <span className="date-range-separator">to</span>
        <input
          type="date"
          className="date-range-input"
          value={customEnd}
          onChange={handleEndChange}
          title="End Date"
        />
      </div>

      {hasFilter && (
        <button
          type="button"
          className="date-range-clear-btn"
          onClick={handleClear}
          title="Reset date filter"
        >
          <X size={13} /> Reset
        </button>
      )}
    </div>
  );
}
