'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/firebase';
import { User, Tenant, LoginRequest, SignupRequest } from '@/types';
import { detectUserTimezone } from '@/lib/utils/timezone';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  isAuthenticated: boolean;
  
  // NEW: Multi-tenant switching
  availableTenants: Tenant[];
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  canAccessMainTenant: boolean;
  isOnMainTenant: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  
  // NEW: Multi-tenant state
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  const isAuthenticated = !!user && !!tenant;
  const canAccessMainTenant = !!user?.accessibleTenants?.includes(user.tenantId);
  const isOnMainTenant = currentTenantId === user?.tenantId;

  // Load user data from Firestore with retry logic for new Google users
  const loadUserData = async (firebaseUser: FirebaseUser, retryCount = 0): Promise<void> => {
    try {
      console.log(`Loading user data for UID: ${firebaseUser.uid} (attempt ${retryCount + 1})`);
      
      // First, get the user document to find their tenantId
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        console.log(`User doc found, tenantId: ${userData.tenantId}`);
        
        // Smart tenant loading: Use selectedTenant first, fallback to smart default
        let currentTenantId = userData.selectedTenant;
        
        // Fallback to smart default if no selection or invalid selection
        if (!currentTenantId || !userData.accessibleTenants?.includes(currentTenantId)) {
          console.log('No valid selectedTenant found, using fallback logic');
          
          const accessibleTenants = userData.accessibleTenants || [];
          if (accessibleTenants.length === 0) {
            console.error('User has no accessible tenants');
            await signOut(auth);
            return;
          }
          
          // Smart default: main tenant if accessible, otherwise first accessible tenant
          const hasMainAccess = accessibleTenants.includes(userData.tenantId);
          currentTenantId = hasMainAccess ? userData.tenantId : accessibleTenants[0];
          
          console.log(`Using fallback tenant: ${currentTenantId} (hasMainAccess: ${hasMainAccess})`);
        } else {
          console.log(`Using selectedTenant: ${currentTenantId}`);
        }
        
        // Load the selected tenant document
        const tenantDoc = await getDoc(doc(db, 'tenants', currentTenantId));
        
        if (!tenantDoc.exists()) {
          console.error(`Tenant document not found: ${currentTenantId}`);
          await signOut(auth);
          return;
        }
        
        const tenantData = tenantDoc.data() as Tenant;
        
        // Load all accessible tenant documents for switching
        const accessibleTenants = userData.accessibleTenants || [];
        console.log(`Loading ${accessibleTenants.length} accessible tenants`);
        
        const tenantDocs = await Promise.all(
          accessibleTenants.map(id => getDoc(doc(db, 'tenants', id)))
        );
        
        const validTenants = tenantDocs
          .filter(doc => doc.exists())
          .map(doc => doc.data() as Tenant);
        
        console.log(`Loaded ${validTenants.length} valid tenants`);
        
        // Set all state
        setUser(userData);
        setTenant(tenantData);
        setAvailableTenants(validTenants);
        setCurrentTenantId(currentTenantId);
        
        console.log('Multi-tenant auth setup complete');
      } else {
        // If user document doesn't exist and we haven't retried much, wait and retry
        // This handles the race condition with Google OAuth document creation
        if (retryCount < 3) {
          console.log(`User document not found, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000 + (retryCount * 500))); // Exponential backoff
          return loadUserData(firebaseUser, retryCount + 1);
        }
        
        console.error('User document not found after retries');
        console.error('This suggests the document creation in signup/signInWithGoogle failed');
        await signOut(auth);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      await signOut(auth);
    }
  };

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await loadUserData(firebaseUser);
      } else {
        setUser(null);
        setTenant(null);
        setAvailableTenants([]);
        setCurrentTenantId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (data: LoginRequest): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // User data will be loaded automatically by onAuthStateChanged
      // Loading state will be managed by onAuthStateChanged callback
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (data: SignupRequest): Promise<void> => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;
      
      // Generate company name from first name if not provided
      const firstName = data.name.trim().split(' ')[0] || 'My';
      const companyName = data.companyName || `${firstName}'s Company`;
      
      // Create tenant document (using UID as tenant ID)
      const tenant: Tenant = {
        id: firebaseUser.uid,
        name: companyName,
        plan: 'free',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          webhooks: {},
          apiKeys: {},
          branding: {
            companyName: companyName,
          },
          features: {
            smsEnabled: true,
            callsEnabled: true,
            maxAgents: 5,
            maxContacts: 1000
          }
        },
        usage: {
          smsCount: 0,
          callMinutes: 0,
          agentCount: 0,
          contactCount: 0,
          lastReset: new Date().toISOString()
        },
        profile: {
          firstName: '',
          lastName: '',
          email: data.email,
          phone: ''
        }
      };

      // Split the full name into first and last name for profile
      const nameParts = data.name.trim().split(' ');
      const profileFirstName = nameParts[0] || '';
      const profileLastName = nameParts.slice(1).join(' ') || '';
      
      // Update the profile with the parsed names
      tenant.profile!.firstName = profileFirstName;
      tenant.profile!.lastName = profileLastName;

      // Create user document (ROOT USER)
      const user: User = {
        uid: firebaseUser.uid,
        email: data.email,
        name: data.name,
        tenantId: firebaseUser.uid,
        role: 'owner',
        permissions: ['all'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // NEW: Multi-tenant support fields
        accessibleTenants: [firebaseUser.uid], // Root user has access to their own tenant
        selectedTenant: firebaseUser.uid, // Root user starts on their main tenant
        status: 'active',

        onboardingCompleted: true,

        // Auto-detect timezone
        timezone: detectUserTimezone()
      };

      // Save both documents to Firestore
      await Promise.all([
        setDoc(doc(db, 'tenants', firebaseUser.uid), tenant),
        setDoc(doc(db, 'users', firebaseUser.uid), user)
      ]);

      // onAuthStateChanged will handle loading the user data and setting loading to false

    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to allow users to choose different Google accounts
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      // Check if this is a new user (doesn't have Firestore documents)
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        // This is a new user - create Firestore documents
        const displayName = firebaseUser.displayName || '';
        const email = firebaseUser.email || '';
        
        // Extract company name from email domain or use a default
        const emailDomain = email.split('@')[1] || '';
        const companyName = emailDomain.split('.')[0] || 'My Company';
        
        // Create tenant document
        const tenant: Tenant = {
          id: firebaseUser.uid,
          name: companyName.charAt(0).toUpperCase() + companyName.slice(1), // Capitalize first letter
          plan: 'free',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            webhooks: {},
            apiKeys: {},
            branding: {
              companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
            },
            features: {
              smsEnabled: true,
              callsEnabled: true,
              maxAgents: 5,
              maxContacts: 1000
            }
          },
          usage: {
            smsCount: 0,
            callMinutes: 0,
            agentCount: 0,
            contactCount: 0,
            lastReset: new Date().toISOString()
          },
          profile: {
            firstName: '',
            lastName: '',
            email: email,
            phone: ''
          }
        };

        // Parse the display name for first/last name
        if (displayName) {
          const nameParts = displayName.trim().split(' ');
          tenant.profile!.firstName = nameParts[0] || '';
          tenant.profile!.lastName = nameParts.slice(1).join(' ') || '';
        }

        // Create user document (ROOT USER)
        const user: User = {
          uid: firebaseUser.uid,
          email: email,
          name: displayName || email.split('@')[0], // Use display name or email username
          tenantId: firebaseUser.uid,
          role: 'owner',
          permissions: ['all'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),

          // NEW: Multi-tenant support fields
          accessibleTenants: [firebaseUser.uid], // Root user has access to their own tenant
          selectedTenant: firebaseUser.uid, // Root user starts on their main tenant
          status: 'active',

          onboardingCompleted: true,

          // Auto-detect timezone
          timezone: detectUserTimezone()
        };

        // Save both documents to Firestore
        console.log('Creating Firestore documents for new Google user:', firebaseUser.uid);
        console.log('Tenant data:', tenant);
        console.log('User data:', user);
        
        await setDoc(doc(db, 'tenants', firebaseUser.uid), tenant);
        console.log('Tenant document created successfully');
        
        await setDoc(doc(db, 'users', firebaseUser.uid), user);
        console.log('User document created successfully');
      } else {
        // Existing user - update lastLoginAt
        const existingUser = userDoc.data() as User;
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...existingUser,
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // onAuthStateChanged will handle loading the user data
      
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // State will be cleared automatically by onAuthStateChanged
      // Redirect to login
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getToken = async (): Promise<string | null> => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting Firebase token:', error);
      return null;
    }
  };

  // NEW: Switch between accessible tenants
  const switchTenant = async (newTenantId: string): Promise<void> => {
    try {
      console.log(`Switching to tenant: ${newTenantId}`);
      
      // Validate user has access to this tenant
      if (!user?.accessibleTenants?.includes(newTenantId)) {
        throw new Error('Access denied to tenant');
      }
      
      // Call backend API to update selectedTenant in Firestore
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/switch-tenant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selectedTenantId: newTenantId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to switch tenant');
      }

      // Update local state
      const existingTenant = availableTenants.find(t => t.id === newTenantId);
      
      if (existingTenant) {
        // Use cached tenant data
        console.log('Using cached tenant data');
        setTenant(existingTenant);
        setCurrentTenantId(newTenantId);
      } else {
        // Load tenant data fresh (shouldn't happen but safety net)
        console.log('Loading fresh tenant data');
        const tenantDoc = await getDoc(doc(db, 'tenants', newTenantId));
        
        if (!tenantDoc.exists()) {
          throw new Error('Tenant not found');
        }
        
        const newTenant = tenantDoc.data() as Tenant;
        setTenant(newTenant);
        setCurrentTenantId(newTenantId);
        
        // Add to available tenants cache
        setAvailableTenants(prev => {
          const exists = prev.find(t => t.id === newTenantId);
          return exists ? prev : [...prev, newTenant];
        });
      }
      
      console.log(`Successfully switched to tenant: ${newTenantId}`);
      
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    tenant,
    loading,
    login,
    signup,
    signInWithGoogle,
    logout,
    getToken,
    isAuthenticated,
    
    // NEW: Multi-tenant switching
    availableTenants,
    currentTenantId,
    switchTenant,
    canAccessMainTenant,
    isOnMainTenant,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};