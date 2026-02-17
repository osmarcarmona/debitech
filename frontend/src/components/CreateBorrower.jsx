import React, { useState } from 'react';
import { borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const CreateBorrower = ({ onSuccess }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    creditScore: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const borrowerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      if (formData.creditScore) {
        borrowerData.creditScore = parseInt(formData.creditScore);
      }

      await borrowerService.createBorrower(borrowerData);
      setFormData({ name: '', email: '', phone: '', creditScore: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating borrower:', error);
      setError(error.response?.data?.error || t.failedToCreateBorrower);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="create-borrower">
      <h2>{t.createNewBorrower}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder={t.fullName}
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder={t.email}
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder={t.phoneNumber}
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="creditScore"
          placeholder={t.creditScoreOptional}
          value={formData.creditScore}
          onChange={handleChange}
          min="300"
          max="850"
        />
        <button type="submit" disabled={loading}>
          {loading ? t.creating : t.createBorrower}
        </button>
      </form>
    </div>
  );
};

export default CreateBorrower;
