/**
 * ToDo Manager
 * Main export for all todo state management
 * Re-exports all todo operations from /toDos/index.ts
 */

export {
  createToDo,
  getCurrentToDo,
  getToDo,
  getNextToDo,
  updateToDo,
  markToDoProcessing,
  completeToDoAndAdvance,
  handleToDoFailure,
  type ToDo,
  type ToDoStatus,
  type CreateToDoInput,
  type UpdateToDoInput
} from './toDos/index';
