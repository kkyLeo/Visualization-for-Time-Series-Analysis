import React, { useState } from 'react';
import CoOccurrenceMatrix from './Cross-correlation';
import GrangerTestMatrix from './GrangerTest';
import DTWMatrix from './DTW';
import CoIntegrationMatrix from './Co-integration';
import { createTheme, ThemeProvider, Button, ButtonGroup } from '@mui/material';
import { grey } from '@mui/material/colors';
import Grid from '@mui/material/Grid';

// Adjust the color theme for Material UI
const theme = createTheme({
    palette: {
      primary: {
        main: grey[700],
      },
      secondary: {
        main: grey[700],
      },
    },
  });
  
  // Define the keys for component mapping
  type ComponentKey = 'CoOccurrence' | 'GrangerTest' | 'DTW' | 'CoIntegration';
  
  function Layout() {
    // Use ComponentKey as the type for activeComponent
    const [activeComponent, setActiveComponent] = useState<ComponentKey>('CoIntegration');
  
    // Define the component mapping
    const componentMapping: Record<ComponentKey, JSX.Element> = {
      CoOccurrence: <CoOccurrenceMatrix />,
      GrangerTest: <GrangerTestMatrix />,
      DTW: <DTWMatrix />,
      CoIntegration: <CoIntegrationMatrix />,
    };
  
    return (
      <Grid
        container
        spacing={0}
        style={{
          width: '100%',
          margin: 0,
          padding: 0,
          height: '100vh', // Ensure it fills the viewport height
          flexDirection: 'column',
        }}
      >
        {/* Buttons Section */}
        <Grid
  item
  xs={12}
  style={{
    padding: '10px 0', // Add vertical padding only
    margin: 0,
    display: 'flex', // Use flexbox
    justifyContent: 'center', // Center content horizontally
    alignItems: 'center', // Align content vertically
    backgroundColor: grey[200],
  }}
>
  <ButtonGroup variant="contained" color="primary">
    <Button onClick={() => setActiveComponent('CoOccurrence')}>Cross-correlation Analysis</Button>
    <Button onClick={() => setActiveComponent('GrangerTest')}>Granger Test Analysis</Button>
    <Button onClick={() => setActiveComponent('DTW')}>DTW Analysis</Button>
    <Button onClick={() => setActiveComponent('CoIntegration')}>Co-integration Analysis</Button>
  </ButtonGroup>
</Grid>

  
        {/* Active Component Section */}
        <Grid
          item
          xs={12}
          style={{
            padding: 0,
            margin: 0,
            display: 'flex',
            justifyContent: 'center', // Center content horizontally
            alignItems: 'flex-start', // Align content to the top
            flexGrow: 1, // Ensure it takes up the remaining space
          }}
        >
          {componentMapping[activeComponent]}
        </Grid>
      </Grid>
    );
  }
  
  function Analysis() {
    return (
      <ThemeProvider theme={theme}>
        <Layout />
      </ThemeProvider>
    );
  }
  
  export default Analysis;