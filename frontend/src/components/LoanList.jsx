import React, { useState, useEffect } from 'react';
import { loanService } from '../services/api';

const LoanList = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await loanService.getLoans();
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (loanId, newStatus) => {
    try {
      await loanService.updateLoanStatus(loanId, newStatus);
      fetchLoans();
    } catch (error) {
      console.error('Error updating loan status:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="loan-list">
      <h2>Loans</h2>
      <table>
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Borrower ID</th>
            <th>Amount</th>
            <th>Interest Rate</th>
            <th>Term (months)</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.loanId}>
              <td>{loan.loanId}</td>
              <td>{loan.borrowerId}</td>
              <td>${loan.amount}</td>
              <td>{loan.interestRate}%</td>
              <td>{loan.termMonths}</td>
              <td>{loan.status}</td>
              <td>
                <select
                  value={loan.status}
                  onChange={(e) => updateStatus(loan.loanId, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="paid">Paid</option>
                  <option value="defaulted">Defaulted</option>
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
