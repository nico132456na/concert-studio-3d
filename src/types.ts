export type Vec3 = [number, number, number];

export type TextureKind = 'none' | 'brushed' | 'concrete' | 'wood' | 'fabric' | 'grid' | 'diamond' | 'carbon';

export interface MaterialSpec {
  preset: string;
  color: string;
  metalness: number;
  roughness: number;
  /** 0..1 how strongly the environment is reflected */
  reflect: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  texture: TextureKind;
}

export interface NamedMaterial extends MaterialSpec {
  id: string;
  name: string;
}

export type VisualId =
  | 'off' | 'solid' | 'gradient' | 'plasma' | 'geometric' | 'grid' | 'particles' | 'fire' | 'water'
  | 'bars' | 'minimal' | 'noise' | 'tunnel' | 'checker' | 'skyline' | 'eclipse' | 'clouds' | 'text' | 'media' | 'earth' | 'space' | 'stained';

export interface LedSpec {
  visual: VisualId;
  color1: string;
  color2: string;
  brightness: number; // 0..2
  speed: number; // 0..3
  /** pixels across the short edge; 0 = smooth */
  resolution: number;
  text: string;
  mediaId?: string;
  mediaType?: 'image' | 'video';
}

export type ObjectKind =
  | 'platform' | 'circlePlatform' | 'hexPlatform' | 'runway' | 'bstage' | 'floating' | 'stairs' | 'ramp' | 'catwalk'
  | 'ledWall' | 'ledVertical' | 'ledHorizontal' | 'ledCircle' | 'ledHanging' | 'ledPillar' | 'ledFloor' | 'ledCurved'
  | 'truss' | 'trussTower' | 'beam' | 'lightTower' | 'frame' | 'arch' | 'scaffold'
  | 'curtain' | 'glassPanel' | 'fabric'
  | 'sphere' | 'ring' | 'pyramid' | 'column' | 'cube' | 'cylinder' | 'cone' | 'wedge' | 'torus' | 'monolith'
  // extended stage shapes
  | 'ovalPlatform' | 'semicircle' | 'trianglePlatform' | 'octagon' | 'diamond' | 'crossStage' | 'tStage' | 'uStage' | 'lStage' | 'hStage'
  | 'ringStage' | 'curvedRunway' | 'spiralRunway' | 'waveStage' | 'halfSphere' | 'mountain' | 'rotatingPlatform' | 'lift' | 'custom'
  // structures & rigging
  | 'circleTruss' | 'curvedTruss' | 'triangleTruss' | 'trussGrid' | 'cubeFrame' | 'geoDome' | 'geoFrame' | 'sculpture' | 'tree' | 'rock'
  | 'ribbedWall' | 'railing'
  // LED
  | 'ledSphere' | 'ledCylinder' | 'ledCube' | 'ledTunnel' | 'ledArch' | 'ledCeiling' | 'ledTransparent'
  // audio
  | 'lineArray' | 'subwoofer' | 'groundStack' | 'speakerCab' | 'wedgeMonitor' | 'speakerTower' | 'delayTower';

export type MotionKind = 'none' | 'rotate' | 'lift' | 'bob';

export type HairStyle = 'short' | 'long' | 'buzz' | 'curly' | 'braids' | 'bald' | 'bun';
export type TopStyle = 'tee' | 'hoodie' | 'jacket' | 'tank' | 'suit' | 'jersey';
export type BottomStyle = 'jeans' | 'cargo' | 'shorts' | 'skirt' | 'suit';

export interface AvatarLook {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: TopStyle;
  topColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoes: string;
  glasses: boolean;
  chain: boolean;
  cap: boolean;
  gloves: boolean;
  height: number; // scale 0.9..1.1
}

export interface PerformerData {
  name: string;
  look: AvatarLook;
  outfits: { id: string; name: string; look: AvatarLook }[];
}

