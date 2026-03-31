'use client';

import { ChevronLeft, ChevronRight, Plus, Menu, ArrowLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface CalendarHeaderProps {
  view: 'month' | 'week' | 'day';
  currentDate: Date;
  showDatePicker: boolean;
  pickerYear: number;
  showViewDropdown: boolean;
  datePickerRef: React.RefObject<HTMLDivElement | null>;
  viewDropdownRef: React.RefObject<HTMLDivElement | null>;
  onViewChange: (view: 'month' | 'week' | 'day') => void;
  onPreviousClick: () => void;
  onNextClick: () => void;
  onTodayClick: () => void;
  onDatePickerToggle: () => void;
  onViewDropdownToggle: () => void;
  onYearChange: (year: number) => void;
  onMonthSelect: (month: number) => void;
  onCreateClick: () => void;
  onMenuClick: () => void;
  getWeekStart: (date: Date) => Date;
  getWeekEnd: (date: Date) => Date;
}

export default function CalendarHeader({
  view,
  currentDate,
  showDatePicker,
  pickerYear,
  showViewDropdown,
  datePickerRef,
  viewDropdownRef,
  onViewChange,
  onPreviousClick,
  onNextClick,
  onTodayClick,
  onDatePickerToggle,
  onViewDropdownToggle,
  onYearChange,
  onMonthSelect,
  onCreateClick,
  onMenuClick,
  getWeekStart,
  getWeekEnd
}: CalendarHeaderProps) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="backdrop-blur-xl bg-white/70 border-b border-white/50 px-4 py-3 mb-4 shadow-sm relative z-50">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>

          <Link
            href="/calendar"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>

          <button
            onClick={onTodayClick}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onPreviousClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <button
              onClick={onNextClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          <div className="relative" ref={datePickerRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDatePickerToggle();
              }}
              className="text-xl font-normal text-gray-900 hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors"
            >
              {view === 'day' ? (
                `${dayNames[currentDate.getDay()]}, ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`
              ) : view === 'week' ? (
                (() => {
                  const weekStart = getWeekStart(currentDate);
                  const weekEnd = getWeekEnd(currentDate);
                  return `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${
                    weekStart.getMonth() !== weekEnd.getMonth() ? monthNames[weekEnd.getMonth()] + ' ' : ''
                  }${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
                })()
              ) : (
                `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              )}
            </button>

            {/* Date Picker Dropdown */}
            {showDatePicker && (
              <div className="absolute left-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-[200] ring-1 ring-black/10 p-4 w-80">
                {/* Year Selector */}
                <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-2 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => onYearChange(pickerYear - 1)}
                    className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-300 hover:shadow-sm cursor-pointer"
                    title="Previous Year"
                  >
                    <ChevronLeft className="h-6 w-6 text-gray-700" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-gray-500 font-medium">Year</span>
                    <span className="text-2xl font-bold text-gray-900">{pickerYear}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onYearChange(pickerYear + 1)}
                    className="p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-300 hover:shadow-sm cursor-pointer"
                    title="Next Year"
                  >
                    <ChevronRight className="h-6 w-6 text-gray-700" />
                  </button>
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {monthNames.map((month, index) => {
                    const isSelectedMonth =
                      index === currentDate.getMonth() &&
                      pickerYear === currentDate.getFullYear();

                    const isCurrentMonth =
                      index === new Date().getMonth() &&
                      pickerYear === new Date().getFullYear();

                    return (
                      <button
                        key={month}
                        onClick={() => onMonthSelect(index)}
                        className={`px-3 py-2.5 text-sm rounded-lg transition-all font-medium ${
                          isSelectedMonth
                            ? 'bg-blue-500 text-white font-bold shadow-md'
                            : isCurrentMonth
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                            : 'hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
                        }`}
                        title={`Go to ${month} ${pickerYear}`}
                      >
                        {month.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      onTodayClick();
                      onDatePickerToggle();
                    }}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Today
                  </button>
                  <button
                    onClick={onDatePickerToggle}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* View Dropdown */}
          <div className="relative z-[60]" ref={viewDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDropdownToggle();
              }}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 relative z-[60]"
            >
              <span>{view.charAt(0).toUpperCase() + view.slice(1)}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {showViewDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-white border-2 border-gray-300 rounded-lg shadow-2xl z-[200] ring-1 ring-black/10">
                {(['month', 'week', 'day'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      onViewChange(v);
                      onViewDropdownToggle();
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors first:rounded-t-md last:rounded-b-md border-b border-gray-200 last:border-b-0 ${
                      view === v ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 font-medium'
                    }`}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Event Button */}
          <button
            onClick={onCreateClick}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow"
          >
            <Plus className="h-5 w-5" />
            <span>Create</span>
          </button>
        </div>
      </div>
    </div>
  );
}
