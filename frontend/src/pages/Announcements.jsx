import React, { useEffect, useState } from "react";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, getUserRole } from "../api";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: "", 
    message: "",
    duration: "24h" // Default duration
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState('');

  // Allowed roles for adding/deleting announcements
  const allowedRoles = ["Treasurer", "Chairperson", "Deputy Chairperson", "Secretary", "Organizer", "Editor"];
  const canManageAnnouncements = allowedRoles.includes(userRole);

  useEffect(() => {
    fetchAnnouncements();
    setUserRole(getUserRole());
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAnnouncements();
      let announcementsData = [];
      
      if (res?.data?.announcements) {
        announcementsData = res.data.announcements;
      } else if (Array.isArray(res?.data)) {
        announcementsData = res.data;
      } else if (Array.isArray(res)) {
        announcementsData = res;
      }
      
      // Sort by date, newest first
      const sortedAnnouncements = (Array.isArray(announcementsData) ? announcementsData : [])
        .sort((a, b) => new Date(b.created_at || b.createdAt || b.date) - new Date(a.created_at || a.createdAt || a.date));
      
      setAnnouncements(sortedAnnouncements);
    } catch (e) {
      console.error('fetchAnnouncements failed', e);
      setAnnouncements([]);
      setError('Failed to load announcements 📢');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      setError('Please fill in both title and message! 📝');
      return;
    }

    if (!canManageAnnouncements) {
      setError('You do not have permission to add announcements ❌');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Add current timestamp and duration to announcement
      const announcementWithMetadata = {
        ...newAnnouncement,
        created_at: new Date().toISOString(),
        expires_at: calculateExpiryDate(newAnnouncement.duration)
      };
      
      await addAnnouncement(announcementWithMetadata);
      
      // Clear form and show success
      setNewAnnouncement({ title: "", message: "", duration: "24h" });
      setSuccess('Announcement added successfully! 🎉');
      
      // Refresh announcements
      await fetchAnnouncements();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Add announcement failed:', err);
      setError('Failed to add announcement. Please try again. ❌');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!canManageAnnouncements) {
      setError('You do not have permission to delete announcements ❌');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await deleteAnnouncement(announcementId);
      setSuccess('Announcement deleted successfully! 🗑️');
      await fetchAnnouncements();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete announcement failed:', err);
      setError('Failed to delete announcement. Please try again. ❌');
    }
  };

  const calculateExpiryDate = (duration) => {
    const now = new Date();
    switch (duration) {
      case "24h":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case "1week":
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case "1month":
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      case "3months":
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      case "permanent":
        return null; // Never expires
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const getDurationBadge = (duration) => {
    const badges = {
      "24h": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "1week": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "1month": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "3months": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "permanent": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    };
    return badges[duration] || badges["24h"];
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recent';
    }
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false; // Permanent announcements never expire
    return new Date() > new Date(expiryDate);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 font-['Inter'] transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */} 
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            📢 Announcements
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Share important updates with members
          </p>
          {userRole && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Logged in as: <span className="font-semibold text-purple-600 dark:text-purple-400">{userRole}</span>
            </p>
          )}
        </div>

        {/* Alerts */} 
        {(error || success) && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
            success 
              ? "bg-green-500/20 text-green-700 border border-green-500/30 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30"
          }`}>
            {success || error}
          </div>
        )}

        {/* Add Announcement Card - Only for allowed roles */}
        {canManageAnnouncements && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 mb-8 transition-all duration-300 hover:shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span className="text-2xl">✨</span> Create New Announcement
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Enter announcement title..."
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea 
                  placeholder="Enter announcement message..."
                  value={newAnnouncement.message}
                  onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                  rows="4"
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Duration
                </label>
                <select 
                  value={newAnnouncement.duration}
                  onChange={e => setNewAnnouncement({...newAnnouncement, duration: e.target.value})}
                  className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="24h">24 Hours</option>
                  <option value="1week">1 Week</option>
                  <option value="1month">1 Month</option>
                  <option value="3months">3 Months</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
              
              <button 
                onClick={handleAddAnnouncement}
                disabled={loading || !newAnnouncement.title.trim() || !newAnnouncement.message.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-3 px-6 rounded-xl font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Publishing...
                  </div>
                ) : (
                  "Publish Announcement 🚀"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Announcements List */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="text-2xl">📋</span> All Announcements
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({announcements.length} total)
              </span>
            </h3>
            {!canManageAnnouncements && (
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                Read-only access
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading announcements...</p>
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement, idx) => (
                <div 
                  key={announcement._id || announcement.id || idx} 
                  className={`bg-gray-50/80 dark:bg-gray-700/80 border rounded-2xl p-5 transition-all duration-300 hover:shadow-lg ${
                    isExpired(announcement.expires_at) 
                      ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20" 
                      : "border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1 leading-tight">
                        {announcement.title}
                      </h4>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {formatDate(announcement.created_at || announcement.createdAt || announcement.date)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDurationBadge(announcement.duration)}`}>
                          {announcement.duration === "24h" ? "24 Hours" :
                           announcement.duration === "1week" ? "1 Week" :
                           announcement.duration === "1month" ? "1 Month" :
                           announcement.duration === "3months" ? "3 Months" : "Permanent"}
                        </span>
                        {isExpired(announcement.expires_at) && (
                          <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded-full font-medium">
                            Expired
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {canManageAnnouncements && (
                      <button 
                        onClick={() => handleDeleteAnnouncement(announcement._id || announcement.id)}
                        className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete announcement"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-base">
                    {announcement.message}
                  </p>
                  
                  {announcement.author && (
                    <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
                      Published by: <span className="font-medium text-purple-600 dark:text-purple-400">{announcement.author}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg font-medium mb-2">No announcements yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {canManageAnnouncements 
                  ? "Be the first to share an update with your community!" 
                  : "No announcements have been posted yet."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}