import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Divider,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';
import { ClaudeStatus } from '../../lib/models';

const api = new ControlApi();

export default function ClaudeSettings() {
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setInitialLoad(true);
      const data = await api.getClaudeStatus();
      setStatus(data);
    } catch (error) {
      console.error('Error loading Claude status:', error);
      setMessage({ type: 'error', text: 'Error loading Claude configuration' });
    } finally {
      setInitialLoad(false);
    }
  };

  // Update configuration with optimistic UI updates
  const updateConfig = async (updates: Partial<ClaudeStatus>) => {
    setLoading(true);
    setMessage(null);

    // Optimistic update
    if (status) {
      setStatus({ ...status, ...updates });
    }

    try {
      await api.updateClaudeConfig(updates);
      setMessage({ type: 'success', text: 'Configuration updated successfully' });
    } catch (error) {
      console.error('Error updating config:', error);
      setMessage({ type: 'error', text: 'Error updating configuration' });
      // Revert optimistic update on error
      await loadStatus();
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!status) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Unable to load Claude configuration. Check connection to your MiSTer.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          Claude AI Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage Claude AI settings and functionality
        </Typography>
      </Paper>

      {/* Status message */}
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Service Status */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Service Status
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Chip 
              label={status.enabled ? "Enabled" : "Disabled"}
              color={status.enabled ? "success" : "default"}
              icon={status.enabled ? <CheckIcon /> : <ErrorIcon />}
              size="small"
            />
            <Chip 
              label={status.api_key_set ? "API Key Set" : "No API Key"}
              color={status.api_key_set ? "success" : "warning"}
              size="small"
            />
            <Chip 
              label={`Model: ${status.model}`}
              variant="outlined"
              size="small"
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={status.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                disabled={loading}
              />
            }
            label="Enable Claude AI Assistant"
          />
        </Paper>

        {/* Features Configuration */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>

          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={status.auto_suggestions}
                  onChange={(e) => updateConfig({ auto_suggestions: e.target.checked })}
                  disabled={loading || !status.enabled}
                />
              }
              label="Automatic game suggestions"
            />
            <Typography variant="caption" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
              Show AI-generated suggestions based on current game/system
            </Typography>
          </Stack>
        </Paper>

        {/* Performance & Limits */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Performance & Limits
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="Max requests per hour"
              type="number"
              value={status.max_requests}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value > 0) {
                  updateConfig({ max_requests: value });
                }
              }}
              disabled={loading || !status.enabled}
              size="small"
              helperText="Control API usage to prevent excessive costs"
              inputProps={{ min: 1, max: 1000 }}
            />

            <TextField
              label="Chat history (messages)"
              type="number"
              value={status.chat_history}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 0) {
                  updateConfig({ chat_history: value });
                }
              }}
              disabled={loading || !status.enabled}
              size="small"
              helperText="Number of messages to keep in memory per session"
              inputProps={{ min: 0, max: 50 }}
            />

            <TextField
              label="Timeout (seconds)"
              type="number"
              value={status.timeout}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value > 0) {
                  updateConfig({ timeout: value });
                }
              }}
              disabled={loading || !status.enabled}
              size="small"
              helperText="Maximum wait time for Claude responses"
              inputProps={{ min: 5, max: 120 }}
            />
          </Stack>
        </Paper>

        {/* Information */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Information
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            Claude AI provides intelligent assistance for your MiSTer FPGA, including 
            game recommendations, troubleshooting help, and retro gaming knowledge.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="body2" color="text.secondary">
            <strong>Setup:</strong> To configure your Anthropic API key, edit the 
            <code style={{ margin: '0 4px', padding: '2px 4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
              remote.ini
            </code> 
            file on your MiSTer.
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}