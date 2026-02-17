import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loanService, borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loan, setLoan] = useState(null);
  const [borrower, setBorrower] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPayment, setNewPayment] = useState({ 
    amount: '', 
    paymentDate: new Date().toISOString().split('T')[0] // Set today's date as default
  });
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const [loanResponse, paymentsResponse] = await Promise.all([
        loanService.getLoan(id),
        loanService.getPayments(id).catch(() => ({ data: [] }))
      ]);
      
      setLoan(loanResponse.data);
      setPayments(paymentsResponse.data);

      if (loanResponse.data.borrowerId) {
        const borrowerResponse = await borrowerService.getBorrower(loanResponse.data.borrowerId);
        setBorrower(borrowerResponse.data);
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      setError('Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await loanService.updateLoanStatus(id, newStatus);
      fetchLoanDetails();
    } catch (error) {
      console.error('Error updating loan status:', error);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setPaymentError('');
    
    const paymentAmount = parseFloat(newPayment.amount);
    const currentDueAmount = calculateDueAmount();
    
    // Validate payment doesn't exceed due amount
    if (paymentAmount > currentDueAmount) {
      setPaymentError(`Payment amount ($${paymentAmount.toFixed(2)}) cannot exceed the amount due ($${currentDueAmount.toFixed(2)})`);
      return;
    }
    
    try {
      await loanService.addPayment(id, newPayment);
      setNewPayment({ 
        amount: '', 
        paymentDate: new Date().toISOString().split('T')[0] // Reset to today's date
      });
      fetchLoanDetails();
    } catch (error) {
      console.error('Error adding payment:', error);
      setPaymentError('Failed to add payment. Please try again.');
    }
  };

  const handleUpdatePayment = async (paymentId, updatedData) => {
    setPaymentError('');
    
    const updatedAmount = parseFloat(updatedData.amount);
    const originalPayment = payments.find(p => p.paymentId === paymentId);
    const originalAmount = originalPayment ? parseFloat(originalPayment.amount) : 0;
    
    // Calculate what the due amount would be if we remove the original payment
    const currentDueAmount = calculateDueAmount();
    const adjustedDueAmount = currentDueAmount + originalAmount;
    
    // Validate updated payment doesn't exceed adjusted due amount
    if (updatedAmount > adjustedDueAmount) {
      setPaymentError(`Updated payment amount ($${updatedAmount.toFixed(2)}) cannot exceed the total amount ($${adjustedDueAmount.toFixed(2)})`);
      return;
    }
    
    try {
      await loanService.updatePayment(paymentId, updatedData);
      setEditingPayment(null);
      fetchLoanDetails();
    } catch (error) {
      console.error('Error updating payment:', error);
      setPaymentError('Failed to update payment. Please try again.');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await loanService.deletePayment(paymentId);
        fetchLoanDetails();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  };

  const startEditingPayment = (payment) => {
    setEditingPayment({
      paymentId: payment.paymentId,
      amount: payment.amount,
      paymentDate: payment.paymentDate
    });
  };

  const cancelEditing = () => {
    setEditingPayment(null);
  };

  const calculateTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  };

  const calculateAccruedInterest = () => {
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
    
    console.log("Approved Date:", approvedDate.toISOString());
    console.log("Current Date:", currentDate.toISOString());
    console.log("Days Elapsed:", daysElapsed);
    console.log("Months Elapsed:", monthsElapsed);
    console.log("Completed Cycles:", completedCycles);
    console.log("Days Into Current Cycle:", daysIntoCurrentCycle);
    
    // If we're at least 1 day into a new cycle, count it as a full cycle
    const billingCycles = daysIntoCurrentCycle >= 1 ? completedCycles + 1 : completedCycles;
    
    console.log("Billing Cycles:", billingCycles);
    
    // Calculate total accrued interest (full interest per cycle) - no cap on term months
    const accruedInterest = monthlyInterestAmount * billingCycles;
    
    console.log("Monthly Interest Amount:", monthlyInterestAmount);
    console.log("Accrued Interest:", accruedInterest);
    
    return accruedInterest;
  };

  const calculateBillingCycles = () => {
    if (!loan || !loan.approvedAt) return 0;
    
    const approvedDate = new Date(loan.approvedAt);
    const currentDate = new Date();
    
    // Set both dates to start of day for accurate day calculation
    approvedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    const daysElapsed = (currentDate - approvedDate) / (1000 * 60 * 60 * 24);
    
    if (daysElapsed < 0) return 0;
    
    const monthsElapsed = daysElapsed / 30;
    const completedCycles = Math.floor(monthsElapsed);
    const daysIntoCurrentCycle = daysElapsed - (completedCycles * 30);
    
    // If we're at least 1 day into a new cycle, count it as a full cycle
    const billingCycles = daysIntoCurrentCycle >= 1 ? completedCycles + 1 : completedCycles;
    
    return billingCycles;
  };

  const calculateDueAmount = () => {
    if (!loan) return 0;
    const principal = parseFloat(loan.amount);
    const accruedInterest = calculateAccruedInterest();
    const totalWithInterest = principal + accruedInterest;
    const totalPaid = calculateTotalPaid();
    return Math.max(0, totalWithInterest - totalPaid);
  };

  const calculateMinimalBasePayment = () => {
    if (!loan) return 0;
    const principal = parseFloat(loan.amount);
    const monthlyRate = parseFloat(loan.interestRate) / 100;
    return principal * monthlyRate;
  };

  const getNextPaymentDate = () => {
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!loan) return <div>Loan not found</div>;

  const totalPaid = calculateTotalPaid();
  const accruedInterest = calculateAccruedInterest();
  const dueAmount = calculateDueAmount();
  const totalAmount = parseFloat(loan.amount) + accruedInterest;
  const minimalBasePayment = calculateMinimalBasePayment();
  const nextPaymentDate = getNextPaymentDate();
  const billingCycles = calculateBillingCycles();

  return (
    <div className="loan-details">
      <button onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>
        {t.backToLoans}
      </button>
      
      <h2>{t.loanDetails}</h2>
      
      <div className="details-grid">
        <div className="detail-section">
          <h3>{t.loanInformation}</h3>
          <div className="detail-row">
            <span className="label">{t.loanId}:</span>
            <span className="value">{loan.loanId}</span>
          </div>
          <div className="detail-row">
            <span className="label">{t.principalAmount}:</span>
            <span className="value">${parseFloat(loan.amount).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="label">{t.interestRate}:</span>
            <span className="value">{loan.interestRate}% {t.monthly}</span>
          </div>
          <div className="detail-row">
            <span className="label">{t.monthInterestCycles}:</span>
            <span className="value" style={{ color: '#007bff', fontWeight: 'bold' }}>
              {billingCycles} {billingCycles === 1 ? t.cycle : t.cycles}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">{t.accruedInterest}:</span>
            <span className="value" style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
              ${accruedInterest.toFixed(2)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">{t.totalAmount}:</span>
            <span className="value">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="label">{t.minimalBasePayment}:</span>
            <span className="value" style={{ color: '#007bff', fontWeight: 'bold' }}>
              ${minimalBasePayment.toFixed(2)} / {t.month}
            </span>
          </div>
          {nextPaymentDate && (
            <div className="detail-row">
              <span className="label">{t.nextPaymentDue}:</span>
              <span className="value" style={{ color: '#ff6b6b' }}>
                {nextPaymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
          <div className="detail-row">
            <span className="label">{t.status}:</span>
            <span className="value">
              <select
                value={loan.status}
                onChange={(e) => updateStatus(e.target.value)}
              >
                <option value="pending">{t.pending}</option>
                <option value="approved">{t.approved}</option>
                <option value="active">{t.active}</option>
                <option value="paid">{t.paid}</option>
                <option value="defaulted">{t.defaulted}</option>
              </select>
            </span>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t.paymentSummary}</h3>
          <div className="detail-row">
            <span className="label">{t.totalPaid}:</span>
            <span className="value" style={{ color: '#28a745', fontWeight: 'bold' }}>
              ${totalPaid.toFixed(2)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">{t.amountDue}:</span>
            <span className="value" style={{ color: dueAmount > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
              ${dueAmount.toFixed(2)}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">{t.numberOfPayments}:</span>
            <span className="value">{payments.length}</span>
          </div>
        </div>

        <div className="detail-section">
          <h3>{t.borrowerInformation}</h3>
          {borrower ? (
            <>
              <div className="detail-row">
                <span className="label">{t.name}:</span>
                <span className="value">{borrower.name}</span>
              </div>
              <div className="detail-row">
                <span className="label">{t.email}:</span>
                <span className="value">{borrower.email}</span>
              </div>
              <div className="detail-row">
                <span className="label">{t.phone}:</span>
                <span className="value">{borrower.phone}</span>
              </div>
              <div className="detail-row">
                <span className="label">{t.creditScore}:</span>
                <span className="value">{borrower.creditScore}</span>
              </div>
            </>
          ) : (
            <p>Borrower information not available</p>
          )}
        </div>

        <div className="detail-section">
          <h3>{t.timeline}</h3>
          <div className="detail-row">
            <span className="label">{t.created}:</span>
            <span className="value">
              {loan.createdAt ? new Date(loan.createdAt).toLocaleString() : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">{t.approved}:</span>
            <span className="value">
              {loan.approvedAt ? new Date(loan.approvedAt).toLocaleString() : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span className="label">{t.disbursed}:</span>
            <span className="value">
              {loan.disbursedAt ? new Date(loan.disbursedAt).toLocaleString() : '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="payments-section" style={{ marginTop: '20px' }}>
        <h3>{t.addPayment}</h3>
        {paymentError && (
          <div style={{ 
            background: '#f8d7da', 
            color: '#721c24', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '10px',
            border: '1px solid #f5c6cb'
          }}>
            {paymentError}
          </div>
        )}
        {dueAmount === 0 ? (
          <p style={{ color: '#28a745', fontWeight: 'bold', padding: '10px', background: '#d4edda', borderRadius: '4px' }}>
            {t.fullyPaid}
          </p>
        ) : (
          <form onSubmit={handleAddPayment} style={{ maxWidth: '400px' }}>
            <input
              type="number"
              step="0.01"
              placeholder={t.paymentAmount}
              value={newPayment.amount}
              onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
              max={dueAmount}
              required
            />
            <small style={{ color: '#666', marginTop: '-5px', marginBottom: '5px', display: 'block' }}>
              {t.maximumPayment}: ${dueAmount.toFixed(2)}
            </small>
            <input
              type="date"
              placeholder={t.paymentDate}
              value={newPayment.paymentDate}
              onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
            />
            <button type="submit">{t.addPayment}</button>
          </form>
        )}

        <h3 style={{ marginTop: '30px' }}>{t.paymentHistory}</h3>
        {payments.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.amount}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map((payment) => (
                <tr key={payment.paymentId}>
                  {editingPayment && editingPayment.paymentId === payment.paymentId ? (
                    <>
                      <td>
                        <input
                          type="date"
                          value={editingPayment.paymentDate}
                          onChange={(e) => setEditingPayment({ ...editingPayment, paymentDate: e.target.value })}
                          style={{ padding: '5px', width: '100%' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={editingPayment.amount}
                          onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                          style={{ padding: '5px', width: '100%' }}
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => handleUpdatePayment(payment.paymentId, {
                            amount: editingPayment.amount,
                            paymentDate: editingPayment.paymentDate
                          })}
                          style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px' }}
                        >
                          {t.save}
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{ padding: '5px 10px', fontSize: '12px', background: '#6c757d' }}
                        >
                          {t.cancel}
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td>${parseFloat(payment.amount).toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => startEditingPayment(payment)}
                          style={{ marginRight: '5px', padding: '5px 10px', fontSize: '12px', background: '#ffc107' }}
                        >
                          {t.edit}
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.paymentId)}
                          style={{ padding: '5px 10px', fontSize: '12px', background: '#dc3545' }}
                        >
                          {t.delete}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>{t.noPayments}</p>
        )}
      </div>
    </div>
  );
};

export default LoanDetails;
