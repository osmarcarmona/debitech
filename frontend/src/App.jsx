import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import LoanList from './components/LoanList';
import LoanDetails from './components/LoanDetails';
import CreateLoan from './components/CreateLoan';
import BorrowerList from './components/BorrowerList';
import CreateBorrower from './components/CreateBorrower';
import Reports from './components/Reports';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import './App.css';

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
    <div className="App">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{t.appTitle}</h1>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ 
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            <option value="es" style={{ background: 'white', color: 'black' }}>Español</option>
            <option value="en" style={{ background: 'white', color: 'black' }}>English</option>
          </select>
        </div>
        <nav className="tabs">
          <button
            className={activeTab === 'borrowers' ? 'active' : ''}
            onClick={() => navigate('/')}
          >
            {t.borrowersTab}
          </button>
          <button
            className={activeTab === 'loans' ? 'active' : ''}
            onClick={() => navigate('/loans')}
          >
            {t.loansTab}
          </button>
          <button
            className={activeTab === 'reports' ? 'active' : ''}
            onClick={() => navigate('/reports')}
          >
            {t.reportsTab}
          </button>
        </nav>
      </header>
      <main>
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
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <LanguageProvider>
        <MainContent />
      </LanguageProvider>
    </Router>
  );
}

export default App;
