import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, Grid, Card, CardContent, Box, Alert, CircularProgress, IconButton } from '@mui/material';
import { ArrowBack, Edit, Delete, Save, Cancel } from '@mui/icons-material';
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

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!loan) return <Alert severity="warning">Loan not found</Alert>;

  const totalPaid = calculateTotalPaid();
  const accruedInterest = calculateAccruedInterest();
  const dueAmount = calculateDueAmount();
  const totalAmount = parseFloat(loan.amount) + accruedInterest;
  const minimalBasePayment = calculateMinimalBasePayment();
  const nextPaymentDate = getNextPaymentDate();
  const billingCycles = calculateBillingCycles();

  return (
    <Box>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate(-1)} 
        sx={{ mb: 2 }}
      >
        {t.backToLoans}
      </Button>
      
      <Typography variant="h4" gutterBottom>{t.loanDetails}</Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t.loanInformation}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.loanId}:</Typography>
                  <Typography>{loan.loanId}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.principalAmount}:</Typography>
                  <Typography>${parseFloat(loan.amount).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.balanceAmount}:</Typography>
                  <Typography color="warning.main" fontWeight="bold">
                    ${loan.balanceAmount ? parseFloat(loan.balanceAmount).toFixed(2) : parseFloat(loan.amount).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.interestRate}:</Typography>
                  <Typography>{loan.interestRate}% {t.monthly}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.monthInterestCycles}:</Typography>
                  <Typography color="primary" fontWeight="bold">
                    {billingCycles} {billingCycles === 1 ? t.cycle : t.cycles}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.accruedInterest}:</Typography>
                  <Typography color="error" fontWeight="bold">
                    ${accruedInterest.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.totalAmount}:</Typography>
                  <Typography>${totalAmount.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.minimalBasePayment}:</Typography>
                  <Typography color="primary" fontWeight="bold">
                    ${minimalBasePayment.toFixed(2)} / {t.month}
                  </Typography>
                </Box>
                {nextPaymentDate && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">{t.nextPaymentDue}:</Typography>
                    <Typography color="error">
                      {nextPaymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography color="text.secondary">{t.status}:</Typography>
                  <Select
                    value={loan.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="pending">{t.pending}</MenuItem>
                    <MenuItem value="approved">{t.approved}</MenuItem>
                    <MenuItem value="active">{t.active}</MenuItem>
                    <MenuItem value="paid">{t.paid}</MenuItem>
                    <MenuItem value="defaulted">{t.defaulted}</MenuItem>
                  </Select>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t.paymentSummary}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.totalPaid}:</Typography>
                  <Typography color="success.main" fontWeight="bold">
                    ${totalPaid.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.amountDue}:</Typography>
                  <Typography color={dueAmount > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                    ${dueAmount.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.numberOfPayments}:</Typography>
                  <Typography>{payments.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t.borrowerInformation}</Typography>
              {borrower ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">{t.name}:</Typography>
                    <Typography>{borrower.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">{t.phone}:</Typography>
                    <Typography>{borrower.phone}</Typography>
                  </Box>
                </Box>
              ) : (
                <Typography color="text.secondary">Borrower information not available</Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>{t.timeline}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.created}:</Typography>
                  <Typography>
                    {loan.createdAt ? new Date(loan.createdAt).toLocaleString() : '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.approved}:</Typography>
                  <Typography>
                    {loan.approvedAt ? new Date(loan.approvedAt).toLocaleString() : '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.disbursed}:</Typography>
                  <Typography>
                    {loan.disbursedAt ? new Date(loan.disbursedAt).toLocaleString() : '-'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>{t.addPayment}</Typography>
        {paymentError && <Alert severity="error" sx={{ mb: 2 }}>{paymentError}</Alert>}
        {dueAmount === 0 ? (
          <Alert severity="success">{t.fullyPaid}</Alert>
        ) : (
          <Box component="form" onSubmit={handleAddPayment} sx={{ display: 'flex', gap: 2, mb: 3, maxWidth: 600 }}>
            <TextField
              type="number"
              label={t.paymentAmount}
              value={newPayment.amount}
              onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
              inputProps={{ step: '0.01', max: dueAmount }}
              helperText={`${t.maximumPayment}: $${dueAmount.toFixed(2)}`}
              required
              fullWidth
            />
            <TextField
              type="date"
              label={t.paymentDate}
              value={newPayment.paymentDate}
              onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Button type="submit" variant="contained" sx={{ minWidth: 120 }}>
              {t.addPayment}
            </Button>
          </Box>
        )}

        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>{t.paymentHistory}</Typography>
        {payments.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                  <TableCell>{t.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map((payment) => (
                  <TableRow key={payment.paymentId} hover>
                    {editingPayment && editingPayment.paymentId === payment.paymentId ? (
                      <>
                        <TableCell>
                          <TextField
                            type="date"
                            value={editingPayment.paymentDate}
                            onChange={(e) => setEditingPayment({ ...editingPayment, paymentDate: e.target.value })}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={editingPayment.amount}
                            onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                            inputProps={{ step: '0.01' }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleUpdatePayment(payment.paymentId, {
                              amount: editingPayment.amount,
                              paymentDate: editingPayment.paymentDate
                            })}
                            size="small"
                          >
                            <Save />
                          </IconButton>
                          <IconButton
                            color="secondary"
                            onClick={cancelEditing}
                            size="small"
                          >
                            <Cancel />
                          </IconButton>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell>${parseFloat(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <IconButton
                            color="warning"
                            onClick={() => startEditingPayment(payment)}
                            size="small"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleDeletePayment(payment.paymentId)}
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
            {t.noPayments}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default LoanDetails;
