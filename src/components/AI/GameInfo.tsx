import React, { useState, useEffect } from 'react';
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

interface GameInfoData {
  tips: string[];
  trivia: string[];
  technical: string[];
  records: string[];
  loading: boolean;
  error: string | null;
  lastGame: string;
}

export default function GameInfo() {
  const theme = useTheme();
  const serverState = useServerStateStore();
  
  
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
  const isArcadeGame = () => {
    // If no core, not a game
    if (!serverState.activeCore || serverState.activeCore === 'None') {
      return false;
    }

    // If activeGame is empty/None, it's arcade
    if (!serverState.activeGame || serverState.activeGame === 'None') {
      return true;
    }

    // If activeGame equals activeCore, it's arcade
    if (serverState.activeGame === serverState.activeCore) {
      return true;
    }

    // NEW: Smart detection for stale activeGame
    // If activeCore doesn't contain "/" but activeGame does contain "/", 
    // and the system in activeGame doesn't match activeCore → arcade
    if (!serverState.activeCore.includes('/') && 
        serverState.activeGame.includes('/')) {
      
      const gameSystem = serverState.activeGame.split('/')[0].toLowerCase();
      const coreSystem = serverState.activeCore.toLowerCase();
      
      // If the systems don't match, we're in arcade with stale console data
      if (gameSystem !== coreSystem && 
          !coreSystem.includes(gameSystem) && 
          !gameSystem.includes(coreSystem)) {
        return true;
      }
    }

    // Explicit arcade indicators
    if (serverState.activeGame.includes('_Arcade') || 
        serverState.activeCore.includes('_Arcade')) {
      return true;
    }

    return false;
  };

  // Watch for game changes and automatically load info
  useEffect(() => {
    const currentGame = isArcadeGame() 
      ? serverState.activeCore 
      : `${serverState.activeCore}_${serverState.activeGame}`;
    
    if (currentGame !== gameInfo.lastGame && 
        serverState.activeCore && 
        serverState.activeCore !== 'None') {
      loadGameInfo();
    }
  }, [serverState.activeCore, serverState.activeGame]);

  // Load game information automatically
  const loadGameInfo = async () => {
    if (!serverState.activeCore || serverState.activeCore === 'None') {
      setGameInfo(prev => ({
        ...prev,
        tips: [],
        trivia: [],
        technical: [],
        records: [],
        error: null,
        lastGame: ''
      }));
      return;
    }

    setGameInfo(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Create a specific prompt for game information
      const gameContext = serverState.activeGame && serverState.activeGame !== 'None' 
        ? `${serverState.activeGame}` 
        : `${serverState.activeCore} system`;

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

      const response = await api.sendClaudeMessage(request);
      
      if (response.error) {
        setGameInfo(prev => ({ 
          ...prev, 
          loading: false, 
          error: response.error || 'Error loading game information' 
        }));
      } else {
        // Parse the structured response
        const parsed = parseGameInfoResponse(response.content);
        setGameInfo(prev => ({
          ...prev,
          ...parsed,
          loading: false,
          error: null,
          lastGame: `${serverState.activeCore}_${serverState.activeGame}`
        }));
      }
    } catch (error) {
      console.error('Error loading game info:', error);
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

  const formatGameTitle = () => {
    if (!serverState.activeCore || serverState.activeCore === 'None') {
      return 'No active game';
    }
    
    // For arcade games, the core name IS the game name
    if (isArcadeGame()) {
      return `${serverState.activeCore} (Arcade)`;
    }
    
    // For console games, extract game name from activeGame path
    if (serverState.activeGame && serverState.activeGame !== 'None') {
      const gameName = serverState.activeGame.split('/').pop()?.split('.')[0] || serverState.activeGame;
      return `${gameName} (${serverState.activeCore})`;
    }
    
    return `${serverState.activeCore} System`;
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
                {formatGameTitle()}
              </Typography>
            </Box>
          </Box>
          
          {serverState.activeCore && serverState.activeCore !== 'None' && (
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
      {(!serverState.activeCore || serverState.activeCore === 'None') && (
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
              Claude is gathering information about your game...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Game information sections */}
      {!gameInfo.loading && !gameInfo.error && serverState.activeCore && serverState.activeCore !== 'None' && (
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
              This information updates automatically when you change games
            </Typography>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}