import React, { useState, useEffect } from 'react';
import { loanService, borrowerService } from '../services/api';

const CreateLoan = ({ onSuccess }) => {
  const [borrowers, setBorrowers] = useState([]);
  const [formData, setFormData] = useState({
    borrowerId: '',
    amount: '',
    interestRate: '',
    termMonths: '',
  });

  useEffect(() => {
    fetchBorrowers();
  }, []);

  const fetchBorrowers = async () => {
    try {
      const response = await borrowerService.getBorrowers();
      setBorrowers(response.data);
    } catch (error) {
      console.error('Error fetching borrowers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await loanService.createLoan(formData);
      setFormData({ borrowerId: '', amount: '', interestRate: '', termMonths: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating loan:', error);
    }
  };

  return (
    <div className="create-loan">
      <h2>Create New Loan</h2>
      <form onSubmit={handleSubmit}>
        <select
          value={formData.borrowerId}
          onChange={(e) => setFormData({ ...formData, borrowerId: e.target.value })}
          required
        >
          <option value="">Select Borrower</option>
          {borrowers.map((b) => (
            <option key={b.borrowerId} value={b.borrowerId}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Interest Rate (%)"
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Term (months)"
          value={formData.termMonths}
          onChange={(e) => setFormData({ ...formData, termMonths: e.target.value })}
          required
        />
        <button type="submit">Create Loan</button>
      </form>
    </div>
  );
};

export default CreateLoan;
