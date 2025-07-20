import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  useTheme,
  Chip,
  Divider
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Send as SendIcon,
  Lightbulb as SuggestionIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { ControlApi } from '../../lib/api';
import { ChatRequest, ChatResponse, ClaudeStatus, SuggestionsResponse } from '../../lib/models';

const api = new ControlApi();

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: any;
}

export default function ClaudeChat() {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load initial data when component mounts
  useEffect(() => {
    loadClaudeStatus();
    loadSuggestions();
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

  const loadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const suggestionsData = await api.getClaudeSuggestions();
      if (!suggestionsData.error && suggestionsData.suggestions) {
        setSuggestions(suggestionsData.suggestions);
      }
    } catch (err) {
      console.error('Error loading suggestions:', err);
      // Don't show error for suggestions as they're optional
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Send message to Claude with current MiSTer context
  const sendMessage = async (messageText: string = message) => {
    if (!messageText.trim() || loading) return;

    setLoading(true);
    setError(null);

    // Add user message immediately for better UX
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const request: ChatRequest = {
        message: messageText.trim(),
        include_context: true, // Always include MiSTer context
        session_id: sessionId
      };

      const claudeResponse = await api.sendClaudeMessage(request);
      
      if (claudeResponse.error) {
        setError(claudeResponse.error);
      } else {
        // Add Claude's response
        const assistantMessage: Message = {
          id: `assistant_${Date.now()}`,
          type: 'assistant',
          content: claudeResponse.content,
          timestamp: new Date(claudeResponse.timestamp),
          context: claudeResponse.context
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Error sending message to Claude. Check your configuration.');
      // Remove the user message if sending failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
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

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with status */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AIIcon sx={{ color: theme.palette.primary.main, fontSize: 32 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Claude AI Assistant</Typography>
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
          
          {/* Action buttons */}
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadSuggestions}
              disabled={loadingSuggestions}
            >
              Refresh
            </Button>
            {messages.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={clearChat}
              >
                Clear
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}

      {/* Claude not enabled warning */}
      {status && !status.enabled && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          Claude AI is not enabled. Go to Remote settings on your MiSTer to activate it.
        </Alert>
      )}

      {/* Chat messages area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 2,
        backgroundColor: theme.palette.background.default
      }}>
        {/* Auto-suggestions when no messages */}
        {suggestions.length > 0 && messages.length === 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SuggestionIcon fontSize="small" />
              Suggested questions:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  variant="outlined"
                  size="small"
                  sx={{ cursor: 'pointer', mb: 1 }}
                  disabled={loading || !!(status && !status.enabled)}
                />
              ))}
            </Stack>
            <Divider sx={{ mt: 2 }} />
          </Box>
        )}

        {/* Messages */}
        <Stack spacing={2}>
          {messages.map((msg) => (
            <Box key={msg.id}>
              {msg.type === 'user' ? (
                /* User message */
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Paper sx={{ 
                    p: 2, 
                    maxWidth: '70%',
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    borderRadius: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonIcon fontSize="small" />
                      <Typography variant="caption">You</Typography>
                    </Box>
                    <Typography variant="body1">
                      {msg.content}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>
                      {msg.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                /* Assistant message */
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <AIIcon sx={{ color: theme.palette.primary.main, mt: 1 }} />
                  <Paper sx={{ p: 2, flexGrow: 1, maxWidth: '85%', borderRadius: 2 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        mb: 1
                      }}
                    >
                      {msg.content}
                    </Typography>

                    {/* Game context if available */}
                    {msg.context && (
                      <Box sx={{ 
                        mt: 2, 
                        p: 1.5, 
                        backgroundColor: theme.palette.action.hover,
                        borderRadius: 1
                      }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Context:</strong> {msg.context.core_name}
                          {msg.context.game_name && ` - ${msg.context.game_name}`}
                        </Typography>
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {msg.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          ))}

          {/* Loading indicator */}
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AIIcon sx={{ color: theme.palette.primary.main }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Claude is thinking...
                </Typography>
              </Box>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Stack>

        {/* Welcome message when no messages */}
        {messages.length === 0 && !loading && status?.enabled && suggestions.length === 0 && (
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

      {/* Input area */}
      <Paper elevation={2} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask Claude something..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || !!(status && !status.enabled)}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={() => sendMessage()}
            disabled={loading || !message.trim() || !!(status && !status.enabled)}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            Send
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}