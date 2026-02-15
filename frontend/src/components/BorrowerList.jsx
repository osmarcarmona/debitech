import React, { useState, useEffect } from 'react';
import { borrowerService } from '../services/api';

const BorrowerList = () => {
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBorrowers();
  }, []);

  const fetchBorrowers = async () => {
    try {
      const response = await borrowerService.getBorrowers();
      setBorrowers(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching borrowers:', error);
      setError('Failed to load borrowers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading borrowers...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="borrower-list">
      <h2>Borrowers ({borrowers.length})</h2>
      {borrowers.length === 0 ? (
        <p className="empty-state">No borrowers yet. Create one to get started!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Credit Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {borrowers.map((borrower) => (
              <tr key={borrower.borrowerId}>
                <td>{borrower.name}</td>
                <td>{borrower.email}</td>
                <td>{borrower.phone}</td>
                <td>{borrower.creditScore || 'N/A'}</td>
                <td>
                  <span className={`status-badge status-${borrower.status}`}>
                    {borrower.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BorrowerList;
