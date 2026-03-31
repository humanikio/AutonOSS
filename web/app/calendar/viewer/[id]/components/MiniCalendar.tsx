'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MiniCalendarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onTodayClick: () => void;
}

export default function MiniCalendar({ currentDate, onDateSelect, onTodayClick }: MiniCalendarProps) {
  const [miniDate, setMiniDate] = useState(new Date());

  // Sync mini calendar with main calendar date
  useEffect(() => {
    setMiniDate(new Date(currentDate));
  }, [currentDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysInMonth = new Date(
    miniDate.getFullYear(),
    miniDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    miniDate.getFullYear(),
    miniDate.getMonth(),
    1
  ).getDay();

  const goToPreviousMonth = () => {
    setMiniDate(new Date(miniDate.getFullYear(), miniDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setMiniDate(new Date(miniDate.getFullYear(), miniDate.getMonth() + 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      miniDate.getMonth() === today.getMonth() &&
      miniDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === currentDate.getDate() &&
      miniDate.getMonth() === currentDate.getMonth() &&
      miniDate.getFullYear() === currentDate.getFullYear()
    );
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(miniDate.getFullYear(), miniDate.getMonth(), day);
    onDateSelect(newDate);
  };

  const renderDays = () => {
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square"></div>
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const today = isToday(day);
      const selected = isSelected(day);

      days.push(
        <button
          key={day}
          onClick={() => handleDayClick(day)}
          className={`aspect-square flex items-center justify-center text-xs rounded hover:bg-gray-100 transition-colors ${
            today
              ? 'bg-blue-500 text-white font-semibold hover:bg-blue-600'
              : selected
              ? 'bg-gray-200 font-medium'
              : 'text-gray-700'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/50 rounded-xl p-3 shadow-sm w-56">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-gray-900">
            {monthNames[miniDate.getMonth()]} {miniDate.getFullYear()}
          </span>
          <button
            onClick={onTodayClick}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium text-left"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-[10px] font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {renderDays()}
      </div>
    </div>
  );
}
