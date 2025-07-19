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
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Casino as RandomIcon,
  Lightbulb as IdeaIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';

const api = new ControlApi();

// Add playlist types to models.ts if not already present
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
}

// Predefined theme suggestions for quick access
const THEME_SUGGESTIONS = [
  "Classic platformer games",
  "90s shoot 'em ups",
  "Epic Japanese RPGs", 
  "2-player cooperative games",
  "Arcade classics",
  "Legendary fighting games",
  "Point & click adventures",
  "Vertical shooters",
  "Retro racing games",
  "Addictive puzzle games",
  "Hidden gems",
  "Speedrun favorites"
];

export default function PlaylistGenerator() {
  const [theme, setTheme] = useState('');
  const [maxGames, setMaxGames] = useState(10);
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastTheme, setLastTheme] = useState<string>('');

  // Generate AI playlist based on theme
  const generatePlaylist = async (playlistTheme: string) => {
    if (!playlistTheme.trim()) return;

    setLoading(true);
    setError(null);
    setPlaylist([]);

    try {
      const request: PlaylistRequest = {
        theme: playlistTheme.trim(),
        max_games: maxGames
      };

      // Call the playlist endpoint (will need to be added to api.ts)
      const response = await api.generatePlaylist(request);

      if (response.error) {
          setError(response.error);
        } else {
          setPlaylist(response.games);
          setLastTheme(response.theme);
        }
    } catch (error) {
      console.error('Error generating playlist:', error);
      setError('Error generating playlist. Verify that Claude is enabled and configured.');
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

  // Launch a game from the playlist
  const launchGame = async (game: PlaylistGame) => {
    try {
      await api.launchFile(game.path);
    } catch (error) {
      console.error('Error launching game:', error);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RandomIcon />
          AI Playlist Generator
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Claude can generate curated game lists based on any theme or genre you describe.
        </Typography>
      </Paper>

      {/* Input section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
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

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Number of games"
              type="number"
              value={maxGames}
              onChange={(e) => setMaxGames(Math.max(1, Math.min(25, parseInt(e.target.value) || 10)))}
              disabled={loading}
              size="small"
              sx={{ width: 150 }}
              inputProps={{ min: 1, max: 25 }}
            />

            <Button
              variant="contained"
              onClick={() => generatePlaylist(theme)}
              disabled={loading || !theme.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <RandomIcon />}
            >
              {loading ? 'Generating...' : 'Generate Playlist'}
            </Button>

            {playlist.length > 0 && !loading && (
              <Button
                variant="outlined"
                onClick={() => generatePlaylist(lastTheme)}
                startIcon={<RefreshIcon />}
              >
                Regenerate
              </Button>
            )}
          </Box>
        </Stack>
      </Paper>

      {/* Theme suggestions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <IdeaIcon fontSize="small" />
          Quick ideas:
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
          <Typography variant="h6" gutterBottom>
            Generated Playlist: "{lastTheme}"
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {playlist.length} games selected by Claude AI
          </Typography>

          <Divider sx={{ my: 2 }} />

          <List dense>
            {playlist.map((game, index) => (
              <ListItem key={index} divider={index < playlist.length - 1}>
                <ListItemText
                  primary={game.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip label={game.system} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">
                        {game.path}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => launchGame(game)}
                    size="small"
                    color="primary"
                  >
                    <PlayIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => generatePlaylist(lastTheme)}
              disabled={loading}
              startIcon={<RandomIcon />}
            >
              Generate Another List
            </Button>
          </Box>
        </Paper>
      )}

      {/* Loading state */}
      {loading && playlist.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Claude is analyzing your game collection...
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
            playlist from your MiSTer collection.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}