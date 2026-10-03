import mongoose, { Schema, Document } from "mongoose";

export interface IWatchHistoryItem {
  slug: string;
  name: string;
  origin_name: string;
  poster_url: string;
  thumb_url: string;
  year: number;
  country?: string;
  time?: string;
  quality?: string;
  episodeName?: string;
  serverName?: string;
  currentServerIndex: number;
  currentEpisodeIndex: number;
  currentTime?: number;
  duration?: number;
  watchedAt: number;
}

export interface IPlaylist {
  name: string;
  description?: string;
  movies: string[]; // array of movie slugs
}

export interface IUser extends Document {
  username: string;
  password?: string;
  displayName?: string;
  avatarUrl?: string;
  accentColor?: string; // Theme accent color (e.g. "cyan", "pink", "green", "sunset")
  bio?: string;
  featuredBadge?: string;
  watchHistory: IWatchHistoryItem[];
  bookmarks: string[];
  playlists: IPlaylist[];
  xp: number;
  level: number;
  streak: number;
  lastLoginDate?: Date;
  claimedQuests: { questId: string; claimedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const WatchHistorySchema = new Schema<IWatchHistoryItem>({
  slug: { type: String, required: true },
  name: { type: String, required: true },
  origin_name: { type: String, required: true },
  poster_url: { type: String, required: true },
  thumb_url: { type: String, required: true },
  year: { type: Number, required: true },
  country: { type: String },
  time: { type: String },
  quality: { type: String },
  episodeName: { type: String },
  serverName: { type: String },
  currentServerIndex: { type: Number, required: true },
  currentEpisodeIndex: { type: Number, required: true },
  currentTime: { type: Number },
  duration: { type: Number },
  watchedAt: { type: Number, required: true },
});

const PlaylistSchema = new Schema<IPlaylist>({
  name: { type: String, required: true },
  description: { type: String },
  movies: { type: [String], default: [] },
});

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    displayName: { type: String },
    avatarUrl: { type: String },
    accentColor: { type: String, default: "cyan" },
    bio: { type: String, default: "" },
    featuredBadge: { type: String, default: "" },
    watchHistory: { type: [WatchHistorySchema], default: [] },
    bookmarks: { type: [String], default: [] },
    playlists: { type: [PlaylistSchema], default: [] },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastLoginDate: { type: Date },
    claimedQuests: { type: [{ questId: String, claimedAt: { type: Date, default: Date.now } }], default: [] },
  },
  { 
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== "production"
  }
);

UserSchema.index({ xp: -1 });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
