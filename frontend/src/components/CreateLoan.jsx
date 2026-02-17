import React, { useState, useEffect } from 'react';
import { loanService, borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const CreateLoan = ({ onSuccess }) => {
  const { t } = useLanguage();
  const [borrowers, setBorrowers] = useState([]);
  const [formData, setFormData] = useState({
    borrowerId: '',
    amount: '',
    interestRate: '',
    approvedAt: '',
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
      setFormData({ borrowerId: '', amount: '', interestRate: '', approvedAt: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating loan:', error);
    }
  };

  return (
    <div className="create-loan">
      <h2>{t.createNewLoan}</h2>
      <form onSubmit={handleSubmit}>
        <select
          value={formData.borrowerId}
          onChange={(e) => setFormData({ ...formData, borrowerId: e.target.value })}
          required
        >
          <option value="">{t.selectBorrower}</option>
          {borrowers.map((b) => (
            <option key={b.borrowerId} value={b.borrowerId}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder={t.amount}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder={`${t.interestRate} (%)`}
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          required
        />
        <input
          type="date"
          placeholder={t.approvalDate}
          value={formData.approvedAt}
          onChange={(e) => setFormData({ ...formData, approvedAt: e.target.value })}
        />
        <button type="submit">{t.createLoan}</button>
      </form>
    </div>
  );
};

export default CreateLoan;
