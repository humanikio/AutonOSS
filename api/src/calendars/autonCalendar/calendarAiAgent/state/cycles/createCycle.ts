/**
 * Create Cycle Service
 * Creates a new execution cycle and sets it as the current cycle
 * Cycles are immutable records that track agent operation state
 */

import { firestore } from '../../../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { updateState, getCurrentState } from '../utils/getCurrentState';

export type CycleStatus = 'processing' | 'completed' | 'failed';

export interface Cycle {
  cycleId: string;
  tenantId: string;
  chatId: string | null;          // Link to chat if applicable
  calendarId?: string;             // Which calendar we're operating on
  currentPrompt: string;           // User's latest message
  currentToDo: string | null;      // Which todo we're processing (e.g., 'todo_1')
  totalToDos: number;              // Total todos in queue
  status: CycleStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;                 // Error message if failed
  metadata?: Record<string, any>;
}

export interface CreateCycleInput {
  chatId?: string | null;
  calendarId?: string;
  currentPrompt: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new execution cycle
 * Mints a new UUID and ALWAYS replaces the currentCycleId in main
 *
 * @param tenantId - The tenant ID
 * @param input - Cycle creation data
 * @returns The created cycle
 */
export async function createCycle(
  tenantId: string,
  input?: CreateCycleInput
): Promise<Cycle> {
  try {
    const cycleId = uuidv4();
    const now = new Date();

    console.log(`= Creating new cycle: ${cycleId}`);

    // Get current chat if not provided
    let chatId = input?.chatId;
    if (chatId === undefined) {
      const state = await getCurrentState(tenantId);
      chatId = state.currentChatId;
    }

    const cycle: Cycle = {
      cycleId,
      tenantId,
      chatId,
      calendarId: input?.calendarId,
      currentPrompt: input?.currentPrompt || '',
      currentToDo: null,          // No todos yet
      totalToDos: 0,              // No todos yet
      status: 'processing',       // Always starts in processing state
      createdAt: now,
      startedAt: now,
      metadata: input?.metadata || {}
    };

    const cycleRef = firestore
      .collection('tenants')
      .doc(tenantId)
      .collection('calendars')
      .doc('autonCalendar')
      .collection('aiAgent')
      .doc('main')
      .collection('cycles')
      .doc(cycleId);

    await cycleRef.set(cycle);

    console.log(` Cycle created: ${cycleId}`);

    // Get current state to increment total cycles
    const currentState = await getCurrentState(tenantId);

    // ALWAYS replace currentCycleId in main (mints new cycle)
    await updateState(tenantId, {
      currentCycleId: cycleId,
      totalCycles: currentState.totalCycles + 1
    });

    console.log(` Cycle ${cycleId} set as current cycle`);

    return cycle;
  } catch (error) {
    console.error('L Error creating cycle:', error);
    throw new Error('Failed to create cycle');
  }
}