export interface StageObject {
  id: string;
  kind: ObjectKind;
  name: string;
  /** base-center position in meters (y = bottom of the object) */
  pos: Vec3;
  /** rotation in radians */
  rot: Vec3;
  /** width, height, depth in meters */
  size: Vec3;
  material: MaterialSpec;
  led?: LedSpec;
  hidden?: boolean;
  locked?: boolean;
  groupId?: string;
  /** tag for generated main-stage parts */
  tag?: string;
  /** outline for custom extruded shapes, in unit space (-0.5..0.5) on X/Z */
  outline?: [number, number][];
  /** animated platforms */
  motion?: MotionKind;
  motionSpeed?: number;
}

export type FixtureType =
  | 'spot' | 'beam' | 'wash' | 'ledbar' | 'ledtube' | 'strobe' | 'laser' | 'follow' | 'floor' | 'ceiling' | 'blinder' | 'pixel';

export type MovementPattern = 'none' | 'sweep' | 'circle' | 'figure8' | 'tilt' | 'random' | 'ballyhoo' | 'fan';
export type EffectType = 'none' | 'pulse' | 'strobe' | 'chase' | 'rainbow' | 'flicker' | 'fade' | 'colorchase';

export interface FixtureLook {
  on: boolean;
  color: string;
  intensity: number; // 0..1
  pan: number; // deg, 0 = toward audience (+z)
  tilt: number; // deg from straight down (0) to straight up (180)
  beamAngle: number; // deg
  focus: number; // 0 soft .. 1 hard
  movement: MovementPattern;
  moveSpeed: number; // 0..3
  moveSize: number; // deg
  effect: EffectType;
  effectSpeed: number; // 0..3
  strobeRate: number; // Hz
}

export interface Fixture extends FixtureLook {
  id: string;
  type: FixtureType;
  name: string;
  pos: Vec3;
  /** yaw of the fixture body, radians (mainly for bars) */
  yaw: number;
  hidden?: boolean;
  locked?: boolean;
  /** palette slot used by auto scenes */
  role?: 'front' | 'back' | 'side' | 'top' | 'floor' | 'audience' | 'fx';
}

export interface FixtureGroup {
  id: string;
  name: string;
  fixtureIds: string[];
}

export interface LedLook {
  visual: VisualId;
  color1: string;
  color2: string;
  brightness: number;
  speed: number;
}

export interface Atmosphere {
  haze: number; // 0..1 beam visibility
  fog: number; // 0..1 low fog
  houseLights: number; // 0..1 arena work light
  master: number; // 0..1 grand master
}

export interface LightScene {
  id: string;
  name: string;
  fade: number; // seconds
  fixtures: Record<string, FixtureLook>;
  screens: Record<string, LedLook>;
  atmosphere?: Partial<Atmosphere>;
}

export interface Cue {
  id: string;
  sceneId: string;
  duration: number; // seconds
  fade: number; // seconds
}

export interface LightPreset {
  id: string;
  name: string;
  colors: string[]; // cycled across fixtures
  intensity: number;
  effect?: EffectType;
  blackout?: boolean;
}

export interface CameraState {
  pos: Vec3;
  target: Vec3;
}

export interface Project {
  version: 1;
  id: string;
  name: string;
  arenaId: string;
  createdAt: number;
  updatedAt: number;
  source?: string;
  objects: StageObject[];
  fixtures: Fixture[];
  groups: FixtureGroup[];
  scenes: LightScene[];
  cues: Cue[];
  atmosphere: Atmosphere;
  camera?: CameraState;
  customMaterials: NamedMaterial[];
  customPresets: LightPreset[];
  savedColors: string[];
  performer?: PerformerData;
}

export interface ProjectMeta {
  id: string;
  name: string;
  arenaId: string;
  updatedAt: number;
  createdAt: number;
  thumbnail?: string;
  objectCount: number;
  fixtureCount: number;
}

/** A design (template or artist stage) that can seed a project. */
export interface DesignSeed {
  objects: StageObject[];
  fixtures: Fixture[];
  scenes?: LightScene[];
  cues?: Cue[];
  groups?: FixtureGroup[];
  atmosphere?: Partial<Atmosphere>;
}
