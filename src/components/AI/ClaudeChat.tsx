import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';
import { ChatRequest, ChatResponse, ClaudeStatus } from '../../lib/models';

const api = new ControlApi();

export default function ClaudeChat() {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ClaudeStatus | null>(null);

  // Load Claude status when component mounts
  React.useEffect(() => {
    loadClaudeStatus();
  }, []);

  const loadClaudeStatus = async () => {
    try {
      const claudeStatus = await api.getClaudeStatus();
      setStatus(claudeStatus);
    } catch (err) {
      console.error('Error loading Claude status:', err);
      setError('Error connecting to Claude. Verify that Remote is running.');
    }
  };

  // Send message to Claude with current game context
  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const request: ChatRequest = {
        message: message.trim(),
        include_context: true, // Include current MiSTer game context
        session_id: `test_session_${Date.now()}`
      };

      const claudeResponse = await api.sendClaudeMessage(request);
      setResponse(claudeResponse);

      if (claudeResponse.error) {
        setError(claudeResponse.error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Error sending message to Claude. Check your configuration.');
    } finally {
      setLoading(false);
      setMessage(''); // Clear input after sending
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      {/* Header with Claude status */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
          <Box>
            <Typography variant="h5">Claude AI Assistant</Typography>
            <Typography variant="body2" color="text.secondary">
              {status ? (
                status.enabled ? 
                  `✅ Connected - Model: ${status.model}` : 
                  '⚠️ Claude disabled in configuration'
              ) : (
                '🔄 Connecting...'
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Global error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Claude not enabled warning */}
      {status && !status.enabled && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Claude AI is not enabled. Go to Remote settings on your MiSTer to activate it.
        </Alert>
      )}

      {/* Message input area */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            label="Ask Claude something"
            placeholder="Ex: What games do you recommend for this system?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || (status && !status.enabled)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={sendMessage}
              disabled={loading || !message.trim() || (status && !status.enabled)}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Claude's response */}
      {response && (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            Claude's Response:
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              mb: 2
            }}
          >
            {response.content}
          </Typography>

          {/* Game context if available */}
          {response.context && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: theme.palette.action.hover,
              borderRadius: 1
            }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Context:</strong> {response.context.core_name}
                {response.context.game_name && ` - ${response.context.game_name}`}
              </Typography>
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {new Date(response.timestamp).toLocaleTimeString()}
          </Typography>
        </Paper>
      )}

      {/* Initial welcome message */}
      {!response && !loading && status?.enabled && (
        <Paper elevation={1} sx={{ p: 3, textAlign: 'center', backgroundColor: theme.palette.action.hover }}>
          <AIIcon sx={{ fontSize: 48, color: theme.palette.primary.main, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Hello! I'm Claude
          </Typography>
          <Typography variant="body1" color="text.secondary">
            I can help you with your MiSTer FPGA, answer questions about retro gaming,
            or just chat. How can I assist you today?
          </Typography>
        </Paper>
      )}
    </Box>
  );
}