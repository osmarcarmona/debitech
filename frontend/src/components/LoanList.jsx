import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loanService, borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const LoanList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loans, setLoans] = useState([]);
  const [borrowers, setBorrowers] = useState({});
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(['approved', 'active']);
  const [sortField, setSortField] = useState('approvedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const loansResponse = await loanService.getLoans();
      const borrowersResponse = await borrowerService.getBorrowers();
      
      // Filter loans by selected statuses
      const filteredLoans = statusFilter.length === 0 
        ? loansResponse.data 
        : loansResponse.data.filter(loan => statusFilter.includes(loan.status));
      
      setLoans(filteredLoans);
      
      // Create a map of borrowerId to borrower name
      const borrowerMap = {};
      borrowersResponse.data.forEach(b => {
        borrowerMap[b.borrowerId] = b.name;
      });
      setBorrowers(borrowerMap);

      // Fetch payments for each loan
      const paymentsMap = {};
      await Promise.all(
        filteredLoans.map(async (loan) => {
          try {
            const paymentsResponse = await loanService.getPayments(loan.loanId);
            paymentsMap[loan.loanId] = paymentsResponse.data;
          } catch (error) {
            paymentsMap[loan.loanId] = [];
          }
        })
      );
      setPayments(paymentsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (loanId, newStatus) => {
    try {
      await loanService.updateLoanStatus(loanId, newStatus);
      fetchData();
    } catch (error) {
      console.error('Error updating loan status:', error);
    }
  };

  const calculateAccruedInterest = (loan) => {
    if (!loan || !loan.approvedAt) return 0;
    
    const approvedDate = new Date(loan.approvedAt);
    const currentDate = new Date();
    
    // Set both dates to start of day for accurate day calculation
    approvedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    const daysElapsed = (currentDate - approvedDate) / (1000 * 60 * 60 * 24);
    
    // Interest starts accruing from day 1
    if (daysElapsed < 0) return 0;
    
    const principal = parseFloat(loan.amount);
    const monthlyRate = parseFloat(loan.interestRate) / 100; // Interest rate is monthly
    
    // Calculate monthly interest amount
    const monthlyInterestAmount = principal * monthlyRate;
    
    // Calculate months elapsed (using 30 days per month)
    const monthsElapsed = daysElapsed / 30;
    
    // Calculate number of complete billing cycles
    const completedCycles = Math.floor(monthsElapsed);
    const daysIntoCurrentCycle = daysElapsed - (completedCycles * 30);
    
    // If we're at least 1 day into a new cycle, count it as a full cycle
    const billingCycles = daysIntoCurrentCycle >= 1 ? completedCycles + 1 : completedCycles;
    
    // Calculate total accrued interest (full interest per cycle) - no cap on term months
    const accruedInterest = monthlyInterestAmount * billingCycles;
    
    return accruedInterest;
  };

  const calculateTotalPaid = (loanId) => {
    const loanPayments = payments[loanId] || [];
    return loanPayments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  };

  const calculateTotalAmount = (loan) => {
    const principal = parseFloat(loan.amount);
    const accruedInterest = calculateAccruedInterest(loan);
    return principal + accruedInterest;
  };

  const calculatePendingToPay = (loan) => {
    const totalAmount = calculateTotalAmount(loan);
    const totalPaid = calculateTotalPaid(loan.loanId);
    return Math.max(0, totalAmount - totalPaid);
  };

  const getNextPaymentDate = (loan) => {
    if (!loan || !loan.approvedAt) return null;
    const approvedDate = new Date(loan.approvedAt);
    const currentDate = new Date();
    
    // Calculate next payment date (one month from approval)
    const nextPaymentDate = new Date(approvedDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    // If we're past the first payment, calculate the next upcoming payment
    if (currentDate > nextPaymentDate) {
      const monthsSinceApproval = Math.floor((currentDate - approvedDate) / (1000 * 60 * 60 * 24 * 30));
      nextPaymentDate.setMonth(approvedDate.getMonth() + monthsSinceApproval + 1);
    }
    
    return nextPaymentDate;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedLoans = () => {
    const sorted = [...loans].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'borrower':
          aValue = borrowers[a.borrowerId] || a.borrowerId;
          bValue = borrowers[b.borrowerId] || b.borrowerId;
          break;
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'interestRate':
          aValue = parseFloat(a.interestRate);
          bValue = parseFloat(b.interestRate);
          break;
        case 'totalAmount':
          aValue = calculateTotalAmount(a);
          bValue = calculateTotalAmount(b);
          break;
        case 'pendingToPay':
          aValue = calculatePendingToPay(a);
          bValue = calculatePendingToPay(b);
          break;
        case 'approvedAt':
          aValue = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
          bValue = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
          break;
        case 'nextPaymentDue':
          aValue = getNextPaymentDate(a) ? getNextPaymentDate(a).getTime() : 0;
          bValue = getNextPaymentDate(b) ? getNextPaymentDate(b).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="loan-list">
      <h2>{t.loans}</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label>{t.filterByStatus}: </label>
        <select 
          multiple
          value={statusFilter} 
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            setStatusFilter(selected);
          }}
          style={{ minHeight: '120px', minWidth: '150px' }}
        >
          <option value="pending">{t.pending}</option>
          <option value="approved">{t.approved}</option>
          <option value="active">{t.active}</option>
          <option value="paid">{t.paid}</option>
          <option value="defaulted">{t.defaulted}</option>
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t.loanId}</th>
            <th 
              onClick={() => handleSort('borrower')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.borrower} {sortField === 'borrower' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => handleSort('amount')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.amount} {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => handleSort('interestRate')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.interestRate} {sortField === 'interestRate' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => handleSort('totalAmount')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.totalAmount} {sortField === 'totalAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => handleSort('pendingToPay')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.pendingToPay} {sortField === 'pendingToPay' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => handleSort('approvedAt')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.approvedDate} {sortField === 'approvedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              onClick={() => handleSort('nextPaymentDue')} 
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              {t.nextPaymentDue} {sortField === 'nextPaymentDue' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th>{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {getSortedLoans().map((loan) => (
            <tr key={loan.loanId}>
              <td>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); navigate(`/loans/${loan.loanId}`); }}
                  style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                  title={loan.loanId}
                >
                  {loan.loanId.substring(0, 4)}
                </a>
              </td>
              <td>{borrowers[loan.borrowerId] || loan.borrowerId}</td>
              <td>${parseFloat(loan.amount).toFixed(2)}</td>
              <td>{loan.interestRate}%</td>
              <td>${calculateTotalAmount(loan).toFixed(2)}</td>
              <td style={{ 
                color: calculatePendingToPay(loan) > 0 ? '#dc3545' : '#28a745',
                fontWeight: 'bold'
              }}>
                ${calculatePendingToPay(loan).toFixed(2)}
              </td>
              <td>{loan.approvedAt ? new Date(loan.approvedAt).toLocaleDateString() : '-'}</td>
              <td style={{ color: '#ff6b6b' }}>
                {getNextPaymentDate(loan) 
                  ? getNextPaymentDate(loan).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '-'
                }
              </td>
              <td>
                <select
                  value={loan.status}
                  onChange={(e) => updateStatus(loan.loanId, e.target.value)}
                >
                  <option value="pending">{t.pending}</option>
                  <option value="approved">{t.approved}</option>
                  <option value="active">{t.active}</option>
                  <option value="paid">{t.paid}</option>
                  <option value="defaulted">{t.defaulted}</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoanList;
