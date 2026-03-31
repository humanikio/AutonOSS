'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  initials?: string;
  // Add other user properties as needed
}

export const useUserData = (userIds: string[]) => {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken, tenant } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      console.log('👥 useUserData: Fetching users for IDs:', userIds);
      console.log('👥 useUserData: Tenant ID:', tenant?.id);
      
      if (!tenant?.id || userIds.length === 0) {
        console.log('👥 useUserData: No tenant or empty userIds, clearing users');
        setUsers({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Fetch user data for each userId
        const userPromises = userIds.map(async (userId) => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${tenant.id}/user/${userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (!response.ok) {
              // If user not found or error, skip this user
              console.warn(`Failed to fetch user ${userId}:`, response.status);
              return null;
            }

            const userData = await response.json();
            return { userId, user: userData.data };
          } catch (error) {
            console.warn(`Error fetching user ${userId}:`, error);
            return null;
          }
        });

        const results = await Promise.all(userPromises);
        const usersData: Record<string, User> = {};

        results.forEach((result) => {
          if (result) {
            // Generate initials if not provided
            const name = result.user.name || result.user.email?.split('@')[0] || 'User';
            const initials = name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
            
            usersData[result.userId] = {
              ...result.user,
              initials: result.user.initials || initials
            };
            
            console.log(`👥 useUserData: Loaded user ${result.userId}:`, {
              name: result.user.name,
              avatarUrl: result.user.avatarUrl,
              initials: usersData[result.userId].initials
            });
          }
        });

        console.log('👥 useUserData: Final users data:', usersData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userIds.join(','), tenant?.id, getToken]);

  return { users, loading, error };
};