import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SearchServiceStatus } from "./models";

export enum SettingsPageId {
  Main,
  Cores,
  GeneralVideo,
  OSDMenu,
  InputDevices,
  Remote,
  Audio,
  System,
  VideoFilters,
  AnalogVideo,
}

export interface UIState {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  activeSettingsPage: SettingsPageId;
  setActiveSettingsPage: (page: SettingsPageId) => void;
  lastFavoriteFolder: string;
  setLastFavoriteFolder: (folder: string) => void;
  favoriteScripts: string[];
  setFavoriteScripts: (scripts: string[]) => void;
  autoControlKeys: number[];
  setAutoControlKeys: (keys: number[]) => void;
}

export const useUIStateStore = create<UIState>()(
  persist(
    (set, get) => ({
      activeTheme: "mister",
      setActiveTheme: (id: string) => set({ activeTheme: id }),
      fontSize: 14,
      setFontSize: (size: number) => set({ fontSize: size }),
      activeSettingsPage: SettingsPageId.Main,
      setActiveSettingsPage: (page: SettingsPageId) =>
        set({ activeSettingsPage: page }),
      lastFavoriteFolder: "",
      setLastFavoriteFolder: (folder: string) =>
        set({ lastFavoriteFolder: folder }),
      favoriteScripts: [],
      setFavoriteScripts: (scripts: string[]) =>
        set({ favoriteScripts: scripts }),
      autoControlKeys: [
        24, // l2
        25, // l1
        37, // r1
        38, // r2
        103, // up
        108, // down
        105, // left
        106, // right
        23, // osd
        36, // select
        22, // start
        21, // x
        20, // y
        19, // b
        18, // a
        2, // 1
        3, // 2
        4, // 3
        5, // 4
        6, // 5
        7, // 6
        8, // 7
        9, // 8
        10, // 9
        11, // 10
      ],
      setAutoControlKeys: (keys: number[]) => set({ autoControlKeys: keys }),
    }),
    {
      name: "uiState",
    }
  )
);

export interface ServerState {
  search: SearchServiceStatus;
  setSearch: (search: SearchServiceStatus) => void;
  activeGame: string;
  setActiveGame: (game: string) => void;
  activeCore: string;
  setActiveCore: (core: string) => void;
  getGameStateType: () => 'none' | 'system' | 'game' | 'arcade' | 'stale';
}

