'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, query, collection, orderBy, where, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: string;
  metadata?: {
    caseId?: string;
    analysisId?: string;
    ragNeeded?: boolean;
    documentsUsed?: number;
    processingTime?: number;
  };
}

interface UseTrainingMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTrainingMessages(sessionId: string, tenantId: string): UseTrainingMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!sessionId || !tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Listen to the messages subcollection (matches backend storage pattern)
    const messagesRef = collection(
      db, 
      'tenants', 
      tenantId, 
      'trainingSessions', 
      sessionId, 
      'messages'
    );
    
    // Query messages ordered by timestamp
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(
      messagesQuery,
      (querySnapshot) => {
        try {
          const transformedMessages: Message[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // Transform Firestore document to Message format
            let timestamp = new Date().toISOString(); // fallback
            
            if (data.timestamp) {
              // Handle different timestamp formats
              if (typeof data.timestamp === 'string') {
                timestamp = data.timestamp;
              } else if (data.timestamp?.toDate) {
                // Firestore Timestamp object
                timestamp = data.timestamp.toDate().toISOString();
              } else if (data.timestamp?.seconds) {
                // Firestore Timestamp-like object
                timestamp = new Date(data.timestamp.seconds * 1000).toISOString();
              } else if (data.timestamp instanceof Date) {
                timestamp = data.timestamp.toISOString();
              } else {
                console.warn('Unknown timestamp format:', typeof data.timestamp, data.timestamp);
              }
            }

            transformedMessages.push({
              id: doc.id,
              sender: data.sender || 'user',
              content: data.content || '',
              timestamp,
              metadata: data.metadata || undefined
            });
          });

          console.log(`📨 Loaded ${transformedMessages.length} training messages`);
          setMessages(transformedMessages);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing messages from Firestore:', err);
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to training messages:', err);
        setError(err.message || 'Failed to listen to messages');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [sessionId, tenantId, refreshTrigger]);

  // Manual refresh function
  const refresh = () => {
    console.log('🔄 Manually refreshing training messages...');
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    messages,
    loading,
    error,
    refresh
  };
}