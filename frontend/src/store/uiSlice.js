import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  darkMode: localStorage.getItem('darkMode') === 'true',
  sidebarOpen: true,
  activeTab: 0
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const id = Date.now().toString();
      state.notifications.push({
        id,
        ...action.payload,
        read: false
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    markNotificationAsRead: (state, action) => {
      const notification = state.notifications.find(
        notification => notification.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem('darkMode', state.darkMode);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    }
  }
});

export const {
  addNotification,
  removeNotification,
  markNotificationAsRead,
  clearAllNotifications,
  toggleDarkMode,
  toggleSidebar,
  setActiveTab
} = uiSlice.actions;

export default uiSlice.reducer;