// ✅ FUNCIÓN: Detectar si es juego arcade
const isArcadeGame = (core: string, game: string) => {
  const ALL_KNOWN_SYSTEMS = [
    // CONSOLES
    "AdventureVision", "AVision", "Arcadia", "Astrocade", "Atari2600", "Atari5200", "Atari7800", 
    "AtariLynx", "CasioPV1000", "CasioPV2000", "ChannelF", "CD-i", "Coleco", "ColecoVision", "CreatiVision",
    "FDS", "Gamate", "Gameboy", "Gameboy2P", "GameboyColor", "GameGear", "GameNWatch", "GBA", "GBA2P",
    "Genesis", "Intellivision", "Jaguar", "MasterSystem", "MegaDuck", "NES", "NeoGeo",
    "NeoGeoCD", "Nintendo64", "Odyssey2", "PCFX", "PokemonMini", "PSX", "Saturn", "Sega32X", "S32X",
    "MegaCD", "SG1000", "SMS", "SNES", "SuperGameboy", "SuperGrafx", "SuperVision",
    "Tamagotchi", "TurboGrafx16", "TurboGrafx16CD", "VC4000", "Vectrex", "WonderSwan",
    "WonderSwanColor",
    
    // COMPUTERS
    "AcornAtom", "AcornElectron", "AliceMC10", "Amiga", "AmigaCD32", "Amstrad", "AmstradPCW",
    "Apogee", "AppleI", "AppleII", "Apple-II", "Aquarius", "Atari800", "AtariST", "BBCMicro", "BK0011M", "C16",
    "C64", "ChipTest", "CoCo2", "CoCo3", "EDSAC", "Galaksija", "Interact", "Jupiter",
    "Laser", "Lynx48", "Macintosh", "MegaST", "MO5", "MSX", "MultiComp", "Orao", "Oric",
    "PC88", "PDP1", "PET2001", "PMD85", "RX78", "SAMCoupe", "SharpMZ", "SordM5",
    "Specialist", "SPMX", "TI994A", "TI-99_4A", "TRS80", "TRS-80", "TSConf", "UK101", "Vector06", "VIC20", "X68000",
    "ZX81", "ZXSpectrum",
    
    // OTHER SYSTEMS
    "Arduboy", "Chip8", "FlappyBird", "Groovy",
    
    // COMMON ALIASES
    "TGFX16", "PCE", "GG", "GameGear", "N64", "A7800", "ATARI5200", "ATARI7800", "LYNX", "NGP", "WS"
  ];

  if (!core || core === 'None') return false;

  // If the core is in the list of known systems, it's NOT arcade
  if (ALL_KNOWN_SYSTEMS.some(system => 
    core.toLowerCase().includes(system.toLowerCase()) ||
    system.toLowerCase().includes(core.toLowerCase())
  )) {
    return false;
  }

  // If activeGame equals activeCore, it's arcade
  if (game === core) return true;

  // If activeGame is empty/None, it's arcade
  if (!game || game === 'None') return true;

  // Smart detection for stale activeGame
  if (!core.includes('/') && game && game.includes('/')) {
    const gameSystem = game.split('/')[0].toLowerCase();
    const coreSystem = core.toLowerCase();
    
    if (gameSystem !== coreSystem && 
        !coreSystem.includes(gameSystem) && 
        !gameSystem.includes(coreSystem)) {
      return true;
    }
  }

  // Explicit arcade indicators
  if ((game && game.includes('_Arcade')) || core.includes('_Arcade')) {
    return true;
  }

  return false;
};

// ✅ NUEVA FUNCIÓN: Validar si el juego corresponde al core actual (validación semántica)
const isValidGameForCore = (activeCore: string, activeGame: string) => {
  if (!activeGame || activeGame === 'None' || !activeCore || activeCore === 'None') {
    return false;
  }
  
  // For arcade games, activeGame should equal activeCore
  if (isArcadeGame(activeCore, activeGame)) {
    return activeGame === activeCore;
  }
  
  // For console/computer games, activeGame should be a file path
  // and should not be the same as activeCore (which would indicate arcade)
  if (activeGame === activeCore) {
    return false; // This suggests arcade, but we're not in arcade mode
  }
  
  // ✅ CRITICAL: Semantic validation - detect mismatched systems
  if (activeGame.includes('/')) {
    const gamePathLower = activeGame.toLowerCase();
    const coreLower = activeCore.toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove special chars
    
    // Quick system matching - if game path contains numbers/letters that suggest different system
    const suspiciousPatterns = [
      { pattern: 'atari2600', cores: ['atari2600', 'atari7800'] }, // Atari7800 can play 2600
      { pattern: 'atari5200', cores: ['atari5200'] },
      { pattern: 'atari7800', cores: ['atari7800'] },
      { pattern: 'nes/', cores: ['nes'] },
      { pattern: 'snes/', cores: ['snes'] },
      { pattern: 'genesis/', cores: ['genesis', 'megadrive'] },
      { pattern: 'megadrive/', cores: ['genesis', 'megadrive'] },
      { pattern: 'gameboy/', cores: ['gameboy', 'gb'] },
      { pattern: 'gba/', cores: ['gba'] },
      { pattern: 'c64/', cores: ['c64'] },
      { pattern: 'amiga/', cores: ['amiga'] },
      { pattern: 'apple-ii/', cores: ['appleii', 'apple-ii'] },
      { pattern: 'msx/', cores: ['msx'] },
      { pattern: 'coleco/', cores: ['coleco', 'colecovision'] },
      { pattern: 'intellivision/', cores: ['intellivision'] },
      { pattern: 'atari800/', cores: ['atari800'] },
      { pattern: 'commodore64/', cores: ['c64'] },
      { pattern: 'vic20/', cores: ['vic20'] },
      { pattern: 'zxspectrum/', cores: ['zxspectrum'] },
      { pattern: 'amstrad/', cores: ['amstrad'] }
    ];
    
    for (const { pattern, cores } of suspiciousPatterns) {
      if (gamePathLower.includes(pattern)) {
        const coreMatches = cores.some(core => 
          coreLower.includes(core.toLowerCase()) || 
          core.toLowerCase().includes(coreLower)
        );
        if (!coreMatches) {
          console.log(`🚫 STORE: Detected mismatched data: ${activeGame} doesn't match ${activeCore}`);
          return false;
        }
      }
    }
  }
  
  // Check if activeGame looks like a valid file path
  if (activeGame.includes('/') || activeGame.includes('.')) {
    return true;
  }
  
  return false;
};

