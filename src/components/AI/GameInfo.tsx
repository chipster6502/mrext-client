// src/components/AI/GameInfo.tsx - Fixed version with Claude context integration

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  useTheme
} from '@mui/material';
import {
  VideogameAsset as GameIcon,
  Lightbulb as TipIcon,
  History as HistoryIcon,
  EmojiEvents as AchievementIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';
import { ChatRequest, ChatResponse } from '../../lib/models';
import { useServerStateStore } from '../../lib/store';

interface GameInfoState {
  tips: string[];
  trivia: string[];
  technical: string[];
  records: string[];
  loading: boolean;
  error: string | null;
  lastGame: string;
}

const api = new ControlApi();

// Helper function to remove file extension
const removeFileExtension = (filename: string) => {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.slice(0, -1).join('.');
  }
  return filename;
};

interface GameContext {
  core_name: string;
  game_name: string;
  system_name: string;
  game_path: string;
  last_started: string;
  sam_active: boolean;  // ✅ NEW: SAM active status
  timestamp: string;
}

export default function GameInfo() {
  const theme = useTheme();
  const serverState = useServerStateStore();
  
  const [gameInfo, setGameInfo] = useState<GameInfoState>({
    tips: [],
    trivia: [],
    technical: [],
    records: [],
    loading: false,
    error: null,
    lastGame: ''
  });

  const [displayName, setDisplayName] = useState('No active game');
  const [claudeContext, setClaudeContext] = useState<GameContext | null>(null);

// Function to fetch Claude game context - FINAL OPTIMIZED VERSION
const fetchClaudeContext = async (): Promise<GameContext | null> => {
  try {
    console.log('🤖 GameInfo: Fetching Claude context...');
    
    // ✅ FINAL OPTIMIZATION: Use only relative URL
    // Vite proxy handles this automatically in development
    // In production, served from the same server
    const apiURL = '/api/claude/game-context';
    
    console.log('🌐 GameInfo: Using API URL:', apiURL);
    const response = await fetch(apiURL);
    
    if (response.ok) {
      const context: GameContext = await response.json();
      console.log('✅ GameInfo: Claude context received:', context);
      setClaudeContext(context);
      return context;
    } else {
      console.warn(`⚠️ GameInfo: Claude context failed (${response.status})`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      setClaudeContext(null);
      return null;
    }
  } catch (error) {
    console.error('❌ GameInfo: Error fetching Claude context:', error);
    setClaudeContext(null);
    return null;
  }
};

  // Function to update display name
const updateDisplayName = (context: GameContext | null) => {
  const gameStateType = serverState.getGameStateType();
  const core = serverState.activeCore;
  const game = serverState.activeGame;

  if (!core || core === 'None') {
    setDisplayName('No active game');
    return;
  }

  // ✅ PRIORITY 1: SAM active - use SAM info regardless of gameStateType
  if (context?.sam_active && context?.game_name && context?.system_name) {
    const newDisplayName = `${context.game_name} (${context.system_name})`;
    setDisplayName(newDisplayName);
    console.log(`🎯 GameInfo: SAM ACTIVE - Using Claude context: "${newDisplayName}"`);
    return;
  }

  // ✅ PRIORITY 2: Arcade games - use Claude context if available (ORIGINAL LOGIC)
  if (gameStateType === 'arcade' && context?.game_name && context?.system_name) {
    const newDisplayName = `${context.game_name} (${context.system_name})`;
    setDisplayName(newDisplayName);
    console.log(`🎯 GameInfo: ARCADE - Using Claude context: "${newDisplayName}"`);
    return;
  }

  // ✅ PRIORITY 3: Fallback logic - EXACTLY as it was originally
  if (gameStateType === 'arcade') {
    setDisplayName(`${core} (Arcade)`);
    console.log(`📝 GameInfo: ARCADE fallback: "${core} (Arcade)"`);
  } else if (gameStateType === 'game') {
    const filename = game.split('/').pop() || '';
    const gameName = removeFileExtension(filename);
    setDisplayName(`${gameName} (${core})`);
    console.log(`📝 GameInfo: GAME: "${gameName} (${core})"`);
  } else {
    setDisplayName(`${core} System`);
    console.log(`📝 GameInfo: SYSTEM: "${core} System"`);
  }
};

// Function to load game information from Claude
const loadGameInfo = async (stateId: string, context: GameContext | null) => {
  const gameStateType = serverState.getGameStateType();
  const core = serverState.activeCore;
  const game = serverState.activeGame;
  
  console.log('🤖 GameInfo: loadGameInfo called:', { 
    gameStateType, 
    core, 
    game, 
    stateId, 
    samActive: context?.sam_active 
  });
  
  setGameInfo(prev => ({ ...prev, loading: true, error: null }));
  
  try {
    let gameContext: string;
    
    // ✅ FIXED: Use sam_active flag instead of game_path
    if (context?.sam_active && context?.game_name) {
      gameContext = context.game_name;
      console.log(`🎯 GameInfo: SAM ACTIVE - Using Claude context for prompt: "${gameContext}"`);
    } else if (gameStateType === 'arcade' && context?.game_name) {
      // ✅ Use Claude context for arcade games if available (original logic)
      gameContext = context.game_name;
      console.log(`🎮 GameInfo: Using Claude context for prompt: "${gameContext}"`);
    } else {
      // ✅ Fallback to original logic
      switch (gameStateType) {
        case 'arcade':
          gameContext = core;
          break;
        case 'game':
          gameContext = game;
          break;
        case 'system':
        case 'none':
        default:
          gameContext = `${core} system`;
          break;
      }
      console.log(`📝 GameInfo: Using fallback context: "${gameContext}"`);
    }

    // ✅ RESTORED: Original prompt format (NOT JSON)
    const prompt = `Provide interesting information about ${gameContext}.

Format your response with these sections:

TIPS:
- (3-4 gameplay tips or strategies)

TRIVIA:
- (3-4 interesting facts or historical context)

TECHNICAL:
- (2-3 technical details about graphics, sound, or development)

RECORDS:
- (2-3 famous records, speedruns, or achievements)

Keep each point concise and engaging.`;

    const request: ChatRequest = {
      message: prompt,
      include_context: true,
      session_id: `gameinfo_${Date.now()}`
    };

    const response = await api.sendClaudeMessage(request);
    
    if (response.error) {
      throw new Error(response.error);
    }

    // ✅ RESTORED: Original text parsing (NOT JSON parsing)
     const sections: Record<string, string[]> = {
      tips: [],
      trivia: [],
      technical: [],
      records: []
    };

    const lines = response.content.split('\n');
    let currentSection: string | null = null;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith('TIPS:')) {
        currentSection = 'tips';
      } else if (cleanLine.startsWith('TRIVIA:')) {
        currentSection = 'trivia';
      } else if (cleanLine.startsWith('TECHNICAL:')) {
        currentSection = 'technical';
      } else if (cleanLine.startsWith('RECORDS:')) {
        currentSection = 'records';
      } else if (cleanLine.startsWith('-') && currentSection && sections[currentSection]) {
        sections[currentSection].push(cleanLine.substring(1).trim());
      }
    }

    setGameInfo({
      tips: sections.tips,
      trivia: sections.trivia,
      technical: sections.technical,
      records: sections.records,
      loading: false,
      error: null,
      lastGame: stateId
    });

    console.log('✅ GameInfo: Successfully loaded game info');

  } catch (error) {
    console.error('❌ GameInfo: Error loading info:', error);
    setGameInfo(prev => ({ 
      ...prev, 
      loading: false, 
      error: error instanceof Error ? error.message : 'Failed to load game information',
      lastGame: stateId
    }));
  }
};

  // Clear game info
  const clearGameInfo = () => {
  setGameInfo({
    tips: [],
    trivia: [],
    technical: [],
    records: [],
    loading: false,
    error: null,
    lastGame: 'no-core'
  });
  setDisplayName('No active game');
  setClaudeContext(null);
};

  // ✅ MAIN EFFECT: React to server state changes
  useEffect(() => {
    const currentState = () => {
      if (!serverState.activeCore || serverState.activeCore === 'None') {
        return 'no-core';
      }
      
      const gameStateType = serverState.getGameStateType();
      return `${gameStateType}-${serverState.activeCore}-${serverState.activeGame}`;
    };
    
    const currentStateId = currentState();
    
    console.log('🔥 GameInfo: Server state changed:', {
      currentStateId,
      lastGame: gameInfo.lastGame,
      activeCore: serverState.activeCore,
      activeGame: serverState.activeGame
    });
    
    // Load info if state changed AND we have an active core
    if (currentStateId !== gameInfo.lastGame && 
        serverState.activeCore && 
        serverState.activeCore !== 'None') {
      console.log(`🔄 GameInfo: State changed: ${gameInfo.lastGame} → ${currentStateId}`);
      
      // ✅ Add delay to let WebSocket data settle
      const timeoutId = setTimeout(async () => {
        // First, fetch Claude context
        const context = await fetchClaudeContext();
        
        // Update display name with context
        updateDisplayName(context);
        
        // Then load game info
        await loadGameInfo(currentStateId, context);
      }, 500); // 500ms delay
      
      return () => clearTimeout(timeoutId);
    }
    
    // Clear info if no core
    if ((!serverState.activeCore || serverState.activeCore === 'None') && 
        gameInfo.lastGame !== 'no-core') {
      console.log('🧹 GameInfo: Clearing game info (no active core)');
      clearGameInfo();
    }
  }, [serverState.activeCore, serverState.activeGame, gameInfo.lastGame]);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          {displayName}
        </Typography>
        
        {gameInfo.loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

        {gameInfo.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {gameInfo.error}
          </Alert>
        )}

        {/* Tips Section */}
        {gameInfo.tips.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TipIcon color="primary" />
              Tips & Strategies
            </Typography>
            <Stack spacing={1}>
              {gameInfo.tips.map((tip, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                  • {tip}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {/* Trivia Section */}
        {gameInfo.trivia.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" />
              Trivia & History
            </Typography>
            <Stack spacing={1}>
              {gameInfo.trivia.map((item, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                  • {item}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {/* Technical Section */}
        {gameInfo.technical.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <GameIcon color="primary" />
              Technical Details
            </Typography>
            <Stack spacing={1}>
              {gameInfo.technical.map((item, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                  • {item}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {/* Records Section */}
        {gameInfo.records.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AchievementIcon color="primary" />
              Records & Achievements
            </Typography>
            <Stack spacing={1}>
              {gameInfo.records.map((item, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                  • {item}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {/* Debug info - solo en desarrollo */}
        {import.meta.env.DEV && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption">
              Debug: State={serverState.getGameStateType()}, Core={serverState.activeCore}, Display={displayName}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}