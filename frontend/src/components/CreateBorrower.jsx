import React, { useState } from 'react';
import { borrowerService } from '../services/api';

const CreateBorrower = ({ onSuccess }) => {
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
      setError(error.response?.data?.error || 'Failed to create borrower');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="create-borrower">
      <h2>Create New Borrower</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="creditScore"
          placeholder="Credit Score (optional)"
          value={formData.creditScore}
          onChange={handleChange}
          min="300"
          max="850"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Borrower'}
        </button>
      </form>
    </div>
  );
};

export default CreateBorrower;
