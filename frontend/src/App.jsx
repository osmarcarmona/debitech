import React, { useState } from 'react';
import LoanList from './components/LoanList';
import CreateLoan from './components/CreateLoan';
import BorrowerList from './components/BorrowerList';
import CreateBorrower from './components/CreateBorrower';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('borrowers');
  const [refreshBorrowers, setRefreshBorrowers] = useState(0);
  const [refreshLoans, setRefreshLoans] = useState(0);

  return (
    <div className="App">
      <header>
        <h1>Personal Loan Administration</h1>
        <nav className="tabs">
          <button
            className={activeTab === 'borrowers' ? 'active' : ''}
            onClick={() => setActiveTab('borrowers')}
          >
            Borrowers
          </button>
          <button
            className={activeTab === 'loans' ? 'active' : ''}
            onClick={() => setActiveTab('loans')}
          >
            Loans
          </button>
        </nav>
      </header>
      <main>
        {activeTab === 'borrowers' && (
          <>
            <CreateBorrower onSuccess={() => setRefreshBorrowers(refreshBorrowers + 1)} />
            <BorrowerList key={refreshBorrowers} />
          </>
        )}
        {activeTab === 'loans' && (
          <>
            <CreateLoan onSuccess={() => setRefreshLoans(refreshLoans + 1)} />
            <LoanList key={refreshLoans} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
