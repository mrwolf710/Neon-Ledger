// Shared shapes for the game's structured data (story, dialogue, case file, board, world, cast).
// Modules keep their own local types for anything private; put a shape here when two or more files pass it around.
import type * as THREE from 'three';

// ---------- Story: dialogue ----------
export type Effect = { addFact?: string; addPerson?: string; addEcho?: string; setFlag?: string; setTime?: [number, number] };
// Every key that is set must hold.
export interface Condition { flag?: string; notFlag?: string; fact?: string; notFact?: string }
export interface Choice { text: string; next?: string; if?: Condition; effects?: Effect[]; end?: boolean }
export interface DialogueNode {
  speaker: string;
  text: string;
  next?: string;
  end?: boolean;
  choices?: Choice[];
  effects?: Effect[];
  present?: Record<string, string>;   // fact id -> node that answers it
  presentWrong?: string;
}
export interface StartBranch { if?: Condition; node: string }
export interface Conversation { start: string | StartBranch[]; nodes: Record<string, DialogueNode> }
export interface Speaker { name: string; color: string; alias?: { flag: string; name: string } }

// ---------- Story: case file ----------
export type EntryKind = 'people' | 'facts' | 'echoes';
// A case file entry. For kind 'facts' this is a clue: ch2 / ch tag the chapter it belongs to (default chapter 1).
export interface Clue { kind: EntryKind; title: string; text: string; source: string; ch2?: boolean; ch?: number }
export type Entries = Record<string, Clue>;

// ---------- Story: deduction board ----------
export interface BoardConclusion {
  id: string; needs: [string, string]; result: string; line: string;
  requires?: string[];                 // second-level deductions need these conclusions solved first
  effects: Effect[];
}
export interface BoardData { wrongLines: string[]; partialLine: string; hintLine: string; conclusions: BoardConclusion[] }

// ---------- Story: examine spots, echoes ----------
export interface Examinable { id: string; area: string; spot: string; verb: string; conv: string }
export interface EchoKey { t: number; x: number; z: number; facing?: number; anim?: 'idle' | 'walk' | string }
export interface EchoTrack { sprite: string; keys: EchoKey[]; show?: [number, number]; redacted?: boolean }
export interface EchoVoice { t0: number; t1: number; speaker: string; text: string }
export interface EchoTag { t: number; window: number; fact: string; label: string }
export interface EchoData {
  title: string; owner: string; entry: string; duration: number;
  tracks: EchoTrack[]; voices?: EchoVoice[]; seams?: number[]; tags?: EchoTag[];
  cues?: { t: number; name: string }[];   // sound cues in the replay (the 'stinger')
}
export interface Hotspot { id: string; area: string; echo: string; at: { spot: string; dx?: number; dz?: number }; radius: number; hidden?: boolean }

// ---------- Story: editor output (src/game/dialogue-edits.json) ----------
export interface Rule { conv: string; npc: string; when: string; fact?: string; talked?: string }
export interface ConversationContext { has?: (fact: string) => boolean; talked?: (person: string) => boolean; flag?: (name: string) => boolean }

// ---------- World ----------
export interface Block { x0: number; z0: number; x1: number; z1: number }
export interface Spot { name: string; x: number; z: number; facing?: number }
export interface Bounds { x0: number; z0: number; x1: number; z1: number }
export interface AreaMeta { origin: [number, number]; name: string; district: string; outdoor: boolean; mood?: string; surface?: string }

// ---------- Cast and interaction ----------
export interface Interactable {
  id: string; area?: string; position: THREE.Vector3; height: number; verb: string;
  range?: number; glyph?: string; onInteract?: () => void;
  clue?: () => boolean;   // true while there is still something to find: shows a small red pulse on it
}

// ---------- Names for the main shapes that live next to the code that builds them ----------
export type { CastMember as NPC } from './game/npc.ts';              // a person in the world (billboard + position + story state)
export type { CaseFileSave as InvestigationState } from './game/casefile.ts'; // what Juno knows: clues in order + story flags (also the save format)
export type { AreaRecord as RoomLayout } from './world/areas.ts';     // a generated place: geometry group, blocks, spots, lights, bounds
