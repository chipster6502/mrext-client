import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Skeleton
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Casino as RandomIcon,
  Lightbulb as IdeaIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  MoreVert as MoreIcon,
  Clear as ClearIcon,
  Gamepad as GamepadIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';

const api = new ControlApi();

// Static theme suggestions for general use
const STATIC_THEME_SUGGESTIONS = [
  "Classic platformer games",
  "Fast-paced action games", 
  "Puzzle and brain teasers",
  "2-player cooperative games",
  "Retro arcade classics",
  "Epic RPG adventures", 
  "Racing and driving games",
  "Hidden gems and underrated titles"
];

// ✅ Enhanced interfaces
interface PlaylistRequest {
  theme: string;
  game_count?: number;  // ✅ Fixed: was max_games
  systems?: string[];
}

interface PlaylistResponse {
  games: PlaylistGame[];
  error?: string;
  theme: string;
  timestamp: string;
}

interface PlaylistGame {
  name: string;
  path: string;
  system: string;
  description?: string;
  reason?: string;
  generated_at?: string;
  theme?: string;
}

interface AvailableSystem {
  id: string;
  name: string;
}
interface ActiveGameSuggestionResponse {
  suggestion: string;
  timestamp: string;
}

export default function PlaylistGenerator() {
  const [theme, setTheme] = useState('');
  const [maxGames, setMaxGames] = useState(8);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastTheme, setLastTheme] = useState<string>('');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Dynamic systems states
  const [availableSystems, setAvailableSystems] = useState<AvailableSystem[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(true);
  const [systemsError, setSystemsError] = useState<string | null>(null);

  // Active game suggestion state  
  const [activeGameSuggestion, setActiveGameSuggestion] = useState<string>('');
  const [activeGameSuggestionLoading, setActiveGameSuggestionLoading] = useState(false);

  // ✅ NEW: Load available systems on component mount
  useEffect(() => {
    loadAvailableSystems();
    loadActiveGameSuggestion();
  }, []);

  const loadAvailableSystems = async () => {
    try {
      setSystemsLoading(true);
      setSystemsError(null);
      
      const indexedSystems = await api.indexedSystems();
      
      setAvailableSystems(indexedSystems.systems);
      
      // ✅ Automatically select some popular systems if available
      const popularSystems = ['Arcade', 'NES', 'SNES', 'Genesis', 'GBA'];
      const availablePopularSystems = indexedSystems.systems
        .filter(sys => popularSystems.includes(sys.id))
        .map(sys => sys.id)
        .slice(0, 3); // Maximum 3 systems by default
      
      setSelectedSystems(availablePopularSystems);
    } catch (error) {
      console.error('Error loading available systems:', error);
      setSystemsError('Error loading systems. Verify that games are indexed.');
    } finally {
      setSystemsLoading(false);
    }
  };

  // Load dynamic active game suggestion
  const loadActiveGameSuggestion = async () => {
    try {
      setActiveGameSuggestionLoading(true);
      const response = await fetch('/api/claude/active-game-suggestion');
      
      if (response.ok) {
        const data: ActiveGameSuggestionResponse = await response.json();
        setActiveGameSuggestion(data.suggestion);
      } else {
        // Fallback if no active game or service unavailable
        setActiveGameSuggestion('Similar games to active game');
      }
    } catch (error) {
      console.error('Error loading active game suggestion:', error);
      // Fallback suggestion
      setActiveGameSuggestion('Similar games to active game');
    } finally {
      setActiveGameSuggestionLoading(false);
    }
  };

  // Refresh active game suggestion
  const refreshActiveGameSuggestion = async () => {
    await loadActiveGameSuggestion();
  };

  // Get all theme suggestions (static + dynamic active game suggestion)
  const getAllThemeSuggestions = () => {
    const suggestions = [...STATIC_THEME_SUGGESTIONS];
    
    // Add active game suggestion at the beginning if available
    if (activeGameSuggestion && activeGameSuggestion !== 'Similar games to active game') {
      suggestions.unshift(activeGameSuggestion);
    } else if (activeGameSuggestion) {
      // Add generic active game suggestion
      suggestions.unshift(activeGameSuggestion);
    }
    
    return suggestions;
  };

  // ✅ NEW: Generate dynamic presets based on available systems
  const generateSystemPresets = () => {
    const availableSystemIds = availableSystems.map(s => s.id);
    
    const presets = [
      { 
        name: 'Nintendo Classics', 
        systems: ['NES', 'SNES', 'GBA'].filter(s => availableSystemIds.includes(s)), 
        icon: '🎮' 
      },
      { 
        name: 'Sega Console Collection', // ✅ UPDATED: Changed name and added more systems
        systems: ['Genesis', 'MasterSystem', 'GameGear', 'MegaCD', 'SG1000', 'Saturn', 'Sega32X'].filter(s => availableSystemIds.includes(s)), 
        icon: '🦔' 
      },
      { 
        name: 'Arcade Classics',
        systems: ['Arcade'].filter(s => availableSystemIds.includes(s)), 
        icon: '🎰' 
      },
      { 
        name: '16-bit Era', // ✅ UPDATED: Added more 16-bit systems
        systems: ['SNES', 'Genesis', 'NeoGeo', 'SuperGrafx', 'TurboGrafx16', 'TurboGrafx16CD'].filter(s => availableSystemIds.includes(s)), 
        icon: '🕹️' 
      },
      { 
        name: 'Handhelds', // ✅ UPDATED: Added many more handheld systems
        systems: ['Gameboy', 'GameboyColor', 'GBA', 'AtariLynx', 'GameNWatch', 'GameGear', 'SuperGameboy', 'WonderSwan', 'WonderSwanColor'].filter(s => availableSystemIds.includes(s)), 
        icon: '📱' 
      },
      {
        name: 'Commodore 4ever', // ✅ NEW: Commodore preset
        systems: ['C16', 'C64', 'VIC20', 'PET2001'].filter(s => availableSystemIds.includes(s)),
        icon: '🖥️'
      },
      { 
        name: 'Early Consoles', 
        systems: ['NES', 'SMS', 'Atari2600'].filter(s => availableSystemIds.includes(s)), 
        icon: '👾' 
      },
      { 
        name: 'Popular 6',
        systems: ['Arcade', 'NES', 'SNES', 'Genesis', 'GBA', 'PSX'].filter(s => availableSystemIds.includes(s)), 
        icon: '⭐' 
      }
    ];
    
    // Only return presets that have at least one available system
    return presets.filter(preset => preset.systems.length > 0);
  };

  // Generate AI playlist based on theme
  const generatePlaylist = async (playlistTheme: string) => {
    if (!playlistTheme.trim()) return;

    setLoading(true);
    setError(null);
    setPlaylist([]);

    try {
      const request: PlaylistRequest = {
        theme: playlistTheme.trim(),
        game_count: maxGames,  // ✅ Fixed: was max_games
        systems: selectedSystems
      };

      const response = await api.generatePlaylist(request);

      if (response.error) {
        setError(response.error);
      } else {
        setPlaylist(response.games);
        setLastTheme(response.theme);
      }
    } catch (error) {
      console.error('Error generating playlist:', error);
      setError('Error generating playlist. Try selecting fewer systems or reducing the number of games.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setTheme(suggestion);
    generatePlaylist(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      generatePlaylist(theme);
    }
  };

  // ✅ System management
  const handleSystemToggle = (system: string) => {
    setSelectedSystems(prev => 
      prev.includes(system)
        ? prev.filter(s => s !== system)
        : [...prev, system]
    );
  };

  const handlePresetSelect = (preset: any) => {
    setSelectedSystems(preset.systems);
  };

  const clearSelectedSystems = () => {
    setSelectedSystems([]);
  };

  // ✅ Export functionality
  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
  };

  const exportPlaylist = async (format: 'txt' | 'm3u' | 'json') => {
    try {
      const blob = await api.exportPlaylist(playlist, lastTheme, format);
      
      const filename = `playlist_${lastTheme.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      handleExportClose();
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export playlist');
    }
  };

  // Launch a game from the playlist
  const launchGame = async (game: PlaylistGame) => {
    try {
      await api.launchFile(game.path);
    } catch (error) {
      console.error('Error launching game:', error);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RandomIcon />
          AI Playlist Generator
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Claude generates curated game lists from your MiSTer collection based on any theme you describe.
        </Typography>
      </Paper>

      {/* Systems error */}
      {systemsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {systemsError}
          <Button 
            size="small" 
            onClick={loadAvailableSystems}
            sx={{ ml: 1 }}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Main Form */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        {/* Theme Input */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Describe your ideal playlist theme"
            placeholder="e.g., 'Classic platformer games', 'Hidden gems and underrated titles'"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || systemsLoading}
            variant="outlined"
            sx={{ mb: 2 }}
          />

          {/* Theme Suggestions */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {getAllThemeSuggestions().map((suggestion, index) => (
              <Chip
                key={index}
                label={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={loading || systemsLoading}
                variant="outlined"
                size="small"
                icon={
                  index === 0 && suggestion.includes('similar to') 
                    ? <GamepadIcon /> 
                    : <IdeaIcon />
                }
                sx={{
                  cursor: 'pointer',
                  '&:hover': { 
                    bgcolor: 'primary.light', 
                    color: 'white' 
                  },
                  ...(index === 0 && suggestion.includes('similar to') && {
                    borderColor: 'primary.main',
                    color: 'primary.main'
                  })
                }}
              />
            ))}
          </Box>
        </Box>
        {/* Refresh button for active game suggestion */}
        {activeGameSuggestion && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Active game suggestion updates automatically
            </Typography>
            <IconButton 
              size="small" 
              onClick={refreshActiveGameSuggestion}
              disabled={activeGameSuggestionLoading}
              title="Refresh active game suggestion"
            >
              {activeGameSuggestionLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
            </IconButton>
          </Box>
        )}
        {/* System Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Select Systems ({selectedSystems.length} selected)
          </Typography>

          {/* System Presets */}
          {!systemsLoading && availableSystems.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Quick Presets:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {generateSystemPresets().map((preset, index) => (
                  <Chip
                    key={index}
                    label={`${preset.icon} ${preset.name}`}
                    onClick={() => handlePresetSelect(preset)}
                    variant="outlined"
                    size="small"
                    disabled={loading}
                  />
                ))}
                <Chip
                  label="Clear All"
                  onClick={clearSelectedSystems}
                  variant="outlined"
                  size="small"
                  disabled={loading}
                  icon={<ClearIcon />}
                />
              </Box>
            </Box>
          )}

          {/* Individual Systems */}
          <Box sx={{ mb: 2 }}>
            {systemsLoading ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} variant="rectangular" width={80} height={32} />
                ))}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {availableSystems.map((system) => (
                  <Chip
                    key={system.id}
                    label={system.name}
                    variant={selectedSystems.includes(system.id) ? 'filled' : 'outlined'}
                    color={selectedSystems.includes(system.id) ? 'primary' : 'default'}
                    onClick={() => handleSystemToggle(system.id)}
                    disabled={loading}
                    size="small"
                  />
                ))}
              </Box>
            )}
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {availableSystems.length > 0 
                ? `${availableSystems.length} systems with games • Selected: ${selectedSystems.length} • Recommended: 3-5 systems for best balance`
                : 'Loading available systems...'
              }
            </Typography>
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Number of games"
              type="number"
              value={maxGames}
              onChange={(e) => setMaxGames(Math.max(1, Math.min(15, parseInt(e.target.value) || 8)))}
              disabled={loading || systemsLoading}
              size="small"
              sx={{ width: 150 }}
              inputProps={{ min: 1, max: 15 }}
            />

            <Button
              variant="contained"
              onClick={() => generatePlaylist(theme)}
              disabled={loading || systemsLoading || !theme.trim() || selectedSystems.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <RandomIcon />}
            >
              {loading ? 'Generating...' : 'Generate Playlist'}
            </Button>

            {playlist.length > 0 && (
              <Button
                variant="outlined"
                onClick={handleExportClick}
                startIcon={<DownloadIcon />}
                disabled={loading}
              >
                Export
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {playlist.length > 0 && (
        <Paper elevation={1} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RandomIcon />
            Generated Playlist: "{lastTheme}" ({playlist.length} games)
          </Typography>

          {/* System Distribution Summary */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>System Distribution:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(
                playlist.reduce((acc, game) => {
                  acc[game.system] = (acc[game.system] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([system, count]) => (
                <Chip 
                  key={system} 
                  label={`${system}: ${count}`} 
                  size="small" 
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <List>
            {playlist.map((game, index) => (
              <ListItem key={index} divider={index < playlist.length - 1}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" component="span">
                      {game.name}
                    </Typography>
                  }
                  secondary={
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={game.system} size="small" variant="outlined" />
                        {game.path && (
                          <Typography variant="caption" color="text.secondary">
                            {game.path.split('/').pop()}
                          </Typography>
                        )}
                      </Box>
                      {game.description && (
                        <Typography variant="body2" color="text.secondary">
                          📖 {game.description}
                        </Typography>
                      )}
                      {game.reason && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                          💡 {game.reason}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  {game.path && (
                    <IconButton
                      edge="end"
                      onClick={() => launchGame(game)}
                      size="small"
                      color="primary"
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      <PlayIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon fontSize="small" />
              Playlists update automatically when you change games. Export to save your discoveries!
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
      >
        <MenuItem onClick={() => exportPlaylist('txt')}>
          Text File (.txt)
        </MenuItem>
        <MenuItem onClick={() => exportPlaylist('m3u')}>
          Playlist (.m3u)
        </MenuItem>
        <MenuItem onClick={() => exportPlaylist('json')}>
          JSON Data (.json)
        </MenuItem>
      </Menu>
    </Box>
  );
}