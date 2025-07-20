import React, { useState } from 'react';
import { Box, Tabs, Tab, useTheme } from '@mui/material';
import {
  Chat as ChatIcon,
  Settings as SettingsIcon,
  PlaylistPlay as PlaylistIcon,
  VideogameAsset as GameInfoIcon
} from '@mui/icons-material';
import ClaudeChat from './ClaudeChat';
import ClaudeSettings from './ClaudeSettings';
import PlaylistGenerator from './PlaylistGenerator';
import GameInfo from './GameInfo';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div 
      role="tabpanel"
      hidden={value !== index}
      style={{ height: value === index ? '100%' : 0, overflow: 'hidden' }}
    >
      {value === index && children}
    </div>
  );
}

export default function ClaudeTabs() {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Tab navigation */}
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: theme.palette.background.paper,
          '& .MuiTab-root': {
            minHeight: 48,
            fontSize: '0.875rem'
          }
        }}
      >
        <Tab 
          icon={<ChatIcon />} 
          label="Chat" 
          iconPosition="start"
          sx={{ minWidth: 80 }}
        />
        <Tab 
          icon={<GameInfoIcon />} 
          label="Game Info" 
          iconPosition="start"
          sx={{ minWidth: 90 }}
        />
        <Tab 
          icon={<PlaylistIcon />} 
          label="Playlists" 
          iconPosition="start"
          sx={{ minWidth: 90 }}
        />
        <Tab 
          icon={<SettingsIcon />} 
          label="Settings" 
          iconPosition="start"
          sx={{ minWidth: 80 }}
        />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <TabPanel value={tabValue} index={0}>
          <ClaudeChat />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <GameInfo />
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <PlaylistGenerator />
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <ClaudeSettings />
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
}