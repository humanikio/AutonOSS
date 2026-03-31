/**
 * Get Current State Utility
 * Fetches the main AI agent state document
 * This is the single source of truth for current chat, cycle, and agent settings
 */

import { firestore } from '../../../../../config/firebase';

export interface AIAgentState {
  currentChatId: string | null;
  currentCycleId: string | null;
  lastActiveAt: Date;
  totalChats: number;
  totalMessages: number;
  totalCycles: number;
  settings?: {
    defaultCalendarId?: string;
    timezone?: string;
    preferences?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * Get the current AI agent state for a tenant
 * @param tenantId - The tenant ID
 * @returns Current state or default state if not exists
 */
export async function getCurrentState(tenantId: string): Promise<AIAgentState> {
  try {
    const stateRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main');

    const doc = await stateRef.get();

    if (!doc.exists) {
      // Return default state if document doesn't exist yet
      const defaultState: AIAgentState = {
        currentChatId: null,
        currentCycleId: null,
        lastActiveAt: new Date(),
        totalChats: 0,
        totalMessages: 0,
        totalCycles: 0,
        settings: {},
        metadata: {}
      };
      return defaultState;
    }

    const data = doc.data() as AIAgentState;

    // Convert Firestore Timestamp to Date
    return {
      ...data,
      lastActiveAt: data.lastActiveAt instanceof Date
        ? data.lastActiveAt
        : (data.lastActiveAt as any).toDate()
    };
  } catch (error) {
    console.error('L Error getting current state:', error);
    throw new Error('Failed to get current AI agent state');
  }
}

/**
 * Update the AI agent state
 * @param tenantId - The tenant ID
 * @param updates - Partial state updates
 */
export async function updateState(
  tenantId: string,
  updates: Partial<AIAgentState>
): Promise<void> {
  try {
    const stateRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main');

    await stateRef.set(
      {
        ...updates,
        lastActiveAt: new Date()
      },
      { merge: true }
    );

    console.log(` AI agent state updated for tenant ${tenantId}`);
  } catch (error) {
    console.error('L Error updating state:', error);
    throw new Error('Failed to update AI agent state');
  }
}

/**
 * Initialize the AI agent state (creates the main document if it doesn't exist)
 * @param tenantId - The tenant ID
 */
export async function initializeState(tenantId: string): Promise<AIAgentState> {
  try {
    const stateRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main');

    const doc = await stateRef.get();

    if (doc.exists) {
      const data = doc.data() as AIAgentState;
      return {
        ...data,
        lastActiveAt: data.lastActiveAt instanceof Date
          ? data.lastActiveAt
          : (data.lastActiveAt as any).toDate()
      };
    }

    // Create initial state
    const initialState: AIAgentState = {
      currentChatId: null,
      currentCycleId: null,
      lastActiveAt: new Date(),
      totalChats: 0,
      totalMessages: 0,
      totalCycles: 0,
      settings: {},
      metadata: {}
    };

    await stateRef.set(initialState);

    console.log(` AI agent state initialized for tenant ${tenantId}`);

    return initialState;
  } catch (error) {
    console.error('L Error initializing state:', error);
    throw new Error('Failed to initialize AI agent state');
  }
}
