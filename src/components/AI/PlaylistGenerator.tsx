import React, { useState } from 'react';
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
  SelectChangeEvent
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Casino as RandomIcon,
  Lightbulb as IdeaIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  MoreVert as MoreIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';

const api = new ControlApi();

// ✅ Available gaming systems
const AVAILABLE_SYSTEMS = [
  'NES', 'SNES', 'Genesis', 'SMS', 'GG', 'GBA', 'GB', 'GBC', 
  'PSX', 'N64', 'PCE', 'Atari2600', 'Atari5200', 'Atari7800',
  'ColecoVision', 'Intellivision', 'C64', 'Amiga'
];

// ✅ System presets for quick selection
const SYSTEM_PRESETS = [
  { name: 'Nintendo Classics', systems: ['NES', 'SNES', 'GBA'], icon: '🎮' },
  { name: 'Sega Collection', systems: ['Genesis', 'SMS', 'GG'], icon: '🦔' },
  { name: '16-bit Era', systems: ['SNES', 'Genesis'], icon: '🕹️' },
  { name: 'Handhelds', systems: ['GB', 'GBC', 'GBA'], icon: '📱' },
  { name: 'Early Consoles', systems: ['NES', 'SMS', 'Atari2600'], icon: '👾' },
  { name: 'Popular 5', systems: ['NES', 'SNES', 'Genesis', 'GBA', 'PSX'], icon: '⭐' }
];

// ✅ Theme suggestions
const THEME_SUGGESTIONS = [
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
  max_games?: number;
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

export default function PlaylistGenerator() {
  const [theme, setTheme] = useState('');
  const [maxGames, setMaxGames] = useState(8);
  const [selectedSystems, setSelectedSystems] = useState<string[]>(['NES', 'SNES', 'Genesis']); // Popular default
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastTheme, setLastTheme] = useState<string>('');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Generate AI playlist based on theme
  const generatePlaylist = async (playlistTheme: string) => {
    if (!playlistTheme.trim()) return;

    setLoading(true);
    setError(null);
    setPlaylist([]);

    try {
      const request: PlaylistRequest = {
        theme: playlistTheme.trim(),
        max_games: maxGames,
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

  const handlePresetSelect = (preset: typeof SYSTEM_PRESETS[0]) => {
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
      const response = await fetch('/api/claude/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          games: playlist,
          theme: lastTheme
        })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `playlist_${lastTheme}.${format}`;

      // Download file
      const blob = await response.blob();
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

      {/* Input section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={3}>
          {/* Theme input */}
          <TextField
            fullWidth
            label="Describe the type of games you want"
            placeholder="Ex: Challenging 80s platformers with great music"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="outlined"
          />

          {/* System selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              🎯 Select Systems (fewer = faster generation):
              <Button 
                size="small" 
                onClick={clearSelectedSystems}
                disabled={loading || selectedSystems.length === 0}
                startIcon={<ClearIcon />}
                variant="text"
                sx={{ ml: 'auto' }}
              >
                Clear All
              </Button>
            </Typography>
            
            {/* System presets */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Quick presets:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {SYSTEM_PRESETS.map((preset) => (
                  <Chip
                    key={preset.name}
                    label={`${preset.icon} ${preset.name}`}
                    variant="outlined"
                    size="small"
                    onClick={() => handlePresetSelect(preset)}
                    disabled={loading}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Individual systems */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {AVAILABLE_SYSTEMS.map((system) => (
                <Chip
                  key={system}
                  label={system}
                  clickable
                  variant={selectedSystems.includes(system) ? 'filled' : 'outlined'}
                  color={selectedSystems.includes(system) ? 'primary' : 'default'}
                  onClick={() => handleSystemToggle(system)}
                  disabled={loading}
                  size="small"
                />
              ))}
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Selected: {selectedSystems.length} systems • Recommended: 3-5 systems for best results
            </Typography>
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Number of games"
              type="number"
              value={maxGames}
              onChange={(e) => setMaxGames(Math.max(1, Math.min(15, parseInt(e.target.value) || 8)))}
              disabled={loading}
              size="small"
              sx={{ width: 150 }}
              inputProps={{ min: 1, max: 15 }}
            />

            <Button
              variant="contained"
              onClick={() => generatePlaylist(theme)}
              disabled={loading || !theme.trim() || selectedSystems.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <RandomIcon />}
            >
              {loading ? 'Generating...' : 'Generate Playlist'}
            </Button>

            {playlist.length > 0 && !loading && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => generatePlaylist(lastTheme)}
                  startIcon={<RefreshIcon />}
                >
                  Regenerate
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleExportClick}
                  startIcon={<DownloadIcon />}
                  color="success"
                >
                  Export
                </Button>
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Theme suggestions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IdeaIcon fontSize="small" />
          Theme ideas:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          {THEME_SUGGESTIONS.map((suggestion, index) => (
            <Chip
              key={index}
              label={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              variant="outlined"
              size="small"
              sx={{ cursor: 'pointer', mb: 1 }}
              disabled={loading}
            />
          ))}
        </Stack>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Generated playlist */}
      {playlist.length > 0 && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                🎵 Generated Playlist: "{lastTheme}"
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {playlist.length} games selected by Claude AI from {selectedSystems.join(', ')}
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              onClick={handleExportClick}
              startIcon={<DownloadIcon />}
              size="small"
            >
              Export
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <List dense>
            {playlist.map((game, index) => (
              <ListItem key={index} divider={index < playlist.length - 1} sx={{ py: 1 }}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {index + 1}. {game.name}
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

      {/* Loading state */}
      {loading && playlist.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Claude is analyzing your {selectedSystems.join(', ')} collection...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Scanning ~{selectedSystems.length * 100} games • This should take 5-10 seconds
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Empty state */}
      {!loading && playlist.length === 0 && !error && (
        <Paper 
          elevation={1} 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            backgroundColor: theme => theme.palette.action.hover 
          }}
        >
          <RandomIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            AI-Powered Game Discovery
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Describe any gaming theme, mood, or style and Claude will curate a personalized 
            playlist from your selected systems.
          </Typography>
        </Paper>
      )}

      {/* Export menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
      >
        <MenuItem onClick={() => exportPlaylist('txt')}>
          📄 Text File (.txt)
        </MenuItem>
        <MenuItem onClick={() => exportPlaylist('m3u')}>
          🎵 Playlist File (.m3u)
        </MenuItem>
        <MenuItem onClick={() => exportPlaylist('json')}>
          🔧 JSON Data (.json)
        </MenuItem>
      </Menu>
    </Box>
  );
}