// Shared interfaces for ElevenLabs-related functionality

export interface KnowledgeBaseMappings {
  businessInfoId?: string;
  productIds?: Record<string, string>;    // productId -> ElevenLabs KB ID
  faqCategoryIds?: Record<string, string>; // category -> ElevenLabs KB ID  
  brandGuidelinesId?: string;
}

export interface KnowledgeSyncStatus {
  lastSyncAt?: string;
  businessInfoVersion?: string;
  productsVersion?: string;
  faqsVersion?: string;
  brandGuidelinesVersion?: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncError?: string;
}