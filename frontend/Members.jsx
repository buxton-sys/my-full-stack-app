import React, { useEffect, useState } from "react";
import { getMembers, addMember, updateMember, deleteMember, approveMember } from "../api";


export default 
 function Members() {
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

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
     const response = await getMembers();
      console.log('🔍 API Response:', response); // Debug log
      console.log('🔍 Response data:', response.data); // Debug log
      
      // SAFELY handle the response - ensure it's always an array
      let membersData = [];
      
      if (Array.isArray(response.data)) {
        membersData = response.data;
      } else if (response.data && Array.isArray(response.data.members)) {
        membersData = response.data.members;
      } else if (response.data && typeof response.data === 'object') {
        // If it's an object, try to extract array from it
        membersData = Object.values(response.data).find(Array.isArray) || [];
      }
      
      console.log('🔍 Final members data:', membersData); // Debug log
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to fetch members', err);
      setError('Failed to load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleAdd = async () => {
    const errs = {};
    if (!newMember.name) errs.name = 'Name is required';
    if (!/^\d[0-8]{8}$/.test(newMember.idNumber)) errs.idNumber = 'ID max 8 digits';
    if (!/^\d[0-9]{9}$/.test(newMember.phone)) errs.phone = 'Phone must be 10 digits';
    if (!newMember.username) errs.username = 'Username required';
    if (!newMember.password || newMember.password.length < 6) errs.password = 'Password min 6 chars';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setLoading(true);
      await addMember(newMember);
      setNewMember({ name: '', role: 'Member', phone: '', email: '', idNumber: '', username: '', password: '', dob: '' });
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
    setEditForm({ ...member });
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
      await updateMember(editingId, editForm); // Pass both the ID and the form data
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
        member?.role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // SAFE member count
  const memberCount = Array.isArray(members) ? members.length : 0;
  const filteredCount = Array.isArray(filteredMembers) ? filteredMembers.length : 0;


  return (
    <div className="p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            Members
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage your community members</p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Add Member Card */}
      <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Add New Member</h3>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm">
            +
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" 
              placeholder="Enter full name" 
              value={newMember.name} 
              onChange={e => setNewMember({...newMember, name: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input 
              type="text" 
              placeholder="10 digits" 
              value={newMember.phone} 
              onChange={e => setNewMember({...newMember, phone: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              value={newMember.email} 
              onChange={e => setNewMember({...newMember, email: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
            <input 
              type="text" 
              placeholder="9 digits" 
              value={newMember.idNumber} 
              onChange={e => setNewMember({...newMember, idNumber: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input 
              type="date" 
              value={newMember.dob} 
              onChange={e => setNewMember({...newMember, dob: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input 
              type="text" 
              placeholder="Choose username" 
              value={newMember.username} 
              onChange={e => setNewMember({...newMember, username: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="Min 6 characters" 
              value={newMember.password} 
              onChange={e => setNewMember({...newMember, password: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              value={newMember.role} 
              onChange={e => setNewMember({...newMember, role: e.target.value})} 
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              <option value="Member">Member</option>
              <option value="Treasurer">Treasurer</option>
              <option value="Chairperson">Chairperson</option>
              <option value="Deputy Chairperson">Deputy Chairperson</option>
              <option value="Organizer">Organizer</option>
              <option value="Head of Security">Head of Security</option>
              <option value="Editor/Publisher">Editor/Publisher</option>
              <option value="Guest">Guest</option>
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

      {/* Members Table */}
       <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">
            All Members ({filteredCount})
            {searchTerm && filteredCount !== memberCount && (
              <span className="text-sm text-gray-500 ml-2">
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
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center">
            <span className="mr-2">❌</span>
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="text-left p-4 font-semibold text-gray-700">Name</th>
                <th className="text-left p-4 font-semibold text-gray-700">Role</th>
                <th className="text-left p-4 font-semibold text-gray-700">Phone</th>
                <th className="text-left p-4 font-semibold text-gray-700">Email</th>
                <th className="text-left p-4 font-semibold text-gray-700">Username</th>
                <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCount > 0 ? (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-150">
                    {editingId === m.id ? (
                      <>
                       <td className="p-4">
                          <input 
                            value={editForm.name || ''} 
                            onChange={e => handleEditChange('name', e.target.value)} 
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-4">
                          <select 
                            value={editForm.role || ''} 
                            onChange={e => handleEditChange('role', e.target.value)} 
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="Member">Member</option>
                            <option value="Treasurer">Treasurer</option>
                            <option value="Chairperson">Chairperson</option>
                            <option value="Deputy Chairperson">Deputy Chairperson</option>
                            <option value="Organizer">Organizer</option>
                            <option value="Head of Security">Head of Security</option>
                            <option value="Editor/Publisher">Editor/Publisher</option>
                            <option value="Guest">Guest</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <input 
                            value={editForm.phone || ''} 
                            onChange={e => handleEditChange('phone', e.target.value)} 
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            value={editForm.email || ''} 
                            onChange={e => handleEditChange('email', e.target.value)} 
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-4">
                          <input 
                            value={editForm.username || ''} 
                            onChange={e => handleEditChange('username', e.target.value)} 
                            className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-4 space-x-2">
                          <button onClick={handleSave} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors">
                            💾 Save
                          </button>
                          <button onClick={cancelEdit} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-lg transition-colors">
                            ❌ Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-medium text-gray-800">{m.name}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            m.role === 'Treasurer' ? 'bg-purple-100 text-purple-800' :
                            m.role === 'Chairperson' ? 'bg-blue-100 text-blue-800' :
                            m.role === 'Organizer' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600">{m.phone || '-'}</td>
                        <td className="p-4 text-gray-600">{m.email || '-'}</td>
                        <td className="p-4 text-gray-600">{m.username || '-'}</td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleView(m)} 
                              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                              title="View Details"
                            >
                              👁️
                            </button>
                            <button 
                              onClick={() => startEdit(m)} 
                              className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDelete(m.id)} 
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                              title="Delete"
                            >
                              🗑️
                            </button>
                            {m.status === 'pending' && (
                              <button 
                                onClick={() => handleApprove(m.id)} 
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                                title="Approve"
                              >
                                ✅
                              </button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
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
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in-zoom-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Member Details</h3>
              <button 
                onClick={closeView}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{viewMember.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium">{viewMember.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium">{viewMember.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{viewMember.email || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ID Number:</span>
                <span className="font-medium">{viewMember.idNumber || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DOB:</span>
                <span className="font-medium">{viewMember.dob || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Username:</span>
                <span className="font-medium">{viewMember.username || '-'}</span>
              </div>
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