import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  useTheme
} from '@mui/material';
import {
  VideogameAsset as GameIcon,
  Lightbulb as TipIcon,
  History as HistoryIcon,
  EmojiEvents as AchievementIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';
import { ChatRequest, ChatResponse } from '../../lib/models';
import { useServerStateStore } from '../../lib/store';

const api = new ControlApi();

// COMPLETE LIST OF ALL SYSTEMS SUPPORTED BY MISTER
const ALL_KNOWN_SYSTEMS = [
  // CONSOLES
  "AdventureVision", "AVision", "Arcadia", "Astrocade", "Atari2600", "Atari5200", "Atari7800", 
  "AtariLynx", "CasioPV1000", "CasioPV2000", "ChannelF", "CD-i", "Coleco", "ColecoVision", "CreatiVision",
  "FDS", "Gamate", "Gameboy", "Gameboy2P", "GameboyColor", "GameNWatch", "GBA", "GBA2P",
  "Genesis", "Intellivision", "Jaguar", "MasterSystem", "MegaDuck", "NES", "NeoGeo",
  "NeoGeoCD", "Nintendo64", "Odyssey2", "PCFX", "PokemonMini", "PSX", "Saturn", "Sega32X", "S32X",
  "SegaCD", "SG1000", "SMS", "SNES", "SuperGameboy", "SuperGrafx", "SuperVision",
  "Tamagotchi", "TurboGrafx16", "TurboGrafx16CD", "VC4000", "Vectrex", "WonderSwan",
  "WonderSwanColor",
  
  // COMPUTERS
  "AcornAtom", "AcornElectron", "AliceMC10", "Amiga", "AmigaCD32", "Amstrad", "AmstradPCW",
  "Apogee", "AppleI", "AppleII", "Apple-II", "Aquarius", "Atari800", "AtariST", "BBCMicro", "BK0011M",
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

// Helper function to remove only the file extension
const removeFileExtension = (filename: string) => {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.slice(0, -1).join('.');
  }
  return filename;
};

interface GameInfoData {
  tips: string[];
  trivia: string[];
  technical: string[];
  records: string[];
  loading: boolean;
  error: string | null;
  lastGame: string;
}

// ✅ NUEVA ESTRUCTURA: Más simple y directa
interface GameStateSnapshot {
  core: string;
  game: string;
  timestamp: number;
  isValidGame: boolean;
}

// ✅ NUEVA ESTRUCTURA: Estado del juego actual
interface CurrentGameState {
  type: 'none' | 'system' | 'game' | 'arcade';
  core: string;
  game: string;
  displayName: string;
}

export default function GameInfo() {
  const theme = useTheme();
  const serverState = useServerStateStore();
  
  // ✅ SIMPLIFICADO: Solo necesitamos rastrear el último snapshot válido
  const [lastSnapshot, setLastSnapshot] = useState<GameStateSnapshot>({
    core: '',
    game: '',
    timestamp: 0,
    isValidGame: false
  });
  
  const [currentState, setCurrentState] = useState<CurrentGameState>({
    type: 'none',
    core: '',
    game: '',
    displayName: 'No active game'
  });
  
  const [gameInfo, setGameInfo] = useState<GameInfoData>({
    tips: [],
    trivia: [],
    technical: [],
    records: [],
    loading: false,
    error: null,
    lastGame: ''
  });

  // Helper function to detect arcade games
  const isArcadeGame = (core: string, game: string) => {
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

  // ✅ FUNCIÓN CLAVE: Validar si un juego es realmente válido
  const isValidGame = (core: string, game: string) => {
    return !!(
      game && 
      game !== 'None' && 
      game !== core &&
      game.includes('/') &&
      game.includes('.')
    );
  };

  // ✅ FUNCIÓN PRINCIPAL: Determinar el estado actual del juego
  const determineCurrentStateWithSnapshot = (core: string, game: string, snapshot: GameStateSnapshot): CurrentGameState => {
    const now = Date.now();
    
    console.log('🔍 determineCurrentStateWithSnapshot:', { 
      core, 
      game, 
      snapshot,
      timestamp: new Date().toLocaleTimeString() 
    });

    // No core = no state
    if (!core || core === 'None') {
      console.log('❌ No active core');
      return {
        type: 'none',
        core: '',
        game: '',
        displayName: 'No active game'
      };
    }

    // Check if it's arcade
    if (isArcadeGame(core, game)) {
      console.log('🎮 Detected as ARCADE');
      return {
        type: 'arcade',
        core,
        game: core,
        displayName: `${core} (Arcade)`
      };
    }

    // Check if it's a valid game
    const gameIsValid = isValidGame(core, game);
    console.log('🎯 Game validation:', { gameIsValid, game });

    // ✅ LÓGICA CLAVE: Detectar datos obsoletos usando el snapshot pasado como parámetro
    const isSameData = snapshot.core === core && snapshot.game === game;
    const timeSinceLastSnapshot = now - snapshot.timestamp;
    const wasValidGame = snapshot.isValidGame;
    
    console.log('📊 Stale data check:', {
      isSameData,
      timeSinceLastSnapshot,
      wasValidGame,
      gameIsValid,
      snapshotAge: `${Math.round(timeSinceLastSnapshot / 1000)}s`
    });

    // Si es el mismo dato que antes Y era un juego válido Y pasó mucho tiempo = OBSOLETO
    if (isSameData && wasValidGame && timeSinceLastSnapshot > 5000) {
      console.log('⚠️ STALE DATA DETECTED! Same data for >5 seconds, was valid game, treating as system');
      return {
        type: 'system',
        core,
        game: '',
        displayName: `${core} System`
      };
    }

    // Si es un juego válido, mostrarlo
    if (gameIsValid) {
      console.log('✅ Detected as VALID GAME');
      const filename = game.split('/').pop() || '';
      const gameName = removeFileExtension(filename);
      return {
        type: 'game',
        core,
        game,
        displayName: `${gameName} (${core})`
      };
    }

    // Default a sistema
    console.log('✅ Detected as SYSTEM');
    return {
      type: 'system',
      core,
      game: '',
      displayName: `${core} System`
    };
  };

  // ✅ useEffect principal: Mucho más simple
  useEffect(() => {
    const core = serverState.activeCore || '';
    const game = serverState.activeGame || '';
    
    console.log('🔥 useEffect triggered:', { core, game });
    console.log('🔍 Current lastSnapshot:', lastSnapshot);

    // PRIMERO: Actualizar el snapshot si los datos del servidor cambiaron
    const serverDataChanged = lastSnapshot.core !== core || lastSnapshot.game !== game;
    
    let currentSnapshot = lastSnapshot;
    if (serverDataChanged) {
      currentSnapshot = {
        core,
        game,
        timestamp: Date.now(),
        isValidGame: isValidGame(core, game)
      };
      
      console.log('📸 Updating snapshot:', currentSnapshot);
      setLastSnapshot(currentSnapshot);
    }

    // SEGUNDO: Determinar el estado actual usando el snapshot actualizado
    const newState = determineCurrentStateWithSnapshot(core, game, currentSnapshot);
    
    // Siempre actualizar el estado de la UI
    setCurrentState(newState);
    console.log('🎯 New state:', newState);

    // Cargar información si hay algo que mostrar
    if (newState.type !== 'none') {
      loadGameInfo(newState);
    }

  }, [serverState.activeCore, serverState.activeGame]);

  // Load game information automatically
  const loadGameInfo = async (state: CurrentGameState) => {
    console.log('🤖 loadGameInfo called for:', state);
    
    if (state.type === 'none') {
      console.log('🧹 Clearing game info');
      setGameInfo(prev => ({
        ...prev,
        tips: [],
        trivia: [],
        technical: [],
        records: [],
        error: null,
        lastGame: 'none'
      }));
      return;
    }

    const stateId = `${state.type}-${state.core}-${state.game}`;
    
    // No recargar si es el mismo estado
    if (gameInfo.lastGame === stateId) {
      console.log('⏸️ Same state, skipping load');
      return;
    }

    console.log('🔄 Loading info for state ID:', stateId);
    setGameInfo(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let gameContext: string;
      
      switch (state.type) {
        case 'arcade':
          gameContext = state.core;
          break;
        case 'game':
          gameContext = state.game;
          break;
        case 'system':
        default:
          gameContext = `${state.core} system`;
          break;
      }

      console.log('📝 Game context:', gameContext);

      const prompt = `Provide interesting information about ${gameContext}. Format your response with these sections:

TIPS:
- (3-4 gameplay tips or strategies)

TRIVIA:
- (3-4 interesting facts or historical context)

TECHNICAL:
- (2-3 technical details about graphics, sound, or development)

RECORDS:
- (2-3 famous records, speedruns, or achievements)

Keep each point concise and engaging. Focus on the most interesting and useful information.`;

      const request: ChatRequest = {
        message: prompt,
        include_context: true,
        session_id: `gameinfo_${Date.now()}`
      };

      console.log('📤 Sending request to Claude...');
      const response = await api.sendClaudeMessage(request);
      console.log('📥 Response received from Claude');
      
      if (response.error) {
        console.log('❌ Claude error:', response.error);
        setGameInfo(prev => ({ 
          ...prev, 
          loading: false, 
          error: response.error || 'Error loading game information' 
        }));
      } else {
        console.log('✅ Parsing response...');
        const parsed = parseGameInfoResponse(response.content);
        
        setGameInfo(prev => ({
          ...prev,
          ...parsed,
          loading: false,
          error: null,
          lastGame: stateId
        }));
        console.log('✅ Game info updated successfully');
      }
    } catch (error) {
      console.error('💥 Error loading game info:', error);
      setGameInfo(prev => ({
        ...prev,
        loading: false,
        error: 'Error connecting to Claude AI'
      }));
    }
  };

  // Parse Claude's structured response into sections
  const parseGameInfoResponse = (content: string): Partial<GameInfoData> => {
    const sections = {
      tips: [] as string[],
      trivia: [] as string[],
      technical: [] as string[],
      records: [] as string[]
    };

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toUpperCase().includes('TIPS:')) {
        currentSection = 'tips';
      } else if (trimmed.toUpperCase().includes('TRIVIA:')) {
        currentSection = 'trivia';
      } else if (trimmed.toUpperCase().includes('TECHNICAL:')) {
        currentSection = 'technical';
      } else if (trimmed.toUpperCase().includes('RECORDS:')) {
        currentSection = 'records';
      } else if (trimmed.startsWith('-') && currentSection) {
        const cleanLine = trimmed.substring(1).trim();
        if (cleanLine && sections[currentSection as keyof typeof sections]) {
          sections[currentSection as keyof typeof sections].push(cleanLine);
        }
      }
    }

    return sections;
  };

  const InfoSection = ({ title, items, icon }: { title: string, items: string[], icon: React.ReactNode }) => {
    if (items.length === 0) return null;
    
    return (
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          {title}
        </Typography>
        <Stack spacing={1}>
          {items.map((item, index) => (
            <Typography key={index} variant="body2" sx={{ 
              pl: 2, 
              borderLeft: `3px solid ${theme.palette.primary.main}`,
              py: 0.5 
            }}>
              {item}
            </Typography>
          ))}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GameIcon sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
            <Box>
              <Typography variant="h5">Current Game Info</Typography>
              <Typography variant="body2" color="text.secondary">
                {currentState.displayName}
              </Typography>
            </Box>
          </Box>
          
          {currentState.type !== 'none' && (
            <Chip
              label={gameInfo.loading ? "Loading..." : "Auto-updated"}
              color={gameInfo.loading ? "default" : "success"}
              size="small"
              icon={gameInfo.loading ? <CircularProgress size={16} /> : <InfoIcon />}
            />
          )}
        </Box>
      </Paper>

      {/* Error display */}
      {gameInfo.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {gameInfo.error}
        </Alert>
      )}

      {/* No active game */}
      {currentState.type === 'none' && (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            backgroundColor: theme.palette.action.hover 
          }}
        >
          <GameIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" gutterBottom>
            No Active Game
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Start playing a game on your MiSTer to see automatic tips, trivia, and interesting facts!
          </Typography>
        </Paper>
      )}

      {/* Loading state */}
      {gameInfo.loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Claude is gathering information...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Game information sections */}
      {!gameInfo.loading && !gameInfo.error && currentState.type !== 'none' && (
        <Stack spacing={3}>
          <InfoSection 
            title="Tips & Strategies" 
            items={gameInfo.tips} 
            icon={<TipIcon color="primary" />} 
          />
          
          <InfoSection 
            title="Trivia & History" 
            items={gameInfo.trivia} 
            icon={<HistoryIcon color="primary" />} 
          />
          
          <InfoSection 
            title="Technical Details" 
            items={gameInfo.technical} 
            icon={<InfoIcon color="primary" />} 
          />
          
          <InfoSection 
            title="Records & Achievements" 
            items={gameInfo.records} 
            icon={<AchievementIcon color="primary" />} 
          />

          {/* Auto-refresh notice */}
          <Paper elevation={0} sx={{ p: 2, backgroundColor: theme.palette.action.hover }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon fontSize="small" />
              Information updates automatically when you change games
            </Typography>
          </Paper>
        </Stack>
      )}

      {/* Debug Info (remover en producción) */}
      {process.env.NODE_ENV === 'development' && (
        <Paper elevation={0} sx={{ p: 2, mt: 3, backgroundColor: 'grey.100' }}>
          <Typography variant="caption" component="div">
            <strong>Debug Info:</strong><br/>
            Current State: {JSON.stringify(currentState, null, 2)}<br/>
            Last Snapshot: {JSON.stringify(lastSnapshot, null, 2)}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}