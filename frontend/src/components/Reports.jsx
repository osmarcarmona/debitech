import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { reportsService } from '../services/api';

function Reports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Set default dates: one year back from today
  const getDefaultDates = () => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    return {
      start: oneYearAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };
  
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  useEffect(() => {
    // Fetch reports with default date range on initial load
    const filters = {
      startDate: defaultDates.start,
      endDate: defaultDates.end
    };
    fetchReports(filters);
  }, []);

  const fetchReports = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await reportsService.getReports(filters);
      setReports(response.data);
      setError(null);
    } catch (err) {
      setError(t.errorLoadingReports || 'Error loading reports');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    fetchReports(filters);
  };

  const handleClearFilters = () => {
    const defaultDates = getDefaultDates();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    const filters = {
      startDate: defaultDates.start,
      endDate: defaultDates.end
    };
    fetchReports(filters);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const getCurrentMonthName = () => {
    const currentDate = new Date();
    const locale = t.locale || 'es-ES';
    const monthName = currentDate.toLocaleDateString(locale, { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  if (loading) {
    return <div className="loading">{t.loading || 'Loading...'}</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!reports) {
    return null;
  }

  return (
    <div className="reports-container">
      <h2>{t.reportsTitle}</h2>
      
      <div className="reports-filters">
        <div className="filter-group">
          <label>{t.startDate}:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>{t.endDate}:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button onClick={handleApplyFilters} className="filter-button">
          {t.applyFilters}
        </button>
        <button onClick={handleClearFilters} className="filter-button clear">
          {t.clearFilters}
        </button>
      </div>
      
      <div className="reports-grid">
        <div className="report-card">
          <div className="report-icon">💰</div>
          <div className="report-content">
            <h3>{t.totalDebt}</h3>
            <p className="report-value">{formatCurrency(reports.totalDebt)}</p>
            <span className="report-subtitle">{t.activeLoansCount}: {reports.activeLoans}</span>
          </div>
        </div>

        <div className="report-card">
          <div className="report-icon">💵</div>
          <div className="report-content">
            <h3>{t.totalInvested}</h3>
            <p className="report-value">{formatCurrency(reports.totalInvested)}</p>
            <span className="report-subtitle">{t.principalAmounts}</span>
          </div>
        </div>

        <div className="report-card">
          <div className="report-icon">📈</div>
          <div className="report-content">
            <h3>{t.interestProfit}</h3>
            <p className="report-value profit">{formatCurrency(reports.interestProfit)}</p>
            <span className="report-subtitle">{t.earnedToDate}</span>
          </div>
        </div>

        <div className="report-card">
          <div className="report-icon">📊</div>
          <div className="report-content">
            <h3>{t.incomingPayment}</h3>
            <p className="report-value">{formatCurrency(reports.incomingPayment)}</p>
            <span className="report-subtitle">{getCurrentMonthName()}</span>
          </div>
        </div>

        <div className="report-card top-borrowers">
          <div className="report-icon">🏆</div>
          <div className="report-content">
            <h3>{t.topProfitableBorrowers}</h3>
            {reports.topProfitableBorrowers && reports.topProfitableBorrowers.length > 0 ? (
              <div className="top-borrowers-list">
                {reports.topProfitableBorrowers.map((borrower, index) => (
                  <div key={borrower.borrowerId} className="borrower-item">
                    <div className="borrower-rank">{index + 1}</div>
                    <div className="borrower-info">
                      <span className="borrower-name">{borrower.name}</span>
                      <span className="borrower-profit">{formatCurrency(borrower.profit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="report-value-name">{t.noData}</p>
            )}
          </div>
        </div>

        <div className="report-card summary">
          <div className="report-icon">📋</div>
          <div className="report-content">
            <h3>{t.summary}</h3>
            <div className="summary-items">
              <div className="summary-item">
                <span>{t.totalLoans}:</span>
                <strong>{reports.totalLoans}</strong>
              </div>
              <div className="summary-item">
                <span>{t.approvedLoans}:</span>
                <strong>{reports.approvedLoans}</strong>
              </div>
              <div className="summary-item">
                <span>{t.activeLoans}:</span>
                <strong>{reports.activeLoans}</strong>
              </div>
              <div className="summary-item">
                <span>{t.totalBorrowers}:</span>
                <strong>{reports.totalBorrowers}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
