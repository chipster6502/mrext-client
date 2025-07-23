// src/components/AI/GameInfo.tsx - Simplified version with semantic validation

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

const api = new ControlApi();

// Helper function to remove file extension
const removeFileExtension = (filename: string) => {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.slice(0, -1).join('.');
  }
  return filename;
};

export default function GameInfo() {
  const theme = useTheme();
  const serverState = useServerStateStore();
  
  const [gameInfo, setGameInfo] = useState({
    tips: [],
    trivia: [],
    technical: [],
    records: [],
    loading: false,
    error: null,
    lastGame: ''
  });

  // ✅ SIMPLE & EFFECTIVE: React only to server state changes with delay
  useEffect(() => {
    const currentState = () => {
      if (!serverState.activeCore || serverState.activeCore === 'None') {
        return 'no-core';
      }
      
      const gameStateType = serverState.getGameStateType();
      return `${gameStateType}-${serverState.activeCore}-${serverState.activeGame}`;
    };
    
    const currentStateId = currentState();
    
    console.log('🔥 GameInfo: Server state changed, evaluating:', {
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
      
      // ✅ KEY: Add delay to let WebSocket data settle
      const timeoutId = setTimeout(() => {
        loadGameInfo(currentStateId);
      }, 500); // 500ms delay to let MiSTer update activeGame
      
      return () => clearTimeout(timeoutId);
    }
    
    // Clear info if no core
    if ((!serverState.activeCore || serverState.activeCore === 'None') && 
        gameInfo.lastGame !== 'no-core') {
      console.log('🧹 GameInfo: Clearing game info (no active core)');
      clearGameInfo();
    }
  }, [serverState.activeCore, serverState.activeGame]);

  // ✅ Function to determine what to show and load
  const loadGameInfo = async (stateId: string) => {
    const gameStateType = serverState.getGameStateType();
    const core = serverState.activeCore;
    const game = serverState.activeGame;
    
    console.log('🤖 GameInfo: loadGameInfo called:', { gameStateType, core, game, stateId });
    
    setGameInfo(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      let gameContext: string;
      
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

      console.log('📝 GameInfo: Loading context:', gameContext);

      const prompt = `Provide interesting information about ${gameContext}. Format your response with these sections:

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

      // Parse response into sections
      const sections = {
        tips: [],
        trivia: [],
        technical: [],
        records: []
      };

      const lines = response.content.split('\n');
      let currentSection = '';

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
        } else if (cleanLine.startsWith('-') && currentSection) {
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

    } catch (error) {
      console.error('❌ GameInfo: Error loading info:', error);
      setGameInfo(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Failed to load game information',
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
  };

  // ✅ Function to get current display name
  const getCurrentDisplayName = () => {
    const gameStateType = serverState.getGameStateType();
    const core = serverState.activeCore;
    const game = serverState.activeGame;

    console.log('🏷️ GameInfo: formatGameTitle debug:', {
      activeCore: core,
      activeGame: game,
      gameStateType,
      timestamp: new Date().toLocaleTimeString()
    });

    if (!core || core === 'None') {
      return 'No active game';
    }
    
    // For arcade games, the core name IS the game name
    if (gameStateType === 'arcade') {
      return `${core} (Arcade)`;
    }
    
    // For valid games, show game name + core
    if (gameStateType === 'game') {
      const filename = game.split('/').pop() || '';
      const gameName = removeFileExtension(filename);
      return `${gameName} (${core})`;
    }
    
    // For system or anything else, show just the system name
    return `${core} System`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          {getCurrentDisplayName()}
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
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption">
              Debug: State={serverState.getGameStateType()}, Core={serverState.activeCore}, Game={serverState.activeGame}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}