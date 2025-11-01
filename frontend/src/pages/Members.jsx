import React, { useEffect, useState } from "react";
import { 
  getMembers, 
  addMember, 
  updateMember, 
  deleteMember, 
  approveMember, 
  getUserRole,
  getMembersDropdown  // ADD THIS
} from "../api";

export default function Members() {
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({
    name: "", role: "Member", phone: "", email: "", idNumber: "", username: "", password: "", dob: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewMember, setViewMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchMembers();
    setUserRole(getUserRole());
  }, []);

  const fetchMembers = async () => {
  setLoading(true);
  setError('');
  try {
    const response = await getMembers();
    console.log('🔍 API Response:', response);
    
    let membersData = [];
    
    if (Array.isArray(response.data)) {
      membersData = response.data;
    } else {
      console.warn('⚠️ Unexpected API response format:', response.data);
      membersData = [];
    }
    
    console.log('🔍 Final members data:', membersData);
    setMembers(membersData);
  } catch (err) {
    console.error('Failed to fetch members', err);
    setError('Failed to load members');
    setMembers([]);
  } finally {
    setLoading(false);
  }
};
  
const handleAdd = async () => {
  const errs = {};
  if (!newMember.name) errs.name = 'Name is required';
  if (!newMember.phone) errs.phone = 'Phone is required';
  if (!newMember.email) errs.email = 'Email is required';
  if (!newMember.member_code) errs.member_code = 'Member code is required';
  if (!newMember.username) errs.username = 'Username required';
  if (!newMember.password || newMember.password.length < 6) errs.password = 'Password min 6 chars';
  
  setFormErrors(errs);
  if (Object.keys(errs).length > 0) return;

  try {
    setLoading(true);
    
    // Prepare data for backend
    const memberData = {
      name: newMember.name,
      role: newMember.role,
      phone: newMember.phone,
      email: newMember.email,
      member_code: newMember.member_code,
      username: newMember.username,
      password: newMember.password
    };
    
    await addMember(memberData);
    
    // Reset form
    setNewMember({ 
      name: '', 
      role: 'Member', 
      phone: '', 
      email: '', 
      member_code: '', 
      username: '', 
      password: '', 
      dob: '' 
    });
    
    setFormErrors({});
    await fetchMembers();
    
  } catch (e) {
    console.error('Add member failed', e);
    setError('Add member failed: ' + (e.response?.data?.error || 'Unknown error'));
  } finally {
    setLoading(false);
  }
};
  

  const handleDelete = async (id) => {
    try {
      const ok = window.confirm('Delete this member?');
      if (!ok) return;
      await deleteMember(id);
      await fetchMembers();
    } catch (e) {
      console.error('Delete failed', e);
      setError('Delete failed: ' + (e.response?.data?.error || 'Unknown error'));
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveMember(id);
      await fetchMembers();
    } catch (e) {
      console.error('Approve failed', e);
      setError('Approve failed: ' + (e.response?.data?.error || 'Unknown error'));
    }
  };

  const startEdit = (member) => {
  setEditingId(member.id);
  setEditForm({ 
    name: member.name || '',
    role: member.role || 'Member',
    phone: member.phone || '',
    email: member.email || '',
    member_code: member.member_code || '',
    balance: member.balance || 0
  });
};

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
  try {
    setLoading(true);
    
    // Prepare update data (only include fields that can be updated)
    const updateData = {
      name: editForm.name,
      role: editForm.role,
      phone: editForm.phone,
      email: editForm.email,
      member_code: editForm.member_code
    };
    
    await updateMember(editingId, updateData);
    await fetchMembers();
    cancelEdit();
    
  } catch (e) {
    console.error('Update failed', e);
    setError('Update failed: ' + (e.response?.data?.error || 'Unknown error'));
  } finally {
    setLoading(false);
  }
};  


  const handleView = (member) => {
    setViewMember(member);
  };

  const closeView = () => {
    setViewMember(null);
  };

  // Filter members based on search
  const filteredMembers = Array.isArray(members) 
    ? members.filter(member =>
        member?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member?.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member?.member_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // SAFE member count
  const memberCount = Array.isArray(members) ? members.length : 0;
  const filteredCount = Array.isArray(filteredMembers) ? filteredMembers.length : 0;

  // Check if user can edit/delete (only admins)
  const canEditDelete = userRole === 'Treasurer' || userRole === 'admin';

  return (
    <div className="p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Members
          </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your community members</p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:text-white"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Add Member Card - Only for Admins */}
      {(userRole === 'Treasurer' || userRole === 'admin') && (
        <div className="mb-6 sm:mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">Add New Member</h3>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm">
              +
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input 
                type="text" 
                placeholder="Enter full name" 
                value={newMember.name} 
                onChange={e => setNewMember({...newMember, name: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input 
                type="number" 
                placeholder="eg. 07********" 
                value={newMember.phone} 
                onChange={e => setNewMember({...newMember, phone: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input 
                type="email" 
                placeholder="eg. mercure@gmail.com" 
                value={newMember.email} 
                onChange={e => setNewMember({...newMember, email: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Member Code</label>
              <input 
                type="number" 
                placeholder="e.g., 001, 002" 
                value={newMember.member_code} 
                onChange={e => setNewMember({...newMember, member_code: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
              <input 
                type="date" 
                value={newMember.dob} 
                onChange={e => setNewMember({...newMember, dob: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input 
                type="text" 
                placeholder="eg. @mercure" 
                value={newMember.username} 
                onChange={e => setNewMember({...newMember, username: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input 
                type="password" 
                placeholder="Min 6 characters" 
                value={newMember.password} 
                onChange={e => setNewMember({...newMember, password: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select 
                value={newMember.role} 
                onChange={e => setNewMember({...newMember, role: e.target.value})} 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="Chairperson">Chairperson</option>
                <option value="Deputy Chairperson">Deputy Chairperson</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Organizer">Organizer</option>
                <option value="Head of Security">Head of Security</option>
                <option value="Editor">Editor</option>
                <option value="Member">Member</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button 
                onClick={handleAdd} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Adding...
                  </span>
                ) : (
                  "Add Member 🚀"
                )}
              </button>
            </div>
          </div>
          
          {Object.values(formErrors).map((v, i) => (
            <div key={i} className="text-sm text-red-500 bg-red-50 p-2 rounded-lg mt-2 flex items-center">
              <span className="mr-2">⚠️</span>
              {v}
            </div>
          ))}
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
            All Members ({filteredCount})
            {searchTerm && filteredCount !== memberCount && (
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                (of {memberCount} total)
              </span>
            )}
          </h3>
          {loading && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading...
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 flex items-center">
            <span className="mr-2">❌</span>
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50">
                <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Member Code</th>
                <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Name</th>
                <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Role</th>
                <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Balance</th>
                {(userRole === 'Treasurer' || userRole === 'admin') && (
                  <th className="text-left p-3 sm:p-4 font-semibold text-gray-700 dark:text-gray-300 text-sm sm:text-base">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCount > 0 ? (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors duration-150">
                    {editingId === m.id ? (
  <>
    <td className="p-3 sm:p-4">
      <input 
        value={editForm.member_code || ''} 
        onChange={e => handleEditChange('member_code', e.target.value)} 
        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 text-sm"
        placeholder="Member code"
      />
    </td>
    <td className="p-3 sm:p-4">
      <input 
        value={editForm.name || ''} 
        onChange={e => handleEditChange('name', e.target.value)} 
        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 text-sm"
        placeholder="Full name"
      />
    </td>
    <td className="p-3 sm:p-4">
      <select 
        value={editForm.role || ''} 
        onChange={e => handleEditChange('role', e.target.value)} 
        className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 text-sm"
      >
                <option value="Chairperson">Chairperson</option>
                <option value="Deputy Chairperson">Deputy Chairperson</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Organizer">Organizer</option>
                <option value="Head of Security">Head of Security</option>
                <option value="Editor">Editor</option>
                <option value="Member">Member</option>
      </select>
    </td>
    <td className="p-3 sm:p-4">
      <div className="font-bold text-green-600 text-sm">
        Ksh {editForm.balance?.toLocaleString() || '0'}
      </div>
    </td>
    <td className="p-3 sm:p-4 space-x-2">
      <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors text-sm">
        💾 Save
      </button>
      <button onClick={cancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors text-sm">
        ❌ Cancel
      </button>
    </td>
  </>
) : (
                      <>
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-purple-600 dark:text-purple-400 text-sm sm:text-base">#{m.member_code}</div>
                        </td>
                        <td className="p-3 sm:p-4 font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base">{m.name}</td>
                        <td className="p-3 sm:p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            m.role === 'Treasurer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                            m.role === 'Chairperson' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                            m.role === 'Organizer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-green-600 text-sm sm:text-base">
                            Ksh {m.balance?.toLocaleString() || '0'}
                          </div>
                        </td>
                        {(userRole === 'Treasurer' || userRole === 'admin') && (
                          <td className="p-3 sm:p-4">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleView(m)} 
                                className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
                                title="View Details"
                              >
                                👁️
                              </button>
                              <button 
                                onClick={() => startEdit(m)} 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDelete(m.id)} 
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
                                title="Delete"
                              >
                                🗑️
                              </button>
                              {m.status === 'pending' && (
                                <button 
                                  onClick={() => handleApprove(m.id)} 
                                  className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
                                  title="Approve"
                                >
                                  ✅
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canEditDelete ? "5" : "4"} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-2">👥</span>
                      <p>No members found</p>
                      {searchTerm && <p className="text-sm mt-1">Try adjusting your search</p>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in-zoom-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Member Details</h3>
              <button 
                onClick={closeView}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Member Code:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">#{viewMember.member_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Name:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{viewMember.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Role:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{viewMember.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                <span className="font-medium text-green-600 dark:text-green-400">Ksh {viewMember.balance?.toLocaleString() || '0'}</span>
              </div>
              {(userRole === 'Treasurer' || userRole === 'admin') && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{viewMember.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{viewMember.email || '-'}</span>
                  </div>
                </>
              )}
            </div>
            
            <button 
              onClick={closeView}
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}