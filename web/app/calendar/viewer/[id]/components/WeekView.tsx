'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CalendarEvent } from '@/lib/api/events';
import { Task } from '@/lib/api/tasks';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  tasks: Task[];
  highlightedDate: Date | null;
  onDayClick: (date: Date, clickEvent: React.MouseEvent) => void;
  onEventClick: (event: CalendarEvent, clickEvent: React.MouseEvent) => void;
  onTaskClick?: (task: Task, clickEvent: React.MouseEvent) => void;
  onEventResize?: (event: CalendarEvent, newEndTime: string) => Promise<void>;
  onTaskResize?: (task: Task, newDueTime: string, estimatedDuration: number) => Promise<void>;
  onEventMove?: (event: CalendarEvent, newStartTime: string, newEndTime: string) => Promise<void>;
  onTaskMove?: (task: Task, newDueTime: string) => Promise<void>;
  getWeekStart: (date: Date) => Date;
  getEventsForDate: (date: Date) => CalendarEvent[];
}

export default function WeekView({
  currentDate,
  events,
  tasks,
  highlightedDate,
  onDayClick,
  onEventClick,
  onTaskClick,
  onEventResize,
  onTaskResize,
  onEventMove,
  onTaskMove,
  getWeekStart,
  getEventsForDate
}: WeekViewProps) {
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizingTask, setResizingTask] = useState<Task | null>(null);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  const [currentResizeHeight, setCurrentResizeHeight] = useState(0); // Track height during resize

  // Drag-to-move state
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTop, setDragStartTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentDragTop, setCurrentDragTop] = useState(0); // Track current position during drag
  const [currentDragDayIndex, setCurrentDragDayIndex] = useState(0); // Track which day column we're over
  const [dragItemHeight, setDragItemHeight] = useState(0); // Track height for snap preview

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pendingChange, setPendingChange] = useState<{
    type: 'event-move' | 'event-resize' | 'task-move' | 'task-resize';
    item: CalendarEvent | Task;
    oldStart?: string;
    oldEnd?: string;
    newStart?: string;
    newEnd?: string;
    oldDuration?: number;
    newDuration?: number;
  } | null>(null);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekStart = getWeekStart(currentDate);

  // Snap to 15-minute intervals (15px = 15 minutes, since 60px = 1 hour)
  const snapToGrid = (position: number) => {
    const snapInterval = 15; // 15-minute intervals
    return Math.round(position / snapInterval) * snapInterval;
  };

  // Determine which day column the mouse is over
  const getDayIndexFromX = (clientX: number): number => {
    const weekGridEl = document.querySelector('.week-days-grid');
    if (!weekGridEl) return 0;

    const rect = weekGridEl.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const dayWidth = rect.width / 7;
    const dayIndex = Math.floor(relativeX / dayWidth);

    return Math.max(0, Math.min(6, dayIndex)); // Clamp to 0-6
  };

  // Generate hours from 12 AM to 11 PM
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get all 7 days of the week (using UTC to match event positioning)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    // Create a fresh date for each day to avoid mutation issues
    // Use UTC methods since events are positioned in UTC
    return new Date(Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate() + i,
      0, 0, 0, 0
    ));
  });

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    // Use UTC methods since we stored times as UTC
    const startHour = startTime.getUTCHours();
    const startMinutes = startTime.getUTCMinutes();
    const endHour = endTime.getUTCHours();
    const endMinutes = endTime.getUTCMinutes();

    const top = (startHour + startMinutes / 60) * 60; // 60px per hour
    const duration = (endHour + endMinutes / 60) - (startHour + startMinutes / 60);
    const height = duration * 60;

    return { top, height: Math.max(height, 30) }; // Minimum 30px height
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getUTCDate() === today.getUTCDate() &&
      date.getUTCMonth() === today.getUTCMonth() &&
      date.getUTCFullYear() === today.getUTCFullYear()
    );
  };

  // Resize handlers for events
  const handleEventResizeStart = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingEvent(event);
    setResizeStartY(e.clientY);
    const { height, top } = getEventPosition(event);
    setResizeStartHeight(height);
    setCurrentResizeHeight(height);
    setDragStartTop(top); // Store the original top position to keep it fixed
    // Add cursor style to body
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const handleEventResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingEvent || !onEventResize) return;

    const deltaY = e.clientY - resizeStartY;
    const rawHeight = Math.max(30, resizeStartHeight + deltaY); // Min 30px (30 minutes)
    const snappedHeight = snapToGrid(rawHeight);

    setCurrentResizeHeight(snappedHeight);

    // Make element semi-transparent during resize so preview is visible
    const eventEl = document.querySelector(`[data-event-id="${resizingEvent.eventId}"]`) as HTMLElement;
    if (eventEl) {
      eventEl.style.opacity = '0.5'; // Keep somewhat visible
      eventEl.style.pointerEvents = 'none';
    }
  }, [resizingEvent, resizeStartY, resizeStartHeight, onEventResize]);

  const handleEventResizeEnd = useCallback(async () => {
    console.log('[RESIZE END] Called with resizingEvent:', resizingEvent?.eventId);

    if (!resizingEvent || !onEventResize) {
      console.log('[RESIZE END] Early return - no resizingEvent or onEventResize');
      setResizingEvent(null);
      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }

    console.log('[RESIZE END] Setting modal position and showing modal');
    // Center modal on screen
    setModalPosition({ x: window.innerWidth / 2 - 144, y: window.innerHeight / 2 - 100 });

    // Keep the new height visible
    const eventEl = document.querySelector(`[data-event-id="${resizingEvent.eventId}"]`) as HTMLElement;
    if (eventEl) {
      eventEl.style.opacity = '1';
      eventEl.style.pointerEvents = '';
      eventEl.style.transition = 'none';
      eventEl.style.height = `${currentResizeHeight}px`;
      eventEl.style.top = `${dragStartTop}px`;
      eventEl.style.zIndex = '50';
    }

    const durationMinutes = currentResizeHeight; // Use snapped height
    const startTime = new Date(resizingEvent.startTime);

    // Calculate new end time = start time + duration
    const newEndTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // Format as UTC ISO string preserving exact time
    const year = newEndTime.getUTCFullYear();
    const month = newEndTime.getUTCMonth();
    const day = newEndTime.getUTCDate();
    const hours = newEndTime.getUTCHours();
    const minutes = newEndTime.getUTCMinutes();

    const newEndISO = new Date(Date.UTC(year, month, day, hours, minutes, 0, 0)).toISOString();

    // Calculate old duration for display
    const oldStart = new Date(resizingEvent.startTime);
    const oldEnd = new Date(resizingEvent.endTime);
    const oldDuration = Math.round((oldEnd.getTime() - oldStart.getTime()) / (1000 * 60));

    // Show confirmation modal instead of immediately calling API
    const changeData = {
      type: 'event-resize' as const,
      item: resizingEvent,
      oldStart: resizingEvent.startTime,
      oldEnd: resizingEvent.endTime,
      newStart: resizingEvent.startTime,
      newEnd: newEndISO,
      oldDuration,
      newDuration: durationMinutes
    };
    console.log('[RESIZE END] Setting pending change:', changeData);
    setPendingChange(changeData);
    console.log('[RESIZE END] Showing modal...');
    setShowConfirmModal(true);
    console.log('[RESIZE END] Modal state set to true');

    // DON'T clear state yet - keep alive for cancel animation
    // setResizingEvent(null);
    // setIsDragging(false);

    // Reset cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [resizingEvent, currentResizeHeight, onEventResize]);

  // Similar handlers for tasks
  const handleTaskResizeStart = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[TASK RESIZE START] Task:', task.taskName);
    console.log('[TASK RESIZE START] Task dueTime:', task.dueTime);
    console.log('[TASK RESIZE START] Task estimatedDuration:', task.estimatedDuration);

    setResizingTask(task);
    setResizeStartY(e.clientY);
    // Get current height and top position
    const taskEl = document.querySelector(`[data-task-id="${task.taskId}"]`) as HTMLElement;
    const currentHeight = taskEl ? parseInt(window.getComputedStyle(taskEl).height) : 28;
    setResizeStartHeight(currentHeight);
    setCurrentResizeHeight(currentHeight);

    // Store the current top position to calculate new due time from
    if (task.dueTime) {
      const dueTime = new Date(task.dueTime);
      const hour = dueTime.getUTCHours();
      const minutes = dueTime.getUTCMinutes();
      const top = (hour * 60) + minutes;
      console.log('[TASK RESIZE START] Calculated top position:', top, '(from', hour, 'hours', minutes, 'minutes)');
      setDragStartTop(top); // Reuse this state to store the starting top position
    }

    // Add cursor style to body
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  const handleTaskResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingTask || !onTaskResize) return;

    const deltaY = e.clientY - resizeStartY;
    const rawHeight = Math.max(28, resizeStartHeight + deltaY); // Min 28px
    const snappedHeight = snapToGrid(rawHeight);

    setCurrentResizeHeight(snappedHeight);

    // Make element semi-transparent during resize so preview is visible
    const taskEl = document.querySelector(`[data-task-id="${resizingTask.taskId}"]`) as HTMLElement;
    if (taskEl) {
      taskEl.style.opacity = '0.5'; // Keep somewhat visible
      taskEl.style.pointerEvents = 'none';
    }
  }, [resizingTask, resizeStartY, resizeStartHeight, onTaskResize]);

  const handleTaskResizeEnd = useCallback(async () => {
    if (!resizingTask || !onTaskResize) {
      setResizingTask(null);
      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }

    // Center modal on screen
    setModalPosition({ x: window.innerWidth / 2 - 144, y: window.innerHeight / 2 - 100 });

    // Keep the new height visible
    const taskEl = document.querySelector(`[data-task-id="${resizingTask.taskId}"]`) as HTMLElement;
    if (taskEl) {
      taskEl.style.opacity = '1';
      taskEl.style.pointerEvents = '';
      taskEl.style.transition = 'none';
      taskEl.style.height = `${currentResizeHeight}px`;
      taskEl.style.top = `${dragStartTop}px`;
      taskEl.style.zIndex = '50';
    }

    if (resizingTask.dueTime) {
      const estimatedDuration = currentResizeHeight; // Use snapped height
      const oldDuration = resizingTask.estimatedDuration || 28;

      // Show confirmation modal instead of immediately calling API
      setPendingChange({
        type: 'task-resize',
        item: resizingTask,
        oldStart: resizingTask.dueTime,
        oldEnd: resizingTask.dueTime,
        newStart: resizingTask.dueTime,
        newEnd: resizingTask.dueTime,
        oldDuration,
        newDuration: estimatedDuration
      });
      setShowConfirmModal(true);

      // DON'T clear state yet - keep alive for cancel animation
      // setResizingTask(null);
      // setIsDragging(false);

      // Reset cursor
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    } else {
      setResizingTask(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [resizingTask, currentResizeHeight, onTaskResize]);

  // Drag-to-move handlers for events
  const handleEventDragStart = (e: React.MouseEvent, event: CalendarEvent) => {
    // Don't start drag if we're already resizing
    if (resizingEvent || resizingTask) return;

    e.stopPropagation();
    setDraggingEvent(event);
    setDragStartY(e.clientY);
    setDragStartX(e.clientX);
    const { top, height } = getEventPosition(event);
    setDragStartTop(top);
    setDragItemHeight(height);

    // Determine which day this event is currently in
    const eventDate = new Date(event.startTime);
    const eventDay = eventDate.getUTCDay();
    setCurrentDragDayIndex(eventDay);

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleEventDragMove = useCallback((e: MouseEvent) => {
    if (!draggingEvent || !onEventMove) return;

    const deltaY = e.clientY - dragStartY;
    const deltaX = e.clientX - dragStartX;

    // Free-form movement that follows cursor
    const rawTop = Math.max(0, Math.min(1440, dragStartTop + deltaY));
    const snappedTop = snapToGrid(rawTop);

    // Detect which day column the cursor is over
    const dayIndex = getDayIndexFromX(e.clientX);
    setCurrentDragDayIndex(dayIndex);

    // Mark as dragging if we've moved more than 5px
    if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
      setIsDragging(true);
    }

    setCurrentDragTop(snappedTop);

    const eventEl = document.querySelector(`[data-event-id="${draggingEvent.eventId}"]`) as HTMLElement;
    if (eventEl) {
      // Move with cursor in both X and Y
      eventEl.style.top = `${rawTop}px`; // Use raw position for smooth follow
      eventEl.style.transform = `translateX(${deltaX}px) scale(1.02)`; // Follow X cursor

      // Add visual feedback during drag
      eventEl.style.opacity = '0.8';
      eventEl.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
      eventEl.style.zIndex = '1000';
      eventEl.style.transition = 'none'; // Disable transitions during drag
      eventEl.style.pointerEvents = 'none'; // Prevent hover interference
    }

    // Highlight the target day column
    document.querySelectorAll('.day-column').forEach((col, idx) => {
      if (idx === dayIndex) {
        (col as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      } else {
        (col as HTMLElement).style.backgroundColor = '';
      }
    });
  }, [draggingEvent, dragStartY, dragStartX, dragStartTop, onEventMove]);

  const handleEventDragEnd = useCallback(async () => {
    console.log('[DRAG END] Called with draggingEvent:', draggingEvent?.eventId);

    if (!draggingEvent || !onEventMove) {
      console.log('[DRAG END] Early return - no draggingEvent or onEventMove');
      setDraggingEvent(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Clear day column highlights
      document.querySelectorAll('.day-column').forEach((col) => {
        (col as HTMLElement).style.backgroundColor = '';
      });
      setTimeout(() => setIsDragging(false), 100);
      return;
    }

    // If user didn't actually drag (just clicked), don't show modal - let onClick handler fire
    if (!isDragging) {
      console.log('[DRAG END] No actual drag detected - clearing state for click handler');
      setDraggingEvent(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.querySelectorAll('.day-column').forEach((col) => {
        (col as HTMLElement).style.backgroundColor = '';
      });
      return;
    }

    console.log('[DRAG END] Setting modal position and showing modal');
    // Center modal on screen
    setModalPosition({ x: window.innerWidth / 2 - 144, y: window.innerHeight / 2 - 100 });

    // Clean up drag styles but keep the element at the dropped position
    const eventEl = document.querySelector(`[data-event-id="${draggingEvent.eventId}"]`) as HTMLElement;
    if (eventEl) {
      eventEl.style.opacity = '1';
      eventEl.style.transform = '';
      eventEl.style.boxShadow = '';
      eventEl.style.zIndex = '50';
      eventEl.style.transition = '';
      eventEl.style.pointerEvents = '';
      eventEl.style.top = `${currentDragTop}px`;
    }

    const newTop = currentDragTop; // Use snapped position
    const minutesFromMidnight = newTop; // 1px = 1 minute

    // Calculate new date based on which day column we dropped into
    const targetDate = new Date(Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate() + currentDragDayIndex,
      0, 0, 0, 0
    ));

    const newStartTime = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      0,
      minutesFromMidnight,
      0,
      0
    ));

    // Calculate duration
    const oldStart = new Date(draggingEvent.startTime);
    const oldEnd = new Date(draggingEvent.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newEndTime = new Date(newStartTime.getTime() + durationMs);

    // Show confirmation modal instead of immediately calling API
    const moveChangeData = {
      type: 'event-move' as const,
      item: draggingEvent,
      oldStart: draggingEvent.startTime,
      oldEnd: draggingEvent.endTime,
      newStart: newStartTime.toISOString(),
      newEnd: newEndTime.toISOString()
    };
    console.log('[DRAG END] Setting pending change:', moveChangeData);
    setPendingChange(moveChangeData);
    console.log('[DRAG END] Showing modal...');
    setShowConfirmModal(true);
    console.log('[DRAG END] Modal state set to true');

    // DON'T clear states yet - keep them alive for cancel animation
    // setDraggingEvent(null);
    // setIsDragging(false);

    // Clear day column highlights
    document.querySelectorAll('.day-column').forEach((col) => {
      (col as HTMLElement).style.backgroundColor = '';
    });

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [draggingEvent, currentDragTop, currentDragDayIndex, weekStart, onEventMove]);

  // Drag-to-move handlers for tasks
  const handleTaskDragStart = (e: React.MouseEvent, task: Task) => {
    // Don't start drag if we're already resizing
    if (resizingEvent || resizingTask) return;

    e.stopPropagation();
    setDraggingTask(task);
    setDragStartY(e.clientY);
    setDragStartX(e.clientX);

    let taskHeight = 28; // Default height
    if (task.dueTime) {
      const dueTime = new Date(task.dueTime);
      const hour = dueTime.getUTCHours();
      const minutes = dueTime.getUTCMinutes();
      const top = (hour * 60) + minutes;
      setDragStartTop(top);

      // Get task height from estimatedDuration
      if (task.estimatedDuration) {
        taskHeight = Math.max(28, task.estimatedDuration);
      }
    } else {
      setDragStartTop(0);
    }

    setDragItemHeight(taskHeight);

    // Determine which day this task is currently in
    if (task.dueDate) {
      const taskDate = new Date(task.dueDate);
      const taskDay = taskDate.getUTCDay();
      setCurrentDragDayIndex(taskDay);
    }

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleTaskDragMove = useCallback((e: MouseEvent) => {
    if (!draggingTask || !onTaskMove) return;

    const deltaY = e.clientY - dragStartY;
    const deltaX = e.clientX - dragStartX;

    // Free-form movement that follows cursor
    const rawTop = Math.max(0, Math.min(1440, dragStartTop + deltaY));
    const snappedTop = snapToGrid(rawTop);

    // Detect which day column the cursor is over
    const dayIndex = getDayIndexFromX(e.clientX);
    setCurrentDragDayIndex(dayIndex);

    // Mark as dragging if we've moved more than 5px
    if (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5) {
      setIsDragging(true);
    }

    setCurrentDragTop(snappedTop);

    const taskEl = document.querySelector(`[data-task-id="${draggingTask.taskId}"]`) as HTMLElement;
    if (taskEl) {
      // Move with cursor in both X and Y
      taskEl.style.top = `${rawTop}px`; // Use raw position for smooth follow
      taskEl.style.transform = `translateX(${deltaX}px) scale(1.02)`; // Follow X cursor

      // Add visual feedback during drag
      taskEl.style.opacity = '0.8';
      taskEl.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
      taskEl.style.zIndex = '1000';
      taskEl.style.transition = 'none'; // Disable transitions during drag
      taskEl.style.pointerEvents = 'none'; // Prevent hover interference
    }

    // Highlight the target day column
    document.querySelectorAll('.day-column').forEach((col, idx) => {
      if (idx === dayIndex) {
        (col as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      } else {
        (col as HTMLElement).style.backgroundColor = '';
      }
    });
  }, [draggingTask, dragStartY, dragStartX, dragStartTop, onTaskMove]);

  const handleTaskDragEnd = useCallback(async () => {
    if (!draggingTask || !onTaskMove) {
      setDraggingTask(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Clear day column highlights
      document.querySelectorAll('.day-column').forEach((col) => {
        (col as HTMLElement).style.backgroundColor = '';
      });
      setTimeout(() => setIsDragging(false), 100);
      return;
    }

    // If user didn't actually drag (just clicked), don't show modal - let onClick handler fire
    if (!isDragging) {
      setDraggingTask(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.querySelectorAll('.day-column').forEach((col) => {
        (col as HTMLElement).style.backgroundColor = '';
      });
      return;
    }

    // Center modal on screen
    setModalPosition({ x: window.innerWidth / 2 - 144, y: window.innerHeight / 2 - 100 });

    // Clean up drag styles but keep the element at the dropped position
    const taskEl = document.querySelector(`[data-task-id="${draggingTask.taskId}"]`) as HTMLElement;
    if (taskEl) {
      taskEl.style.opacity = '1';
      taskEl.style.transform = '';
      taskEl.style.boxShadow = '';
      taskEl.style.zIndex = '50';
      taskEl.style.transition = '';
      taskEl.style.pointerEvents = '';
      taskEl.style.top = `${currentDragTop}px`;
    }

    const newTop = currentDragTop; // Use snapped position
    const minutesFromMidnight = newTop;

    // Calculate new date based on which day column we dropped into
    const targetDate = new Date(Date.UTC(
      weekStart.getUTCFullYear(),
      weekStart.getUTCMonth(),
      weekStart.getUTCDate() + currentDragDayIndex,
      0, 0, 0, 0
    ));

    const newDueTime = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      0,
      minutesFromMidnight,
      0,
      0
    ));

    // Show confirmation modal instead of immediately calling API
    setPendingChange({
      type: 'task-move',
      item: draggingTask,
      oldStart: draggingTask.dueTime || '',
      oldEnd: draggingTask.dueTime || '',
      newStart: newDueTime.toISOString(),
      newEnd: newDueTime.toISOString()
    });
    setShowConfirmModal(true);

    // DON'T clear states yet - keep alive for cancel animation
    // setDraggingTask(null);
    // setIsDragging(false);

    // Clear day column highlights
    document.querySelectorAll('.day-column').forEach((col) => {
      (col as HTMLElement).style.backgroundColor = '';
    });

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [draggingTask, currentDragTop, currentDragDayIndex, weekStart, onTaskMove]);

  // Confirmation handlers
  const handleConfirmChange = async () => {
    if (!pendingChange) return;

    setShowConfirmModal(false);
    setPendingChange(null);

    // Clear all drag/resize states
    setDraggingEvent(null);
    setDraggingTask(null);
    setResizingEvent(null);
    setResizingTask(null);
    setIsDragging(false);

    // Freeze element at current position before optimistic update
    if ('eventId' in pendingChange.item) {
      const eventEl = document.querySelector(`[data-event-id="${pendingChange.item.eventId}"]`) as HTMLElement;
      if (eventEl) {
        console.log('[CONFIRM] Freezing event at current position');
        // Freeze transitions to prevent unwanted animations
        eventEl.style.setProperty('transition', 'none', 'important');
        // Clear drag-related styles only
        eventEl.style.opacity = '1';
        eventEl.style.zIndex = '';
        eventEl.style.pointerEvents = '';
        eventEl.style.transform = '';
        eventEl.style.boxShadow = '';
        console.log('[CONFIRM] Event styles - top:', eventEl.style.top, 'height:', eventEl.style.height);
      }
    } else {
      const taskEl = document.querySelector(`[data-task-id="${pendingChange.item.taskId}"]`) as HTMLElement;
      if (taskEl) {
        console.log('[CONFIRM] Freezing task at current position');
        // Freeze transitions to prevent unwanted animations
        taskEl.style.setProperty('transition', 'none', 'important');
        // Clear drag-related styles only
        taskEl.style.opacity = '1';
        taskEl.style.zIndex = '';
        taskEl.style.pointerEvents = '';
        taskEl.style.transform = '';
        taskEl.style.boxShadow = '';
        console.log('[CONFIRM] Task styles - top:', taskEl.style.top, 'height:', taskEl.style.height);
      }
    }

    try {
      if (pendingChange.type === 'event-move' && onEventMove) {
        const event = pendingChange.item as CalendarEvent;
        await onEventMove(event, pendingChange.newStart!, pendingChange.newEnd!);
      } else if (pendingChange.type === 'event-resize' && onEventResize) {
        const event = pendingChange.item as CalendarEvent;
        await onEventResize(event, pendingChange.newEnd!);
      } else if (pendingChange.type === 'task-move' && onTaskMove) {
        const task = pendingChange.item as Task;
        await onTaskMove(task, pendingChange.newStart!);
      } else if (pendingChange.type === 'task-resize' && onTaskResize) {
        const task = pendingChange.item as Task;
        await onTaskResize(task, task.dueTime!, pendingChange.newDuration!);
      }

      // After optimistic update completes, unfreeze transitions
      setTimeout(() => {
        if ('eventId' in pendingChange.item) {
          const eventEl = document.querySelector(`[data-event-id="${pendingChange.item.eventId}"]`) as HTMLElement;
          if (eventEl) {
            console.log('[CONFIRM CLEANUP] Unfreezing event transitions');
            eventEl.style.transition = '';
          }
        } else {
          const taskEl = document.querySelector(`[data-task-id="${pendingChange.item.taskId}"]`) as HTMLElement;
          if (taskEl) {
            console.log('[CONFIRM CLEANUP] Unfreezing task transitions');
            taskEl.style.transition = '';
          }
        }
      }, 100);

    } catch (error) {
      console.error('Error applying change:', error);
    }
  };

  const handleCancelChange = () => {
    if (!pendingChange) return;

    console.log('[CANCEL] Starting cancel with pendingChange:', pendingChange);

    // Animate element back to original position/size BEFORE closing modal
    if ('eventId' in pendingChange.item) {
      const event = pendingChange.item as CalendarEvent;
      console.log('[CANCEL] Event data:', event);
      console.log('[CANCEL] Event startTime from object:', event.startTime);
      console.log('[CANCEL] Event endTime from object:', event.endTime);
      console.log('[CANCEL] pendingChange.oldStart:', pendingChange.oldStart);
      console.log('[CANCEL] pendingChange.oldEnd:', pendingChange.oldEnd);

      const eventEl = document.querySelector(`[data-event-id="${event.eventId}"]`) as HTMLElement;
      console.log('[CANCEL] Element found:', !!eventEl);

      if (eventEl && pendingChange.oldStart && pendingChange.oldEnd) {
        // Calculate position from pendingChange old values (not from event object which may be mutated)
        const startTime = new Date(pendingChange.oldStart);
        const endTime = new Date(pendingChange.oldEnd);

        const startHour = startTime.getUTCHours();
        const startMinutes = startTime.getUTCMinutes();
        const endHour = endTime.getUTCHours();
        const endMinutes = endTime.getUTCMinutes();

        const top = (startHour + startMinutes / 60) * 60;
        const duration = (endHour + endMinutes / 60) - (startHour + startMinutes / 60);
        const height = Math.max(duration * 60, 30);

        console.log('[CANCEL] Calculated position - top:', top, 'height:', height);
        console.log('[CANCEL] Current element style - top:', eventEl.style.top, 'height:', eventEl.style.height);

        eventEl.style.transition = 'all 0.25s ease-out';
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        eventEl.style.opacity = '1';

        setTimeout(() => {
          console.log('[CANCEL TIMEOUT] Disabling transitions first');
          // Use setProperty with 'important' flag - style.transition = 'none !important' doesn't work!
          eventEl.style.setProperty('transition', 'none', 'important');

          // Force a reflow to ensure transition: none applies immediately
          eventEl.offsetHeight;

          console.log('[CANCEL TIMEOUT] Clearing all event inline styles');
          eventEl.style.top = '';
          eventEl.style.height = '';
          eventEl.style.opacity = '';
          eventEl.style.zIndex = '';
          eventEl.style.pointerEvents = '';
          eventEl.style.transform = '';  // Clear transform from drag
          eventEl.style.boxShadow = '';  // Clear shadow from drag
          eventEl.style.transition = '';  // Remove transition after clearing other styles

          console.log('[CANCEL TIMEOUT] Closing modal and clearing states');
          setShowConfirmModal(false);
          setPendingChange(null);
          // Clear all drag/resize states after animation
          setDraggingEvent(null);
          setDraggingTask(null);
          setResizingEvent(null);
          setResizingTask(null);
          setIsDragging(false);

          console.log('[CANCEL TIMEOUT] Done');
        }, 250);
      } else {
        setShowConfirmModal(false);
        setPendingChange(null);
        // Clear all drag/resize states
        setDraggingEvent(null);
        setDraggingTask(null);
        setResizingEvent(null);
        setResizingTask(null);
        setIsDragging(false);
      }
    } else {
      const task = pendingChange.item as Task;
      console.log('[CANCEL] Task data:', task);
      console.log('[CANCEL] Task dueTime from object:', task.dueTime);
      console.log('[CANCEL] pendingChange.oldStart:', pendingChange.oldStart);

      const taskEl = document.querySelector(`[data-task-id="${task.taskId}"]`) as HTMLElement;
      console.log('[CANCEL] Task element found:', !!taskEl);

      if (taskEl && pendingChange.oldStart) {
        // Use pendingChange.oldStart instead of task.dueTime (which may have been mutated)
        const dueTime = new Date(pendingChange.oldStart);
        const hour = dueTime.getUTCHours();
        const minutes = dueTime.getUTCMinutes();
        const top = (hour * 60) + minutes;

        // Calculate original height based on change type
        let height = 28;
        if (pendingChange.type === 'task-resize' && pendingChange.oldDuration) {
          height = Math.max(28, pendingChange.oldDuration);
        } else if (task.estimatedDuration) {
          height = Math.max(28, task.estimatedDuration);
        }

        console.log('[CANCEL] Calculated position - top:', top, 'height:', height);
        console.log('[CANCEL] Current element style - top:', taskEl.style.top, 'height:', taskEl.style.height);

        taskEl.style.transition = 'all 0.25s ease-out';
        taskEl.style.top = `${top}px`;
        taskEl.style.height = `${height}px`;
        taskEl.style.opacity = '1';

        setTimeout(() => {
          console.log('[CANCEL TIMEOUT] Checking if element still exists in DOM');
          const elementStillExists = document.body.contains(taskEl);
          console.log('[CANCEL TIMEOUT] Element still in DOM:', elementStillExists);

          if (!elementStillExists) {
            console.log('[CANCEL TIMEOUT] WARNING: Element was removed from DOM, re-querying');
            const freshEl = document.querySelector(`[data-task-id="${task.taskId}"]`) as HTMLElement;
            if (freshEl) {
              console.log('[CANCEL TIMEOUT] Found fresh element');
              // Use the fresh element reference - use setProperty for !important flag
              freshEl.style.setProperty('transition', 'none', 'important');
              freshEl.offsetHeight;
              freshEl.style.top = '';
              freshEl.style.height = '';
              freshEl.style.opacity = '';
              freshEl.style.zIndex = '';
              freshEl.style.pointerEvents = '';
              freshEl.style.transform = '';
              freshEl.style.boxShadow = '';
              freshEl.style.transition = '';
            } else {
              console.log('[CANCEL TIMEOUT] ERROR: Could not find task element');
            }
          } else {
            console.log('[CANCEL TIMEOUT] Keeping element at correct position, clearing drag styles only');
            // Don't clear transition yet - keep element frozen
            taskEl.style.setProperty('transition', 'none', 'important');

            // Clear only drag-related styles, keep position correct
            taskEl.style.transform = '';
            taskEl.style.boxShadow = '';
            taskEl.style.opacity = '1';
            taskEl.style.zIndex = '';
            taskEl.style.pointerEvents = '';

            console.log('[CANCEL TIMEOUT] Position locked at top:', taskEl.style.top, 'height:', taskEl.style.height);
          }

          console.log('[CANCEL TIMEOUT] Closing modal and clearing states');
          setShowConfirmModal(false);
          setPendingChange(null);
          setDraggingEvent(null);
          setDraggingTask(null);
          setResizingEvent(null);
          setResizingTask(null);
          setIsDragging(false);

          console.log('[CANCEL TIMEOUT] Done - waiting for React to re-render');

          // After React re-renders with correct inline styles, remove our overrides
          setTimeout(() => {
            const finalEl = document.querySelector(`[data-task-id="${task.taskId}"]`) as HTMLElement;
            if (finalEl) {
              console.log('[CANCEL CLEANUP] Removing transition override');
              finalEl.style.transition = '';
              console.log('[CANCEL CLEANUP] Final computed top:', window.getComputedStyle(finalEl).top);
              console.log('[CANCEL CLEANUP] Final inline styles:', finalEl.getAttribute('style'));
            }
          }, 100);
        }, 250);
      } else {
        setShowConfirmModal(false);
        setPendingChange(null);
        // Clear all drag/resize states
        setDraggingEvent(null);
        setDraggingTask(null);
        setResizingEvent(null);
        setResizingTask(null);
        setIsDragging(false);
      }
    }
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (resizingEvent && !showConfirmModal) {
      document.addEventListener('mousemove', handleEventResizeMove);
      document.addEventListener('mouseup', handleEventResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleEventResizeMove);
        document.removeEventListener('mouseup', handleEventResizeEnd);
      };
    }
  }, [resizingEvent, showConfirmModal, handleEventResizeMove, handleEventResizeEnd]);

  useEffect(() => {
    if (resizingTask && !showConfirmModal) {
      document.addEventListener('mousemove', handleTaskResizeMove);
      document.addEventListener('mouseup', handleTaskResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleTaskResizeMove);
        document.removeEventListener('mouseup', handleTaskResizeEnd);
      };
    }
  }, [resizingTask, showConfirmModal, handleTaskResizeMove, handleTaskResizeEnd]);

  useEffect(() => {
    if (draggingEvent && !showConfirmModal) {
      document.addEventListener('mousemove', handleEventDragMove);
      document.addEventListener('mouseup', handleEventDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleEventDragMove);
        document.removeEventListener('mouseup', handleEventDragEnd);
      };
    }
  }, [draggingEvent, showConfirmModal, handleEventDragMove, handleEventDragEnd]);

  useEffect(() => {
    if (draggingTask && !showConfirmModal) {
      document.addEventListener('mousemove', handleTaskDragMove);
      document.addEventListener('mouseup', handleTaskDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleTaskDragMove);
        document.removeEventListener('mouseup', handleTaskDragEnd);
      };
    }
  }, [draggingTask, showConfirmModal, handleTaskDragMove, handleTaskDragEnd]);

  return (
    <div className="backdrop-blur-xl bg-white/50 border border-white/50 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex h-full">
        {/* Time labels column */}
        <div className="flex-shrink-0 w-20 border-r-2 border-gray-300 bg-gradient-to-r from-gray-50 to-white/60">
          <div className="h-12"></div> {/* Spacer for day headers */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-[60px] border-b border-gray-200 flex items-start justify-end pr-3 pt-1"
            >
              <span className="text-xs font-medium text-gray-600">{formatHour(hour)}</span>
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex min-w-full week-days-grid">
            {weekDays.map((date, dayIndex) => {
              let dayEvents = getEventsForDate(date);

              // CRITICAL FIX: Ensure dragging/resizing events are always included in their original day
              // This prevents them from disappearing when the modal is shown
              if (resizingEvent && !dayEvents.find(e => e.eventId === resizingEvent.eventId)) {
                // Check if this event originally belongs to this day
                const eventDate = new Date(resizingEvent.startTime);
                if (eventDate.getUTCDate() === date.getUTCDate() &&
                    eventDate.getUTCMonth() === date.getUTCMonth() &&
                    eventDate.getUTCFullYear() === date.getUTCFullYear()) {
                  dayEvents = [...dayEvents, resizingEvent];
                }
              }
              if (draggingEvent && !dayEvents.find(e => e.eventId === draggingEvent.eventId)) {
                // Check if this event originally belongs to this day
                const eventDate = new Date(draggingEvent.startTime);
                if (eventDate.getUTCDate() === date.getUTCDate() &&
                    eventDate.getUTCMonth() === date.getUTCMonth() &&
                    eventDate.getUTCFullYear() === date.getUTCFullYear()) {
                  dayEvents = [...dayEvents, draggingEvent];
                }
              }

              const dayTasks = tasks.filter(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate);
                // Use UTC methods since we stored dates as UTC
                const matches = (
                  taskDate.getUTCDate() === date.getUTCDate() &&
                  taskDate.getUTCMonth() === date.getUTCMonth() &&
                  taskDate.getUTCFullYear() === date.getUTCFullYear()
                );

                // Debug the specific task we're tracking
                if (task.taskId === '8c962f35-16c2-4570-a42e-9a6aea233505') {
                  console.log(`[DAY ${dayIndex}] Filtering task:`, task.taskName);
                  console.log(`[DAY ${dayIndex}] Task dueDate:`, task.dueDate);
                  console.log(`[DAY ${dayIndex}] Date for this column:`, date.toISOString());
                  console.log(`[DAY ${dayIndex}] Match:`, matches);
                }

                return matches;
              });

              // Same fix for tasks
              if (resizingTask && !dayTasks.find(t => t.taskId === resizingTask.taskId)) {
                if (resizingTask.dueDate) {
                  const taskDate = new Date(resizingTask.dueDate);
                  if (taskDate.getUTCDate() === date.getUTCDate() &&
                      taskDate.getUTCMonth() === date.getUTCMonth() &&
                      taskDate.getUTCFullYear() === date.getUTCFullYear()) {
                    dayTasks.push(resizingTask);
                  }
                }
              }
              if (draggingTask && !dayTasks.find(t => t.taskId === draggingTask.taskId)) {
                if (draggingTask.dueDate) {
                  const taskDate = new Date(draggingTask.dueDate);
                  if (taskDate.getUTCDate() === date.getUTCDate() &&
                      taskDate.getUTCMonth() === date.getUTCMonth() &&
                      taskDate.getUTCFullYear() === date.getUTCFullYear()) {
                    dayTasks.push(draggingTask);
                  }
                }
              }

              const isTodayDate = isToday(date);

              return (
                <div
                  key={dayIndex}
                  className="flex-1 border-r-2 border-gray-300 last:border-r-0 min-w-[140px] day-column"
                >
                  {/* Day header */}
                  <div
                    className={`h-12 border-b-2 border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${
                      isTodayDate ? 'bg-blue-50' : 'bg-white/40'
                    }`}
                    onClick={(e) => onDayClick(date, e)}
                  >
                    <div className="text-xs text-gray-500 uppercase">{dayNames[date.getUTCDay()]}</div>
                    <div
                      className={`text-lg font-medium ${
                        isTodayDate
                          ? 'flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full'
                          : 'text-gray-700'
                      }`}
                    >
                      {date.getUTCDate()}
                    </div>
                  </div>

                  {/* Time grid with events */}
                  <div className="relative">
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className={`h-[60px] border-b-[1.5px] transition-all cursor-pointer group relative ${
                          hour % 2 === 0
                            ? 'bg-gray-50/40 border-gray-400 hover:bg-blue-50/60'
                            : 'bg-white/30 border-gray-300 hover:bg-blue-50/40'
                        } hover:border-blue-400 hover:shadow-inner`}
                        onClick={(e) => {
                          // Create date from UTC components to match event storage
                          const clickDate = new Date(Date.UTC(
                            date.getUTCFullYear(),
                            date.getUTCMonth(),
                            date.getUTCDate(),
                            hour,
                            0,
                            0,
                            0
                          ));
                          onDayClick(clickDate, e);
                        }}
                      >
                        {/* Half-hour line */}
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-300 group-hover:border-blue-400"></div>
                        {/* Hover indicator */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded shadow-sm">Click to create</div>
                        </div>
                      </div>
                    ))}

                    {/* Events positioned absolutely */}
                    {dayEvents.map((event) => {
                      const { top, height } = getEventPosition(event);
                      const isCompleted = event.status === 'completed';

                      return (
                        <div
                          key={event.eventId}
                          data-event-id={event.eventId}
                          className={`absolute left-1 right-1 rounded-lg backdrop-blur-md border border-white/30 shadow-lg cursor-grab active:cursor-grabbing group transition-all ${
                            isCompleted ? 'opacity-50' : 'hover:shadow-xl'
                          }`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            background: `linear-gradient(135deg, ${event.color || '#3B82F6'}95, ${event.color || '#3B82F6'}80)`,
                            zIndex: 10
                          }}
                        >
                          <div
                            className="px-2 py-1 h-full flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg"
                            tabIndex={0}
                            onMouseDown={(e) => handleEventDragStart(e, event)}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Only handle click if we're not dragging/resizing and no modal is shown
                              if (!isDragging && !draggingEvent && !resizingEvent && !showConfirmModal) {
                                onEventClick(event, e);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isDragging && !draggingEvent && !resizingEvent && !showConfirmModal) {
                                e.stopPropagation();
                                onEventClick(event, e as any);
                              }
                            }}
                          >
                            <div className={`text-white font-light text-xs truncate ${isCompleted ? 'line-through' : ''}`}>
                              {event.eventName}
                            </div>
                            <div className="text-white/80 text-[10px] font-light">
                              {new Date(event.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {/* Resize handle */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => handleEventResizeStart(e, event)}
                          >
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-white/70 rounded-full"></div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Tasks positioned absolutely */}
                    {dayTasks.map((task, idx) => {
                      const isCompleted = task.status === 'completed';
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

                      // If task has dueTime, position it at that time
                      // Otherwise, position at top of day
                      let top = 0;
                      let taskHeight = 28; // Default height

                      if (task.dueTime) {
                        const dueTime = new Date(task.dueTime);
                        // Use UTC methods since we stored times as UTC
                        const hour = dueTime.getUTCHours();
                        const minutes = dueTime.getUTCMinutes();
                        top = (hour * 60) + minutes;

                        // Debug: log position for the specific task we're tracking
                        if (task.taskId === '8c962f35-16c2-4570-a42e-9a6aea233505') {
                          console.log('[RENDER TASK] Rendering task:', task.taskName);
                          console.log('[RENDER TASK] dueTime from props:', task.dueTime);
                          console.log('[RENDER TASK] Calculated top:', top, 'from hour:', hour, 'minutes:', minutes);
                          console.log('[RENDER TASK] estimatedDuration:', task.estimatedDuration);
                        }

                        // If task has estimatedDuration, use it for height (1 minute = 1px)
                        if (task.estimatedDuration) {
                          taskHeight = Math.max(28, task.estimatedDuration);
                        }
                      } else {
                        // Stack tasks without time at top
                        top = idx * 30;
                      }

                      return (
                        <div
                          key={task.taskId}
                          data-task-id={task.taskId}
                          className={`absolute left-1 right-1 rounded-lg backdrop-blur-md border border-white/30 shadow-lg cursor-grab active:cursor-grabbing group transition-all ${
                            isCompleted ? 'opacity-50' :
                            isOverdue ? 'hover:shadow-xl' :
                            'hover:shadow-xl'
                          }`}
                          style={{
                            top: `${top}px`,
                            height: `${taskHeight}px`,
                            background: isCompleted
                              ? 'linear-gradient(135deg, rgba(156, 163, 175, 0.6), rgba(156, 163, 175, 0.5))'
                              : isOverdue
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(239, 68, 68, 0.5))'
                              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(59, 130, 246, 0.5))',
                            zIndex: 5
                          }}
                        >
                          <div
                            className="px-2 py-1 h-full flex items-center focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg"
                            tabIndex={0}
                            onMouseDown={(e) => handleTaskDragStart(e, task)}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Only handle click if we're not dragging/resizing and no modal is shown
                              if (!isDragging && !draggingTask && !resizingTask && !showConfirmModal && onTaskClick) {
                                onTaskClick(task, e);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isDragging && !draggingTask && !resizingTask && !showConfirmModal && onTaskClick) {
                                e.stopPropagation();
                                onTaskClick(task, e as any);
                              }
                            }}
                          >
                            <div className={`text-white font-light text-xs truncate ${isCompleted ? 'line-through' : ''}`}>
                              {task.taskName}
                            </div>
                          </div>
                          {/* Resize handle */}
                          <div
                            className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => handleTaskResizeStart(e, task)}
                          >
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white/70 rounded-full"></div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Snap preview indicator - shows where item will land when dragging */}
                    {(draggingEvent || draggingTask) && currentDragDayIndex === dayIndex && (
                      <div
                        className="absolute left-1 right-1 rounded-lg border-2 border-solid border-blue-500 bg-blue-100/20 pointer-events-none"
                        style={{
                          top: `${currentDragTop}px`,
                          height: `${dragItemHeight}px`,
                          zIndex: 999
                        }}
                      />
                    )}

                    {/* Resize preview indicator - shows new size when resizing */}
                    {resizingEvent && dayEvents.find(e => e.eventId === resizingEvent.eventId) && (
                      <div
                        className="absolute left-1 right-1 rounded-lg border-2 border-solid border-green-500 bg-green-100/20 pointer-events-none"
                        style={{
                          top: `${dragStartTop}px`,
                          height: `${currentResizeHeight}px`,
                          zIndex: 998
                        }}
                      />
                    )}

                    {/* Resize preview indicator for tasks */}
                    {resizingTask && dayTasks.find(t => t.taskId === resizingTask.taskId) && (
                      <div
                        className="absolute left-1 right-1 rounded-lg border-2 border-solid border-green-500 bg-green-100/20 pointer-events-none"
                        style={{
                          top: `${dragStartTop}px`,
                          height: `${currentResizeHeight}px`,
                          zIndex: 998
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Modal - rendered via portal to escape overflow-hidden */}
      {showConfirmModal && pendingChange && typeof document !== 'undefined' && (() => {
        console.log('[MODAL RENDER] Rendering modal with pendingChange:', pendingChange);
        return createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none" onClick={handleCancelChange}>
            <div
              className="absolute bg-white rounded-lg shadow-2xl p-3 w-72 pointer-events-auto border-2 border-blue-400"
              style={{
                left: `${modalPosition.x}px`,
                top: `${modalPosition.y}px`
              }}
              onClick={(e) => e.stopPropagation()}
            >
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Confirm Change
            </h3>

            <div className="space-y-2 mb-3">
              <div className="text-xs">
                <span className="font-medium text-gray-700">Item:</span>{' '}
                <span className="text-gray-900">
                  {'eventName' in pendingChange.item ? pendingChange.item.eventName : pendingChange.item.taskName}
                </span>
              </div>

              {pendingChange.type.includes('move') && (
                <>
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">From:</span>{' '}
                    <span className="text-gray-600">
                      {(() => {
                        const dt = new Date(pendingChange.oldStart!);
                        const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()];
                        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getUTCMonth()];
                        const day = dt.getUTCDate();
                        const hour = dt.getUTCHours() % 12 || 12;
                        const ampm = dt.getUTCHours() >= 12 ? 'PM' : 'AM';
                        const minute = String(dt.getUTCMinutes()).padStart(2, '0');
                        return `${weekday}, ${month} ${day}, ${hour}:${minute} ${ampm}`;
                      })()}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">To:</span>{' '}
                    <span className="text-green-600 font-medium">
                      {(() => {
                        const dt = new Date(pendingChange.newStart!);
                        const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getUTCDay()];
                        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getUTCMonth()];
                        const day = dt.getUTCDate();
                        const hour = dt.getUTCHours() % 12 || 12;
                        const ampm = dt.getUTCHours() >= 12 ? 'PM' : 'AM';
                        const minute = String(dt.getUTCMinutes()).padStart(2, '0');
                        return `${weekday}, ${month} ${day}, ${hour}:${minute} ${ampm}`;
                      })()}
                    </span>
                  </div>
                </>
              )}

              {pendingChange.type.includes('resize') && (
                <>
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">Old:</span>{' '}
                    <span className="text-gray-600">
                      {Math.floor(pendingChange.oldDuration! / 60)}h {pendingChange.oldDuration! % 60}m
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-medium text-gray-700">New:</span>{' '}
                    <span className="text-green-600 font-medium">
                      {Math.floor(pendingChange.newDuration! / 60)}h {pendingChange.newDuration! % 60}m
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCancelChange}
                className="flex-1 px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmChange}
                className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      );
      })()}
    </div>
  );
}
