
export enum AppView {
  DASHBOARD = 'dashboard',
  CHAT = 'chat',
  VISUALS = 'visuals',
  AUDIO = 'audio',
  LIVE = 'live',
  SETTINGS = 'settings'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface VisualAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
}

export interface AudioRemix {
  id: string;
  originalName: string;
  remixUrl: string;
  prompt: string;
  timestamp: number;
}

export interface SyncSettings {
  enabled: boolean;
  token: string;
  repo: string; 
  path: string; 
  lastSync?: number;
}

export interface AppState {
  chatHistory: ChatMessage[];
  visualAssets: VisualAsset[];
  audioLogs: AudioRemix[];
}
