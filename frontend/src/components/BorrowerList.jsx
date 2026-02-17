import React, { useState, useEffect } from 'react';
import { borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const BorrowerList = () => {
  const { t } = useLanguage();
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
      setError(t.failedToLoadBorrowers);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">{t.loadingBorrowers}</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="borrower-list">
      <h2>{t.borrowers} ({borrowers.length})</h2>
      {borrowers.length === 0 ? (
        <p className="empty-state">{t.noBorrowersYet}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.email}</th>
              <th>{t.phone}</th>
              <th>{t.creditScore}</th>
              <th>{t.status}</th>
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
