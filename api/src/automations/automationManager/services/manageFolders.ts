import { createFolder } from './manageFolders/createFolder';
import { deleteFolder } from './manageFolders/deleteFolder';
import { editFolder } from './manageFolders/editFolder';

export interface FolderData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  automationCount: number;
}

export interface FolderAutomationLink {
  automationId: string;
  addedAt: string;
}

export const manageFoldersService = {
  createFolder,
  deleteFolder,
  editFolder
};