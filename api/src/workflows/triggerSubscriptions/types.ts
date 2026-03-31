/**
 * Type definitions for trigger subscription system
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * Trigger subscription document structure
 * Stored at: /tenants/{tenantId}/workflows/main/triggerSubscriptions/{subscriptionId}
 * Note: One subscription per workflow (1:1 relationship)
 */
export interface TriggerSubscription {
  // Identity
  id: string;                          // subscriptionId (ULID)
  tenantId: string;
  workflowId: string;                  // Reference to workflow document (1:1)

  // Trigger configuration
  triggerType: string;                 // e.g., "sms.received.v1" (REQUIRED, indexed)
  enabled: boolean;                    // Active/inactive toggle (indexed)

  // Optional filters (evaluated on event emission - Phase 2)
  conditions?: {
    tags?: string[];                   // e.g., ["inbound"]
    payload?: Record<string, any>;     // e.g., { "mediaCount": { "$eq": 0 } }
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;                  // userId

  // Optional rate limiting (Phase 2 enforcement)
  rateLimit?: {
    perMinute?: number;
    burst?: number;
  };

  // Priority for execution order (if multiple match - Phase 2)
  priority?: number;                   // Default: 100

  // Version tracking
  version: number;                     // For optimistic locking
}

/**
 * Input for creating a new trigger subscription
 */
export interface CreateSubscriptionInput {
  workflowId: string;
  triggerType: string;                 // REQUIRED
  enabled?: boolean;                   // Default: true
  conditions?: {
    tags?: string[];
    payload?: Record<string, any>;
  };
  priority?: number;                   // Default: 100
  rateLimit?: {
    perMinute?: number;
    burst?: number;
  };

  // Optional: Trigger node parameters for automatic condition building
  // If provided, will be converted to conditions.payload format
  // Example: { milestoneFilter: "1_hour_before", eventTypeFilter: "meeting" }
  nodeParameters?: Record<string, any>;
}

/**
 * Input for updating an existing trigger subscription
 */
export interface UpdateSubscriptionInput {
  enabled?: boolean;
  conditions?: {
    tags?: string[];
    payload?: Record<string, any>;
  };
  priority?: number;
  rateLimit?: {
    perMinute?: number;
    burst?: number;
  };

  // Optional: Trigger node parameters for automatic condition building
  // If provided, will regenerate conditions.payload from node parameters
  // Example: { milestoneFilter: "1_hour_before", eventTypeFilter: "meeting" }
  nodeParameters?: Record<string, any>;
}

/**
 * Filters for querying trigger subscriptions
 */
export interface SubscriptionFilters {
  triggerType?: string;                // Filter by event type
  enabled?: boolean;                   // Filter by active/inactive
  workflowId?: string;                 // Filter by workflow (though 1:1 relationship)
}

/**
 * Event definition for trigger registry
 */
export interface TriggerEventDefinition {
  // Identity
  type: string;                        // e.g., "sms.received.v1"
  version: number;
  displayName: string;
  description: string;
  category: 'communication' | 'contact' | 'opportunity' | 'system' | 'calendar';

  // Payload schema (JSON Schema format)
  payloadSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };

  // Example payload (for docs/testing)
  examplePayload: Record<string, any>;

  // Available filter fields
  filterableFields: Array<{
    field: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    description: string;
  }>;

  // Metadata
  isStable: boolean;                   // false = experimental
  deprecatedAt?: string;               // ISO date if deprecated
  replacedBy?: string;                 // New event type if replaced
  metadata?: {                         // Additional metadata for special handling
    usesResumeUrl?: boolean;           // Use resumeUrl instead of webhookUrl
    requiresEventId?: boolean;         // Subscription must specify event ID
    pausesWorkflow?: boolean;          // Workflow pauses until triggered
    isWaitNode?: boolean;              // Special handling for wait nodes
    [key: string]: any;                // Allow additional custom metadata
  };
}
