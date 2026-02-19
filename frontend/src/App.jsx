import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Tabs, Tab, Select, MenuItem, Box } from '@mui/material';
import LoanList from './components/LoanList';
import LoanDetails from './components/LoanDetails';
import CreateLoan from './components/CreateLoan';
import BorrowerList from './components/BorrowerList';
import CreateBorrower from './components/CreateBorrower';
import Reports from './components/Reports';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#007bff',
    },
    secondary: {
      main: '#6c757d',
    },
  },
});

function MainContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const [refreshBorrowers, setRefreshBorrowers] = useState(0);
  const [refreshLoans, setRefreshLoans] = useState(0);

  const getActiveTab = () => {
    if (location.pathname.startsWith('/loans')) return 'loans';
    if (location.pathname.startsWith('/reports')) return 'reports';
    return 'borrowers';
  };

  const activeTab = getActiveTab();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t.appTitle}
          </Typography>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            sx={{ 
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
              '.MuiSvgIcon-root': { color: 'white' }
            }}
          >
            <MenuItem value="es">Español</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </Select>
        </Toolbar>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => {
            if (newValue === 'borrowers') navigate('/');
            else if (newValue === 'loans') navigate('/loans');
            else if (newValue === 'reports') navigate('/reports');
          }}
          sx={{ bgcolor: 'primary.dark' }}
          textColor="inherit"
          indicatorColor="secondary"
        >
          <Tab label={t.borrowersTab} value="borrowers" />
          <Tab label={t.loansTab} value="loans" />
          <Tab label={t.reportsTab} value="reports" />
        </Tabs>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={
            <>
              <CreateBorrower onSuccess={() => setRefreshBorrowers(refreshBorrowers + 1)} />
              <BorrowerList key={refreshBorrowers} />
            </>
          } />
          <Route path="/loans" element={
            <>
              <CreateLoan onSuccess={() => setRefreshLoans(refreshLoans + 1)} />
              <LoanList key={refreshLoans} />
            </>
          } />
          <Route path="/loans/:id" element={<LoanDetails />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Container>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <LanguageProvider>
          <MainContent />
        </LanguageProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
