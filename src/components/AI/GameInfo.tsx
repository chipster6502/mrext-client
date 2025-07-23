import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Skeleton,
  useTheme,
} from "@mui/material";
import GamepadIcon from "@mui/icons-material/Gamepad";
import { useServerStateStore } from "../../lib/store";
import { ControlApi } from "../../lib/api";
import { PlayingGame } from "../../lib/models";

// Remove file extension from filename
const removeFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts.slice(0, -1).join('.');
  }
  return filename;
};

interface GameInfoState {
  tips: string[];
  trivia: string[];
  technical: string[];
  records: string[];
  loading: boolean;
  error: string | null;
  lastStateId: string;
  currentPlayingData: PlayingGame | null;
}

export default function GameInfo() {
  const theme = useTheme();
  const serverState = useServerStateStore();
  const api = new ControlApi();
  
  const [gameInfo, setGameInfo] = useState<GameInfoState>({
    tips: [],
    trivia: [],
    technical: [],
    records: [],
    loading: false,
    error: null,
    lastStateId: '',
    currentPlayingData: null
  });

  // Function to fetch current playing game data from HTTP endpoint
  const fetchPlayingData = async (): Promise<PlayingGame | null> => {
    try {
      const data = await api.getPlayingGame();
      console.log('🌐 GameInfo: HTTP endpoint data:', data);
      return data;
    } catch (error) {
      console.error('❌ GameInfo: Failed to fetch playing data:', error);
      return null;
    }
  };

  // ✅ IMPROVED: Create more reliable state ID that accounts for SAM
  const createStateId = (playingData: PlayingGame | null): string => {
    if (!playingData || !playingData.core || playingData.core === 'None') {
      return 'no-core';
    }
    
    // Use gameName (which includes SAM data) as primary identifier
    const gameName = playingData.gameName || '';
    const systemName = playingData.systemName || playingData.core;
    
    // Create a unique ID that changes when either game or system changes
    return `${systemName}|${gameName}|${playingData.core}`;
  };

  // Function to determine display context from HTTP data
  const getGameContextFromHttp = (data: PlayingGame): string => {
    if (!data.core || data.core === 'None') {
      return '';
    }

    // Priority 1: Use gameName if available (includes SAM data!)
    if (data.gameName && data.gameName.trim() !== '') {
      return data.gameName;
    }

    // Priority 2: Extract from game path
    if (data.game && data.game.trim() !== '') {
      const filename = data.game.split('/').pop() || '';
      if (filename) {
        return removeFileExtension(filename);
      }
    }

    // Priority 3: Fallback to system/core
    return data.systemName || data.core;
  };

  // ✅ IMPROVED: Main effect with better change detection
  useEffect(() => {
    const checkAndLoadGameInfo = async () => {
      // Always fetch fresh data from HTTP endpoint 
      const playingData = await fetchPlayingData();
      const currentStateId = createStateId(playingData);
      
      console.log('🔥 GameInfo: State evaluation:', {
        currentStateId,
        lastStateId: gameInfo.lastStateId,
        playingData,
        websocketCore: serverState.activeCore,
        websocketGame: serverState.activeGame
      });
      
      // ✅ CRITICAL: Always update current playing data in state
      setGameInfo(prev => ({ ...prev, currentPlayingData: playingData }));
      
      // Load info if state changed AND we have valid data
      if (currentStateId !== gameInfo.lastStateId && 
          playingData && 
          playingData.core && 
          playingData.core !== 'None') {
        
        console.log(`🔄 GameInfo: State changed: ${gameInfo.lastStateId} → ${currentStateId}`);
        
        // Add delay to let data settle
        setTimeout(() => {
          loadGameInfo(currentStateId, playingData);
        }, 500);
      }
      
      // Clear info if no core
      if ((!playingData || !playingData.core || playingData.core === 'None') && 
          gameInfo.lastStateId !== 'no-core') {
        console.log('🧹 GameInfo: Clearing game info (no active core)');
        clearGameInfo();
      }
    };

    checkAndLoadGameInfo();
  }, [serverState.activeCore, serverState.activeGame]); // Still trigger on WebSocket changes

  // Function to load game information using HTTP data
  const loadGameInfo = async (stateId: string, playingData: PlayingGame) => {
    console.log('🤖 GameInfo: loadGameInfo called with HTTP data:', playingData);
    
    setGameInfo(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      currentPlayingData: playingData 
    }));
    
    try {
      const gameContext = getGameContextFromHttp(playingData);
      
      if (!gameContext) {
        throw new Error('No game context available');
      }

      console.log('📝 GameInfo: Loading context from HTTP data:', gameContext);

      const prompt = `Provide interesting information about ${gameContext}.

Please respond with exactly 4 sections in JSON format:
{
  "tips": ["tip1", "tip2", "tip3"],
  "trivia": ["fact1", "fact2", "fact3"], 
  "technical": ["tech1", "tech2", "tech3"],
  "records": ["record1", "record2", "record3"]
}

Each section should have exactly 3 items. Keep each item concise (1-2 sentences).

Tips: Gameplay advice, strategies, hidden features
Trivia: Interesting facts, history, development stories  
Technical: Hardware info, specifications, technical details
Records: High scores, speedrun records, achievements`;

      const chatResponse = await api.sendMessage({
        message: prompt,
        include_context: true,
        session_id: 'gameinfo_' + Date.now()
      });

      // Parse Claude's response
      let sections;
      try {
        const jsonMatch = chatResponse.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          sections = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse JSON, using fallback:', parseError);
        sections = {
          tips: [chatResponse.content.substring(0, 200) + '...'],
          trivia: ['Unable to parse detailed information'],
          technical: ['Response format error'],
          records: ['Data unavailable']
        };
      }

      setGameInfo(prev => ({
        ...prev,
        tips: sections.tips || [],
        trivia: sections.trivia || [],
        technical: sections.technical || [],
        records: sections.records || [],
        loading: false,
        error: null,
        lastStateId: stateId,
        currentPlayingData: playingData
      }));

    } catch (error) {
      console.error('❌ GameInfo: Error loading info:', error);
      setGameInfo(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Failed to load game information',
        lastStateId: stateId,
        currentPlayingData: playingData
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
      lastStateId: 'no-core',
      currentPlayingData: null
    });
  };

  // ✅ IMPROVED: Get display name using current HTTP data
  const getCurrentDisplayName = () => {
    const { currentPlayingData } = gameInfo;

    console.log('🏷️ GameInfo: getCurrentDisplayName with HTTP data:', currentPlayingData);

    if (!currentPlayingData || !currentPlayingData.core || currentPlayingData.core === 'None') {
      return 'No active game';
    }
    
    // ✅ PRIORITY: Use gameName if available (this includes SAM data!)
    if (currentPlayingData.gameName && currentPlayingData.gameName.trim() !== '') {
      // For arcade games, show as "GameName (Arcade)"
      if (currentPlayingData.systemName === 'Arcade' || 
          currentPlayingData.system === 'Arcade' ||
          !currentPlayingData.game || currentPlayingData.game.trim() === '') {
        return `${currentPlayingData.gameName} (Arcade)`;
      }
      // For other games, show as "GameName (System)"
      return `${currentPlayingData.gameName} (${currentPlayingData.core})`;
    }
    
    // Fallback to game path
    if (currentPlayingData.game && currentPlayingData.game.trim() !== '') {
      const filename = currentPlayingData.game.split('/').pop() || '';
      if (filename) {
        const gameName = removeFileExtension(filename);
        return `${gameName} (${currentPlayingData.core})`;
      }
    }
    
    // Final fallback to system name
    return `${currentPlayingData.systemName || currentPlayingData.core} System`;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <GamepadIcon sx={{ mr: 1 }} />
          Game Information
        </Typography>
        
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          {getCurrentDisplayName()}
        </Typography>

        {gameInfo.loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading game information...</Typography>
          </Box>
        )}

        {gameInfo.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {gameInfo.error}
          </Alert>
        )}

        {!gameInfo.loading && !gameInfo.error && gameInfo.lastStateId === 'no-core' && (
          <Typography variant="body2" color="text.secondary">
            No active game detected
          </Typography>
        )}

        {!gameInfo.loading && !gameInfo.error && gameInfo.lastStateId !== 'no-core' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Tips Section */}
            {gameInfo.tips.length > 0 && (
              <Box>
                <Chip label="Tips & Strategies" size="small" color="primary" sx={{ mb: 1 }} />
                {gameInfo.tips.map((tip, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5, pl: 1 }}>
                    • {tip}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Trivia Section */}
            {gameInfo.trivia.length > 0 && (
              <Box>
                <Chip label="Fun Facts" size="small" color="secondary" sx={{ mb: 1 }} />
                {gameInfo.trivia.map((fact, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5, pl: 1 }}>
                    • {fact}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Technical Section */}
            {gameInfo.technical.length > 0 && (
              <Box>
                <Chip label="Technical Details" size="small" color="info" sx={{ mb: 1 }} />
                {gameInfo.technical.map((tech, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5, pl: 1 }}>
                    • {tech}
                  </Typography>
                ))}
              </Box>
            )}

            {/* Records Section */}
            {gameInfo.records.length > 0 && (
              <Box>
                <Chip label="Records & Achievements" size="small" color="success" sx={{ mb: 1 }} />
                {gameInfo.records.map((record, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5, pl: 1 }}>
                    • {record}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}

        {gameInfo.loading && (
          <Box sx={{ mt: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ mb: 2 }}>
                <Skeleton variant="rectangular" width="100px" height="20px" sx={{ mb: 1 }} />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="90%" />
                <Skeleton variant="text" width="85%" />
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}