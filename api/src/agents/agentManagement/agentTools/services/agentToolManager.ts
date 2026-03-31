import { createTool, CreateToolInput } from './agentToolManager/createTool';
import { readTool, ReadToolInput } from './agentToolManager/readTool';
import { updateTool, UpdateToolInput } from './agentToolManager/updateTool';
import { listTools, ListToolsInput } from './agentToolManager/listTools';
import { deleteTool, DeleteToolInput } from './agentToolManager/deleteTool';

export const agentToolManager = {
  createTool,
  readTool,
  updateTool,
  listTools,
  deleteTool,
};

export type { CreateToolInput, ReadToolInput, UpdateToolInput, ListToolsInput, DeleteToolInput };
export type { AgentToolDocument } from './agentToolManager/createTool';
