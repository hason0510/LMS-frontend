import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useUserStore from './useUserStore';
import { getMyNotifications, countUnreadNotifications, markNotificationAsRead as apiMarkAsRead } from '../api/notification';
import { notification as antdNotification } from 'antd';
import {
  getNotificationPreview,
  normalizeNotificationItem,
} from '../utils/notificationText';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8081";

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  stompClient: null,
  isConnected: false,
  isConnecting: false,

  fetchNotifications: async () => {
    try {
      const res = await getMyNotifications();
      // res is ApiResponse { code, message, data: [...] }
      const data = res.data || [];
      set({
        notifications: Array.isArray(data)
          ? data.map(normalizeNotificationItem)
          : [],
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await countUnreadNotifications();
      // res is ApiResponse { code, message, data: number }
      const count = res.data;
      set({ unreadCount: typeof count === 'number' ? count : 0 });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (id) => {
    try {
      await apiMarkAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, readStatus: true, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  connect: () => {
    const token = useUserStore.getState().accessToken;
    if (get().isConnected || get().isConnecting || !token) return;

    set({ isConnecting: true });

    const socket = new SockJS(`${BACKEND_URL}/ws`);
    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = (frame) => {
      set({ isConnected: true, isConnecting: false, stompClient: client });
      // console.log('Connected to WebSocket');

      client.subscribe(`/user/queue/notifications`, (message) => {
        const newNotification = normalizeNotificationItem(JSON.parse(message.body));

        // Add to list and play sound or show toast
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Show Real-time Toast
        antdNotification.info({
          message: newNotification.title || 'Thông báo mới',
          description: getNotificationPreview(newNotification),
          placement: 'topRight',
          duration: 4.5,
        });
      });
    };

    client.onWebSocketError = (event) => {
      console.error('WebSocket Error:', event);
      set({ isConnecting: false });
    };

    client.onStompError = (frame) => {
      console.error('STOMP Error:', frame.headers['message']);
      console.error('STOMP Details:', frame.body);
      set({ isConnected: false, isConnecting: false });
    };

    client.onDisconnect = () => {
      set({ isConnected: false, isConnecting: false, stompClient: null });
      // console.log('Disconnected from WebSocket');
    };

    client.activate();
  },

  disconnect: () => {
    const { stompClient } = get();
    if (stompClient) {
      stompClient.deactivate();
      set({ isConnected: false, stompClient: null });
    }
  },
}));

export default useNotificationStore;
