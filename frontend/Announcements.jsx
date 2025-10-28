import React, { useEffect, useState } from "react";
import { getAnnouncements, addAnnouncement } from "../api";


export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  
  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAnnouncements();
      // Handle different response formats
      let announcementsData = [];
      
      if (res?.data?.announcements) {
        announcementsData = res.data.announcements;
      } else if (Array.isArray(res?.data)) {
        announcementsData = res.data;
      } else if (Array.isArray(res)) {
        announcementsData = res;
      }
      
      setAnnouncements(Array.isArray(announcementsData) ? announcementsData : []);
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

    setLoading(true);
    setError('');
    
    try {
      await addAnnouncement(newAnnouncement);
      
      // Clear form and show success
      setNewAnnouncement({ title: "", message: "" });
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

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen font-['Inter']">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Announcements
          </h1>
          <p className="text-gray-600">Share important updates with members</p>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`mb-6 p-4 rounded-2xl text-center font-medium transition-all duration-300 ${
            success 
              ? "bg-green-500/20 text-green-700 border border-green-500/30" 
              : "bg-red-500/20 text-red-700 border border-red-500/30"
          }`}>
            {success || error}
          </div>
        )}

        {/* Add Announcement Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📢</span> New Announcement
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Title</label>
              <input 
                type="text" 
                placeholder="Enter announcement title..."
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Message</label>
              <textarea 
                placeholder="Enter announcement message..."
                value={newAnnouncement.message}
                onChange={e => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                rows="4"
                className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
                disabled={loading}
              />
            </div>
            
            <button 
              onClick={handleAddAnnouncement}
              disabled={loading || !newAnnouncement.title.trim() || !newAnnouncement.message.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding...
                </div>
              ) : (
                "Add Announcement 🚀"
              )}
            </button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/60">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">📋</span> All Announcements
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({announcements.length} total)
            </span>
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading announcements...</p>
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement, idx) => (
                <div 
                  key={announcement._id || announcement.id || idx} 
                  className="bg-gray-50/50 border border-gray-200 rounded-2xl p-4 hover:border-purple-300 transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 text-lg">{announcement.title}</h4>
                    <span className="text-sm text-gray-500">
                      {formatDate(announcement.createdAt || announcement.date)}
                    </span>
                  </div>
                  <p className="text-gray-600 whitespace-pre-wrap">{announcement.message}</p>
                  {announcement.author && (
                    <div className="mt-2 text-sm text-gray-500">
                      By: {announcement.author}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📭</div>
              <p>No announcements yet</p>
              <p className="text-sm text-gray-400 mt-1">Be the first to share an update!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}