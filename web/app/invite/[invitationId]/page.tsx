'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { invitationsAPI, type GetInvitationResponse } from '@/lib/api/invitations';
import { Building2, Users, Shield, User, Crown, Calendar, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { detectUserTimezone } from '@/lib/utils/timezone';

interface InvitePageProps {
  params: Promise<{
    invitationId: string;
  }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const resolvedParams = use(params);
  const { invitationId } = resolvedParams;
  const [invitationData, setInvitationData] = useState<GetInvitationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const { signInWithGoogle, user, getToken, loading } = useAuth();
  const router = useRouter();

  // Effect to handle redirect after authentication
  useEffect(() => {
    if (shouldRedirect && user && !loading) {
      console.log('✅ User authenticated, redirecting to dashboard');
      setSuccessMessage('Welcome! Redirecting to your dashboard...');
      setTimeout(() => router.push('/'), 800); // Small delay to show the message
      setShouldRedirect(false);
    }
  }, [shouldRedirect, user, loading, router]);

  // Timeout fallback for redirect
  useEffect(() => {
    if (shouldRedirect) {
      const timeout = setTimeout(() => {
        if (shouldRedirect) {
          console.log('⚠️ Auth timeout, redirecting anyway');
          router.push('/');
          setShouldRedirect(false);
        }
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeout);
    }
  }, [shouldRedirect, router]);

  useEffect(() => {
    loadInvitationData();
  }, [invitationId]);

  useEffect(() => {
    // If user is already logged in, check if they can accept the invitation
    if (user && invitationData) {
      // Pre-fill form with user data
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || invitationData.invitation.email
      }));
    }
  }, [user, invitationData]);

  const loadInvitationData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await invitationsAPI.getInvitation(invitationId);
      setInvitationData(data);
      
      // Pre-fill email from invitation
      setFormData(prev => ({
        ...prev,
        email: data.invitation.email,
        name: data.invitation.name
      }));
      
    } catch (error) {
      console.error('Error loading invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationData) return;
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsAccepting(true);
    setError('');

    try {
      // Create Firebase account directly (not using signup method to avoid creating a new tenant)
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // Accept invitation with Firebase user data
      const token = await userCredential.user.getIdToken();
      
      await invitationsAPI.acceptInvitation(
        invitationId,
        {
          uid: userCredential.user.uid,
          email: userCredential.user.email || formData.email,
          name: formData.name,
          timezone: detectUserTimezone()
        },
        token
      );

      setSuccessMessage('Account created successfully! Setting up your account...');
      
      // Trigger redirect when user is authenticated
      console.log('✅ Invitation accepted, waiting for auth context to update...');
      setShouldRedirect(true);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!invitationData) return;

    setIsAccepting(true);
    setError('');

    try {
      // Use Firebase Auth directly to get the user credential
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      
      // Accept invitation with Google user data
      const token = await userCredential.user.getIdToken();
      
      await invitationsAPI.acceptInvitation(
        invitationId,
        {
          uid: userCredential.user.uid,
          email: userCredential.user.email || invitationData.invitation.email,
          name: userCredential.user.displayName || invitationData.invitation.name,
          timezone: detectUserTimezone()
        },
        token
      );

      setSuccessMessage('Account created successfully! Setting up your account...');
      
      // Trigger redirect when user is authenticated
      console.log('✅ Invitation accepted, waiting for auth context to update...');
      setShouldRedirect(true);

    } catch (error) {
      console.error('Error accepting invitation with Google:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleAcceptWithExistingAccount = async () => {
    if (!invitationData || !user) return;

    setIsAccepting(true);
    setError('');

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await invitationsAPI.acceptInvitation(
        invitationId,
        {
          uid: user.uid,
          email: user.email || invitationData.invitation.email,
          name: user.name || invitationData.invitation.name
        },
        token
      );

      setSuccessMessage('Invitation accepted successfully!');
      
      // User is already authenticated, redirect immediately
      console.log('✅ Existing user invitation accepted, redirecting to dashboard');
      router.push('/');

    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      default: return User;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
          <p className="text-gray-600 mb-6">
            This invitation may have expired or been already used.
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  const { invitation, tenant, invitedByUser } = invitationData;
  const isExpired = new Date(invitation.expiresAt) < new Date();
  const companyName = tenant.settings?.branding?.companyName || tenant.name || 'Company';
  const RoleIcon = getRoleIcon(invitation.role);

  return (
    <div className="min-h-screen relative">
      {/* Full-screen Video Background */}
      <div className="absolute inset-0" style={{backgroundColor: '#00c6ff'}}>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <video 
          autoPlay 
          loop 
          muted 
          className="absolute inset-0 w-full h-full object-cover scale-110"
        >
          <source src="/videos/mascotFunny.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Desktop Layout - Side by Side */}
      <div className="hidden lg:flex fixed inset-0 z-10">
        {/* Left Column - Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
          <div className="max-w-sm w-full max-h-[90vh] overflow-y-auto py-8 scrollbar-thin scrollbar-track-gray-100">
            {/* Logo/Brand Section */}
            <div className="mb-8 text-center">
              <div className="h-16 w-16 mx-auto mb-6">
                <img 
                  src="/logo/auton-logo.png" 
                  alt="Company Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Join {companyName}</h1>
              <p className="text-gray-600 mb-8">You've been invited to join the team</p>
            </div>

            {/* Invitation Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <RoleIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{invitation.name}</h3>
                    <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                      {invitation.role}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{invitation.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>{companyName}</span>
                    </div>
                    {invitation.subAccounts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Access to {invitation.subAccounts.length} subaccount{invitation.subAccounts.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Invited by {invitedByUser.name} on {formatDate(invitation.invitedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Check for expired invitation */}
            {isExpired ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-red-900 mb-2">Invitation Expired</h2>
                <p className="text-red-700 text-sm">
                  This invitation expired on {formatDate(invitation.expiresAt)}. 
                  Please contact {invitedByUser.name} for a new invitation.
                </p>
              </div>
            ) : invitation.status !== 'pending' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-yellow-900 mb-2">Invitation Already Used</h2>
                <p className="text-yellow-700 text-sm">
                  This invitation has already been accepted.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700">{successMessage}</p>
                    <p className="text-xs text-green-600 mt-1">Redirecting you to the dashboard...</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* If user is already logged in */}
                {user ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        You're signed in as <strong>{user.email}</strong>
                      </p>
                    </div>
                    <button
                      onClick={handleAcceptWithExistingAccount}
                      disabled={isAccepting}
                      className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAccepting ? 'Accepting Invitation...' : 'Accept Invitation'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Google OAuth Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignUp}
                      disabled={isAccepting}
                      className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">OR</span>
                      </div>
                    </div>

                    <form onSubmit={handleCreateAccount} className="space-y-4">
                      {/* Name Field */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-2">
                          Full Name
                        </label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 placeholder-gray-400 text-sm"
                          placeholder="Your full name"
                        />
                      </div>

                      {/* Email Field */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-2">
                          Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 placeholder-gray-400 text-sm"
                          placeholder="Email address"
                        />
                      </div>

                      {/* Password Field */}
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-2">
                          Password
                        </label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 placeholder-gray-400 text-sm"
                          placeholder="Create a password"
                        />
                      </div>

                      {/* Confirm Password Field */}
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-800 mb-2">
                          Confirm Password
                        </label>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 placeholder-gray-400 text-sm"
                          placeholder="Confirm your password"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isAccepting}
                        className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isAccepting ? 'Creating Account...' : 'Create Account & Join Team'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Video (hidden on mobile, visible on desktop) */}
        <div className="flex-1 relative overflow-hidden" style={{backgroundColor: '#00c6ff'}}>
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
          <video 
            autoPlay 
            loop 
            muted 
            className="absolute inset-0 w-full h-full object-cover scale-110"
          >
            <source src="/videos/mascotFunny.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Mobile Layout - Modal over video */}
      <div className="lg:hidden fixed inset-0 flex items-center justify-center px-4 z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-white/20 max-h-[90vh] overflow-y-auto scrollbar-thin">
          {/* Logo/Brand Section */}
          <div className="mb-6 text-center">
            <div className="h-12 w-12 mx-auto mb-4">
              <img 
                src="/logo/auton-logo.png" 
                alt="Company Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Join {companyName}</h1>
            <p className="text-gray-600 text-sm">You've been invited to join the team</p>
          </div>

          {/* Invitation Details - Mobile */}
          <div className="bg-gray-50/80 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <RoleIcon className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-2">{invitation.name}</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p>{invitation.email}</p>
                <p>Role: {invitation.role}</p>
                {invitation.subAccounts.length > 0 && (
                  <p>Access to {invitation.subAccounts.length} subaccount{invitation.subAccounts.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          </div>

          {/* Rest of the form content - same as desktop but more compact */}
          {isExpired ? (
            <div className="bg-red-50/90 border border-red-200 rounded-lg p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h2 className="text-sm font-semibold text-red-900 mb-1">Invitation Expired</h2>
              <p className="text-red-700 text-xs">
                This invitation has expired. Please contact {invitedByUser.name} for a new invitation.
              </p>
            </div>
          ) : invitation.status !== 'pending' ? (
            <div className="bg-yellow-50/90 border border-yellow-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h2 className="text-sm font-semibold text-yellow-900 mb-1">Already Used</h2>
              <p className="text-yellow-700 text-xs">This invitation has already been accepted.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50/90 border border-red-200 rounded-md p-3 text-xs text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-50/90 border border-green-200 rounded-md p-3 text-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <p className="text-xs text-green-700">{successMessage}</p>
                </div>
              )}

              {user ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-600 text-center mb-3">
                    Signed in as <strong>{user.email}</strong>
                  </p>
                  <button
                    onClick={handleAcceptWithExistingAccount}
                    disabled={isAccepting}
                    className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50"
                  >
                    {isAccepting ? 'Accepting...' : 'Accept Invitation'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={isAccepting}
                    className="w-full flex items-center justify-center gap-2 bg-white/80 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 hover:bg-white/90 transition-colors text-sm disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-white/95 text-gray-500">OR</span>
                    </div>
                  </div>

                  <form onSubmit={handleCreateAccount} className="space-y-3">
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white/90"
                      placeholder="Full name"
                    />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white/90"
                      placeholder="Email"
                    />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white/90"
                      placeholder="Password"
                    />
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white/90"
                      placeholder="Confirm password"
                    />
                    <button
                      type="submit"
                      disabled={isAccepting}
                      className="w-full bg-black hover:bg-gray-800 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm disabled:opacity-50"
                    >
                      {isAccepting ? 'Creating...' : 'Create Account'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}