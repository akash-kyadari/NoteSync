import { create } from "zustand";

const useRoomStore = create((set) => ({
  roomId: null,
  roomName: "",
  admin: null,
  participants: [],
  typingUserId: null, // Add typing user ID state
  setRoomData: (roomId, participants, admin = {}, roomName = "") =>
    set({ roomId, participants, admin, roomName }),
  setParticipants: (participants) => set({ participants }),
  setAdmin: (admin) => set({ admin }),
  setTypingUserId: (userId) => set({ typingUserId: userId }), // new setter
  clearRoom: () =>
    set({ roomId: null, participants: [], admin: {}, typingUserId: null }),
  createRoom: async (roomName) => {
    try {
      const res = await fetch(
        import.meta.env.VITE_BACKEND_URL +
          `/api/room/create?name=${encodeURIComponent(roomName)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) throw new Error("Failed to create room");
      const data = await res.json();
      set({
        roomId: data.roomId,
        roomName: data.roomName || roomName,
        admin: data.admin || {},
      });
      return data.roomId;
    } catch (err) {
      throw new Error(err.message || "Failed to create room");
    }
  },
  checkRoomId: async (roomId) => {
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/room/check/${encodeURIComponent(roomId)}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (data.valid && data.admin) {
        set((state) => ({
          ...state,
          admin: data.admin,
        }));
      }
      return data.valid === true;
    } catch (err) {
      return false;
    }
  },
}));

export default useRoomStore;