export const useServerStateStore = create<ServerState>()((set, get) => ({
  search: {
    ready: true,
    indexing: false,
    totalSteps: 0,
    currentStep: 0,
    currentDesc: "",
  },
  setSearch: (search: SearchServiceStatus) => set({ search }),
  activeGame: "",
  setActiveGame: (game: string) => {
    console.log(`🔄 Store: setActiveGame called with: "${game}"`);
    const currentState = get();
    
    // ✅ SIMPLIFIED: Only update if really changed
    if (currentState.activeGame !== game) {
      console.log(`✅ Store: Game actually changed from "${currentState.activeGame}" to "${game}"`);
      set({ activeGame: game });
    } else {
      console.log(`⏸️ Store: Game unchanged: "${game}"`);
    }
  },
  activeCore: "",
  setActiveCore: (core: string) => {
    console.log(`🔄 Store: setActiveCore called with: "${core}"`);
    const currentState = get();
    
    // ✅ SIMPLIFIED: Only update if really changed
    if (currentState.activeCore !== core) {
      console.log(`✅ Store: Core actually changed from "${currentState.activeCore}" to "${core}"`);
      set({ activeCore: core });
    } else {
      console.log(`⏸️ Store: Core unchanged: "${core}"`);
    }
  },
  
  // ✅ NUEVA FUNCIÓN getGameStateType (SIN TIMEOUT, con validación semántica)
  getGameStateType: () => {
    const state = get();
    const { activeCore, activeGame } = state;
    
    console.log(`🔍 Store: getGameStateType called:`, {
      activeCore,
      activeGame,
      timestamp: new Date().toLocaleTimeString()
    });

    // No core = no state
    if (!activeCore || activeCore === 'None') {
      console.log(`❌ Store: No active core`);
      return 'none';
    }

    // Check if it's arcade FIRST
    const isArcade = isArcadeGame(activeCore, activeGame);
    console.log(`🎮 Store: isArcadeGame check:`, { activeCore, activeGame, isArcade });
    
    if (isArcade) {
      console.log(`🎮 Store: Detected as ARCADE`);
      return 'arcade';
    }

    // ✅ CRITICAL: Check if activeGame is valid for current activeCore
    const isValidForCore = isValidGameForCore(activeCore, activeGame);
    console.log(`🎯 Store: isValidGameForCore check:`, { 
      activeCore, 
      activeGame, 
      isValidForCore
    });

    // ✅ NEW LOGIC: If game is semantically valid for current core, show as game
    if (isValidForCore) {
      console.log(`✅ Store: Detected as VALID GAME (semantically matches core)`);
      return 'game';
    }

    // ✅ If activeGame exists but doesn't match core, it's stale/mismatched data
    if (activeGame && activeGame !== 'None' && activeGame !== activeCore) {
      console.log(`⚠️ Store: Game data exists but doesn't match core - showing system instead`);
      console.log(`📊 Store: Mismatch details:`, {
        activeCore,
        activeGame,
        reason: 'semantic_mismatch'
      });
    }

    // Default to system (either no game or mismatched game)
    console.log(`✅ Store: Detected as SYSTEM`);
    return 'system';
  }
}));