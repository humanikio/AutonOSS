'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI, type TeamUser, type SubAccount, type InviteUserRequest, type CreateSubaccountRequest } from '@/lib/api/users';
import { 
  Users, 
  Edit, 
  Trash2, 
  Shield, 
  User,
  Crown,
  Building2,
  UserPlus,
  X,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowLeft
} from 'lucide-react';
import { getUserPermissions, getUserDisplayRole, getRoleBadgeStyles, getRoleIcon } from '@/lib/utils/roleUtils';

// Types imported from API module

export default function UsersPage() {
  const router = useRouter();
  const { user, tenant, getToken } = useAuth();
  const permissions = getUserPermissions(user, tenant);
  
  // Redirect if user doesn't have access to users section
  useEffect(() => {
    if (user && tenant && !permissions.canAccessUsersSection) {
      router.push('/settings');
    }
  }, [user, tenant, permissions.canAccessUsersSection, router]);
  
  const [activeTab, setActiveTab] = useState('team');
  const [isLoading, setIsLoading] = useState(false);
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateSubAccountModalOpen, setIsCreateSubAccountModalOpen] = useState(false);
  const [isEditSubAccountModalOpen, setIsEditSubAccountModalOpen] = useState(false);
  const [editingSubAccount, setEditingSubAccount] = useState<SubAccount | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  
  // Data states
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  
  // Auto-clear success/error messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);
  
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);
  
  // Form states
  const [inviteForm, setInviteForm] = useState<InviteUserRequest>({
    email: '',
    name: '',
    role: 'user',
    subAccounts: [],
    hasMainAccountAccess: false  // Default to no main account access
  });
  
  const [subAccountForm, setSubAccountForm] = useState<CreateSubaccountRequest>({
    name: '',
    description: ''
  });

  const [editSubAccountForm, setEditSubAccountForm] = useState({
    name: '',
    description: ''
  });

  const [editUserForm, setEditUserForm] = useState({
    role: 'user' as 'admin' | 'user',
    subAccounts: [] as string[]
  });

  // Load data on component mount
  useEffect(() => {
    if (tenant?.id) {
      loadTeamUsers();
      loadSubAccounts();
    }
  }, [tenant?.id]);

  const loadTeamUsers = async () => {
    if (!tenant?.id) return;
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const result = await usersAPI.getTeamUsers(tenant.id, token);
      setTeamUsers(result.users);
    } catch (error) {
      console.error('Error loading team users:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load team users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubAccounts = async () => {
    if (!tenant?.id) return;
    
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const result = await usersAPI.getSubaccounts(tenant.id, token);
      setSubAccounts(result.subaccounts);
    } catch (error) {
      console.error('Error loading subaccounts:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load subaccounts');
    }
  };

  const handleInviteUser = async () => {
    if (!tenant?.id) return;
    
    setIsOperationLoading(true);
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.inviteUser(tenant.id, inviteForm, token);
      
      setSuccessMessage(`Invitation sent to ${inviteForm.email}`);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', name: '', role: 'user', subAccounts: [], hasMainAccountAccess: false });
      
      // Reload users to show any immediate changes
      await loadTeamUsers();
    } catch (error) {
      console.error('Error inviting user:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleCreateSubAccount = async () => {
    if (!tenant?.id) return;
    
    setIsOperationLoading(true);
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.createSubaccount(tenant.id, subAccountForm, token);
      
      setSuccessMessage(`Subaccount "${subAccountForm.name}" created successfully`);
      setIsCreateSubAccountModalOpen(false);
      setSubAccountForm({ name: '', description: '' });
      
      // Reload subaccounts
      await loadSubAccounts();
    } catch (error) {
      console.error('Error creating subaccount:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create subaccount');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    if (!tenant?.id) return;
    
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.removeUser(tenant.id, userId, token);
      
      setSuccessMessage('User removed successfully');
      await loadTeamUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to remove user');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    if (!tenant?.id) return;
    
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const newStatus: 'active' | 'suspended' = currentStatus === 'active' ? 'suspended' : 'active';
      
      await usersAPI.updateUserStatus(tenant.id, userId, { status: newStatus }, token);
      
      setSuccessMessage(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      await loadTeamUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update user status');
    }
  };

  const handleDeleteSubaccount = async (subAccountId: string) => {
    if (!confirm('Are you sure you want to delete this subaccount? This action cannot be undone.')) return;
    if (!tenant?.id) return;
    
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.deleteSubaccount(tenant.id, subAccountId, token);
      
      setSuccessMessage('Subaccount deleted successfully');
      await loadSubAccounts();
      await loadTeamUsers(); // Reload users as their access may have changed
    } catch (error) {
      console.error('Error deleting subaccount:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete subaccount');
    }
  };

  const handleEditSubaccount = (subAccount: SubAccount) => {
    setEditingSubAccount(subAccount);
    setEditSubAccountForm({
      name: subAccount.name,
      description: subAccount.description || ''
    });
    setIsEditSubAccountModalOpen(true);
  };

  const handleUpdateSubaccount = async () => {
    if (!editingSubAccount || !tenant?.id) return;
    
    setErrorMessage('');
    setIsOperationLoading(true);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.updateSubaccount(
        tenant.id, 
        editingSubAccount.subTenantId, 
        {
          name: editSubAccountForm.name,
          description: editSubAccountForm.description
        }, 
        token
      );
      
      setSuccessMessage('Subaccount updated successfully');
      setIsEditSubAccountModalOpen(false);
      setEditingSubAccount(null);
      setEditSubAccountForm({ name: '', description: '' });
      
      // Reload subaccounts
      await loadSubAccounts();
    } catch (error) {
      console.error('Error updating subaccount:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update subaccount');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleGrantSubaccountAccess = async (userId: string, subAccountIds: string[]) => {
    if (!tenant?.id || subAccountIds.length === 0) return;
    
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.grantSubaccountAccess(tenant.id, userId, subAccountIds, token);
      
      setSuccessMessage(`Granted access to ${subAccountIds.length} subaccount(s)`);
      await loadTeamUsers();
    } catch (error) {
      console.error('Error granting subaccount access:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to grant subaccount access');
    }
  };

  const handleEditUser = (user: TeamUser) => {
    // Don't allow editing owner role
    if (user.role === 'owner') {
      setErrorMessage('Cannot edit owner account permissions');
      return;
    }
    
    setEditingUser(user);
    setEditUserForm({
      role: user.role,
      subAccounts: user.accessibleTenants || []
    });
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !tenant?.id) return;
    
    setIsOperationLoading(true);
    setErrorMessage('');
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await usersAPI.updateUserRole(
        tenant.id, 
        editingUser.uid, 
        {
          role: editUserForm.role,
          subAccounts: editUserForm.subAccounts.filter(id => id !== tenant.id),
          hasMainAccountAccess: editUserForm.subAccounts.includes(tenant.id)
        }, 
        token
      );
      
      setSuccessMessage(`User ${editingUser.name} updated successfully`);
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      setEditUserForm({ role: 'user', subAccounts: [] });
      
      // Reload users to show changes
      await loadTeamUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsOperationLoading(false);
    }
  };

  // Helper function to get role icon component for a team user
  const getTeamUserRoleIcon = (teamUser: TeamUser) => {
    const iconName = getRoleIcon(teamUser as any, tenant);
    switch (iconName) {
      case 'Crown': return Crown;
      case 'Shield': return Shield;
      default: return User;
    }
  };

  // Helper function to get display role for a team user
  const getTeamUserDisplayRole = (teamUser: TeamUser) => {
    // Check if this is the root user (uid matches tenant id)
    if (teamUser.uid === tenant?.id) {
      return 'ROOT USER';
    }
    // Check if user has isAdmin flag
    if ((teamUser as any).isAdmin) {
      return 'Admin';
    }
    return 'User';
  };

  // Helper function to get badge color for a team user
  const getTeamUserBadgeColor = (teamUser: TeamUser) => {
    return getRoleBadgeStyles(teamUser as any, tenant);
  };

  const tabs = [
    { id: 'team', label: 'Team Members', icon: Users },
    { id: 'subaccounts', label: 'Subaccounts', icon: Building2 }
  ];

  // Show loading while checking permissions
  if (!user || !tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Don't render the page if user doesn't have access
  if (!permissions.canAccessUsersSection) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access the Users & Teams section.</p>
          <button
            onClick={() => router.push('/settings')}
            className="btn-primary"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Back Button */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Users & Teams</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage team members and subaccounts for your organization
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          {permissions.canManageUsers && (
            <>
              <button
                onClick={() => setIsCreateSubAccountModalOpen(true)}
                className="btn-secondary"
              >
                <Building2 className="h-4 w-4" />
                Create Subaccount
              </button>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="btn-primary"
              >
                <UserPlus className="h-4 w-4" />
                Invite User
              </button>
            </>
          )}
        </div>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">{successMessage}</span>
          </div>
        )}
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{errorMessage}</span>
            </div>
            {errorMessage.includes('Authentication required') && (
              <p className="text-xs text-red-600 mt-1 ml-6">
                Please try refreshing the page or logging in again.
              </p>
            )}
            {(errorMessage.includes('Failed to fetch') || errorMessage.includes('TypeError: fetch failed')) && (
              <p className="text-xs text-red-600 mt-1 ml-6">
                Check if the backend server is running on port 8000.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'team' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
            {isLoading ? (
              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
            ) : (
              <span className="text-sm text-gray-600">
                {teamUsers.length} member{teamUsers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Loading team members...</span>
            </div>
          ) : (
            <div className="space-y-4">
            {teamUsers.map((teamUser) => {
              const RoleIcon = getTeamUserRoleIcon(teamUser);
              const displayRole = getTeamUserDisplayRole(teamUser);
              const badgeColor = getTeamUserBadgeColor(teamUser);
              const isRootUser = teamUser.uid === tenant?.id;
              
              return (
                <div key={teamUser.uid} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {teamUser.avatarUrl ? (
                        <img 
                          src={teamUser.avatarUrl} 
                          alt={teamUser.name} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-medium text-sm">
                            {teamUser.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{teamUser.name}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {displayRole}
                        </span>
                        {teamUser.status === 'suspended' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Suspended
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {teamUser.email}
                        </span>
                        {teamUser.lastLoginAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last login: {new Date(teamUser.lastLoginAt).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          Access to {teamUser.accessibleTenants.length} account{teamUser.accessibleTenants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isRootUser && permissions.canManageUsers && (
                      <>
                        <button
                          onClick={() => handleEditUser(teamUser)}
                          className={`p-2 rounded-md ${
                            teamUser.role === 'owner' 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-blue-600'
                          }`}
                          title={teamUser.role === 'owner' ? 'Cannot edit owner permissions' : 'Edit user permissions'}
                          disabled={teamUser.role === 'owner'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(teamUser.uid, teamUser.status)}
                          className={`px-3 py-1 rounded-md text-sm font-medium ${
                            teamUser.status === 'active' 
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {teamUser.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleRemoveUser(teamUser.uid)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-md"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'subaccounts' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Subaccounts</h2>
            <span className="text-sm text-gray-600">
              {subAccounts.length} subaccount{subAccounts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-4">
            {subAccounts.map((subAccount) => (
              <div key={subAccount.subTenantId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">{subAccount.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {subAccount.userCount} member{subAccount.userCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {new Date(subAccount.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        subAccount.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subAccount.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditSubaccount(subAccount)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-md" 
                    title="Edit subaccount"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteSubaccount(subAccount.subTenantId)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-md"
                    title="Delete subaccount"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {subAccounts.length === 0 && (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-2">No subaccounts yet</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Create subaccounts to organize your team and data
                </p>
                <button
                  onClick={() => setIsCreateSubAccountModalOpen(true)}
                  className="btn-primary"
                >
                  Create Your First Subaccount
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                  className="input"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Access
                </label>
                
                {/* Main Account Access */}
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={inviteForm.hasMainAccountAccess || false}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, hasMainAccountAccess: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-800">
                      Main Account ({tenant?.name})
                    </span>
                  </label>
                  <p className="mt-1 ml-6 text-xs text-gray-600">
                    Grant access to the main tenant account and its resources
                  </p>
                </div>
                
                {/* Subaccounts */}
                {subAccounts.length > 0 && (
                  <>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Subaccounts:</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {subAccounts.map((subAccount) => (
                        <label key={subAccount.subTenantId} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={inviteForm.subAccounts?.includes(subAccount.subTenantId) || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteForm(prev => ({
                                  ...prev,
                                  subAccounts: [...(prev.subAccounts || []), subAccount.subTenantId]
                                }));
                              } else {
                                setInviteForm(prev => ({
                                  ...prev,
                                  subAccounts: (prev.subAccounts || []).filter(id => id !== subAccount.subTenantId)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">{subAccount.name}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
                
                {(!inviteForm.hasMainAccountAccess && (!inviteForm.subAccounts || inviteForm.subAccounts.length === 0)) && (
                  <p className="mt-2 text-xs text-red-600">
                    ⚠️ User must have access to at least one account
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={
                  isOperationLoading || 
                  isLoading || 
                  !inviteForm.email || 
                  !inviteForm.name ||
                  (!inviteForm.hasMainAccountAccess && (!inviteForm.subAccounts || inviteForm.subAccounts.length === 0))
                }
                className="btn-primary"
              >
                {isOperationLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subaccount Modal */}
      {isCreateSubAccountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create Subaccount</h3>
              <button
                onClick={() => setIsCreateSubAccountModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subaccount Name *
                </label>
                <input
                  type="text"
                  value={subAccountForm.name}
                  onChange={(e) => setSubAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Sales Team, Support Department, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={subAccountForm.description}
                  onChange={(e) => setSubAccountForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Brief description of this subaccount's purpose..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateSubAccountModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubAccount}
                disabled={isOperationLoading || isLoading || !subAccountForm.name.trim()}
                className="btn-primary"
              >
                {isOperationLoading ? 'Creating...' : 'Create Subaccount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subaccount Modal */}
      {isEditSubAccountModalOpen && editingSubAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Subaccount</h3>
              <button
                onClick={() => {
                  setIsEditSubAccountModalOpen(false);
                  setEditingSubAccount(null);
                  setEditSubAccountForm({ name: '', description: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subaccount Name *
                </label>
                <input
                  type="text"
                  value={editSubAccountForm.name}
                  onChange={(e) => setEditSubAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Sales Team, Support Department, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editSubAccountForm.description}
                  onChange={(e) => setEditSubAccountForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="Brief description of this subaccount's purpose..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsEditSubAccountModalOpen(false);
                  setEditingSubAccount(null);
                  setEditSubAccountForm({ name: '', description: '' });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubaccount}
                disabled={isOperationLoading || isLoading || !editSubAccountForm.name.trim()}
                className="btn-primary"
              >
                {isOperationLoading ? 'Updating...' : 'Update Subaccount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit User Permissions</h3>
              <button
                onClick={() => {
                  setIsEditUserModalOpen(false);
                  setEditingUser(null);
                  setEditUserForm({ role: 'user', subAccounts: [] });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  {editingUser.avatarUrl ? (
                    <img 
                      src={editingUser.avatarUrl} 
                      alt={editingUser.name} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-medium text-sm">
                        {editingUser.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{editingUser.name}</h4>
                  <p className="text-sm text-gray-600">{editingUser.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                  className="input"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subaccount Access
                </label>
                
                {/* Account Access Management */}
                <div className="mb-3">
                  <label className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      checked={editUserForm.subAccounts.includes(tenant?.id || '')}
                      onChange={(e) => {
                        const mainAccountId = tenant?.id || '';
                        if (e.target.checked) {
                          setEditUserForm(prev => ({
                            ...prev,
                            subAccounts: [...prev.subAccounts.filter(id => id !== mainAccountId), mainAccountId]
                          }));
                        } else {
                          setEditUserForm(prev => ({
                            ...prev,
                            subAccounts: prev.subAccounts.filter(id => id !== mainAccountId)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm font-medium text-blue-800">
                      Main Account ({tenant?.name})
                    </span>
                  </label>
                </div>
                
                {/* Subaccounts */}
                {subAccounts.length > 0 ? (
                  <>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Additional subaccounts:
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {subAccounts.map((subAccount) => (
                        <label key={subAccount.subTenantId} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editUserForm.subAccounts.includes(subAccount.subTenantId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditUserForm(prev => ({
                                  ...prev,
                                  subAccounts: [...prev.subAccounts, subAccount.subTenantId]
                                }));
                              } else {
                                setEditUserForm(prev => ({
                                  ...prev,
                                  subAccounts: prev.subAccounts.filter(id => id !== subAccount.subTenantId)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">{subAccount.name}</span>
                          <span className="ml-auto text-xs text-gray-500">
                            {subAccount.userCount} member{subAccount.userCount !== 1 ? 's' : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-600">
                      No subaccounts available. Create subaccounts to grant additional access.
                    </p>
                  </div>
                )}
              </div>

              {/* Current Access Summary */}
              <div className={`p-3 rounded-md border ${
                editUserForm.subAccounts.length === 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <h5 className={`text-xs font-medium mb-1 ${
                  editUserForm.subAccounts.length === 0 ? 'text-red-800' : 'text-green-800'
                }`}>
                  Access Summary:
                </h5>
                <p className={`text-xs ${
                  editUserForm.subAccounts.length === 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  • Total accounts selected: {editUserForm.subAccounts.length}
                  {editUserForm.subAccounts.includes(tenant?.id || '') && (
                    <><br />• Main account: ✓ Included</>
                  )}
                  {editUserForm.subAccounts.filter(id => id !== tenant?.id).length > 0 && (
                    <><br />• Subaccounts: {editUserForm.subAccounts.filter(id => id !== tenant?.id).length}</>
                  )}
                  {editUserForm.subAccounts.length === 0 && (
                    <><br />⚠️ User must have access to at least one account</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsEditUserModalOpen(false);
                  setEditingUser(null);
                  setEditUserForm({ role: 'user', subAccounts: [] });
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={isOperationLoading || editUserForm.subAccounts.length === 0}
                className="btn-primary"
              >
                {isOperationLoading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}