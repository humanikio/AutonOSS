/**
 * Field grouping configuration for workflow field mapping
 * This file defines how fields are grouped in the field selection dropdown
 */

export interface GroupConfig {
  name: string;
  displayName: string;
  icon: string;
  priority: number;
  description?: string;
}

export const FIELD_GROUP_CONFIG: GroupConfig[] = [
  {
    name: 'inboundWebhook',
    displayName: 'Webhook Payload',
    icon: '📥',
    priority: 1,
    description: 'Fields from test webhook payload',
  },
];

export interface FieldDefinition {
  path: string;
  displayName: string;
  group: string;
  sourceNodeName?: string; // Full n8n node name for referencing (e.g., "Find Contact - abc123")
  type: string;
  value: any;
  isNested: boolean;
}

export interface GroupedFields {
  group: GroupConfig;
  fields: FieldDefinition[];
}

/**
 * Get icon for a group based on group name
 */
function getIconForGroup(groupName: string): string {
  if (groupName === 'inboundWebhook') return '📥';
  // Dynamic node output groups get a search/output icon
  return '🔍';
}

/**
 * Groups fields dynamically - creates group configs on the fly for node outputs
 * @param fields - Array of field definitions
 * @returns Array of grouped fields sorted by priority
 */
export function groupFields(fields: FieldDefinition[]): GroupedFields[] {
  const fieldsByGroup = new Map<string, FieldDefinition[]>();
  const dynamicGroups = new Map<string, GroupConfig>();

  // Group fields by their group property
  fields.forEach((field) => {
    const groupName = field.group || 'root';
    if (!fieldsByGroup.has(groupName)) {
      fieldsByGroup.set(groupName, []);
    }
    fieldsByGroup.get(groupName)!.push(field);

    // Create dynamic group config if not in static config
    if (!FIELD_GROUP_CONFIG.find(g => g.name === groupName)) {
      if (!dynamicGroups.has(groupName)) {
        dynamicGroups.set(groupName, {
          name: groupName,
          displayName: groupName, // Use the node label directly
          icon: getIconForGroup(groupName),
          priority: 2, // Static groups priority 1, dynamic groups priority 2
          description: `Output from ${groupName} node`,
        });
      }
    }
  });

  // Merge static and dynamic group configs
  const allGroups = [
    ...FIELD_GROUP_CONFIG,
    ...Array.from(dynamicGroups.values())
  ];

  // Build grouped fields
  const grouped: GroupedFields[] = [];
  allGroups.forEach((groupConfig) => {
    const fieldsInGroup = fieldsByGroup.get(groupConfig.name);
    if (fieldsInGroup && fieldsInGroup.length > 0) {
      grouped.push({
        group: groupConfig,
        fields: fieldsInGroup.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }
  });

  // Sort by priority
  return grouped.sort((a, b) => a.group.priority - b.group.priority);
}
