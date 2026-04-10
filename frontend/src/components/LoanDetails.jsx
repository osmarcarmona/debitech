import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, Grid, Card, CardContent, Box, Alert, CircularProgress, IconButton } from '@mui/material';
import { ArrowBack, Edit, Delete, Save, Cancel, PictureAsPdf } from '@mui/icons-material';
import { loanService, borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loan, setLoan] = useState(null);
  const [borrower, setBorrower] = useState(null);
  const [payments, setPayments] = useState([]);
  const [interestCycles, setInterestCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPayment, setNewPayment] = useState({ 
    amount: '', 
    paymentType: 'capital', // Default to capital payment
    paymentDate: new Date().toISOString().split('T')[0] // Set today's date as default
  });
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all'); // Filter for payment list

  useEffect(() => {
    fetchLoanDetails();
  }, [id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const [loanResponse, paymentsResponse, cyclesResponse] = await Promise.all([
        loanService.getLoan(id),
        loanService.getPayments(id).catch(() => ({ data: [] })),
        loanService.getInterestCycles(id).catch(() => ({ data: [] }))
      ]);
      
      setLoan(loanResponse.data);
      setPayments(paymentsResponse.data);
      setInterestCycles(cyclesResponse.data);

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

  const handleDeleteLoan = async () => {
    if (window.confirm(t.confirmDeleteLoan || 'Are you sure you want to delete this loan? This will also delete all associated payments. This action cannot be undone.')) {
      try {
        await loanService.deleteLoan(id);
        navigate('/loans');
      } catch (error) {
        console.error('Error deleting loan:', error);
        setError('Failed to delete loan. Please try again.');
      }
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
        paymentType: 'capital', // Reset to capital
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
      paymentType: payment.paymentType || 'capital',
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
    // Use backend interest cycles data if available
    if (interestCycles && interestCycles.length > 0) {
      return interestCycles.reduce((sum, cycle) => sum + parseFloat(cycle.interestAmount), 0);
    }
    
    // Fallback calculation if no backend data
    if (!loan || !loan.approvedAt) return 0;
    
    const approvedDate = new Date(loan.approvedAt);
    const currentDate = new Date();
    
    // Set both dates to start of day for accurate day calculation
    approvedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    // Interest starts accruing from day 0 (approval day)
    if (currentDate < approvedDate) return 0;

    const principal = parseFloat(loan.amount);
    const monthlyRate = parseFloat(loan.interestRate) / 100;
    const monthlyInterestAmount = principal * monthlyRate;
    
    // Calculate complete calendar months elapsed
    const yearsDiff = currentDate.getFullYear() - approvedDate.getFullYear();
    const monthsDiff = currentDate.getMonth() - approvedDate.getMonth();
    const daysDiff = currentDate.getDate() - approvedDate.getDate();
    
    // Calculate total months difference
    let totalMonths = yearsDiff * 12 + monthsDiff;
    
    // If we're on or past the approval day, count it as a complete cycle
    if (daysDiff >= 0) {
      totalMonths += 1;
    }
    
    const finalBillingCycles = Math.max(0, totalMonths);
    
    // Calculate total accrued interest (full interest per cycle)
    const accruedInterest = monthlyInterestAmount * finalBillingCycles;
    
    return accruedInterest;
  };

  const calculateBillingCycles = () => {
    if (!loan || !loan.approvedAt) return 0;
    
    const approvedDate = new Date(loan.approvedAt);
    const currentDate = new Date();
    
    // Set both dates to start of day for accurate day calculation
    approvedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    if (currentDate < approvedDate) return 0;
    
    // Calculate complete calendar months elapsed
    const yearsDiff = currentDate.getFullYear() - approvedDate.getFullYear();
    const monthsDiff = currentDate.getMonth() - approvedDate.getMonth();
    const daysDiff = currentDate.getDate() - approvedDate.getDate();
    
    // Calculate total months difference
    let totalMonths = yearsDiff * 12 + monthsDiff;
    
    // If we're on or past the approval day in the current month, count it as a complete cycle
    if (daysDiff >= 0) {
      totalMonths += 1;
    }
    
    return Math.max(0, totalMonths);
  };

  const getInterestBreakdown = () => {
    // Use interest cycles from the backend only
    if (interestCycles && interestCycles.length > 0) {
      return interestCycles.map(cycle => ({
        cycle: cycle.cycleNumber,
        startDate: new Date(cycle.cycleStartDate),
        endDate: new Date(cycle.cycleEndDate),
        amount: parseFloat(cycle.interestAmount),
        principalBalance: parseFloat(cycle.principalBalance)
      }));
    }
    
    // Return empty array if no backend data
    return [];
  };

  const formatDateDDMMYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
    const balance = loan.balanceAmount 
      ? parseFloat(loan.balanceAmount) 
      : parseFloat(loan.amount);
    const monthlyRate = parseFloat(loan.interestRate) / 100;
    return balance * monthlyRate;
  };

  const getNextPaymentDate = () => {
    if (!loan || !loan.approvedAt) return null;
    const approvedDate = new Date(loan.approvedAt);
    const currentDate = new Date();
    
    approvedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    // Calculate the next payment date based on calendar months
    const billingCycles = calculateBillingCycles();
    
    // Next payment is due at the start of the next billing cycle
    const nextPaymentDate = new Date(approvedDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + billingCycles);
    
    return nextPaymentDate;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const borrowerName = borrower ? borrower.name : loan.borrowerId;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text(t.loanDetails, pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(10);
    doc.text(`${t.generated || 'Generated'}: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Borrower info
    doc.setFontSize(13);
    doc.text(t.borrowerInformation, 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`${t.name}: ${borrowerName}`, 14, y);
    y += 6;
    if (borrower?.phone) {
      doc.text(`${t.phone}: ${borrower.phone}`, 14, y);
      y += 6;
    }
    y += 4;

    // Loan info table
    doc.setFontSize(13);
    doc.text(t.loanInformation, 14, y);
    y += 2;

    const balance = loan.balanceAmount ? parseFloat(loan.balanceAmount) : parseFloat(loan.amount);
    const capitalPaidVal = parseFloat(loan.amount) - balance;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      body: [
        [t.principalAmount, `$${parseFloat(loan.amount).toFixed(2)}`],
        [t.balanceAmount, `$${balance.toFixed(2)}`],
        [t.interestRate, `${loan.interestRate}% ${t.monthly}`],
        [t.monthInterestCycles, `${billingCycles} ${billingCycles === 1 ? t.cycle : t.cycles}`],
        [t.accruedInterest, `$${outstandingInterest.toFixed(2)}`],
        [t.totalAmount, `$${totalAmount.toFixed(2)}`],
        [t.minimalBasePayment, `$${minimalBasePayment.toFixed(2)} / ${t.month}`],
        [t.status, t[loan.status] || loan.status],
      ],
      columns: [
        { header: t.loanInformation, dataKey: 0 },
        { header: '', dataKey: 1 },
      ],
    });
    y = doc.lastAutoTable.finalY + 10;

    // Payment summary
    doc.setFontSize(13);
    doc.text(t.paymentSummary, 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96] },
      body: [
        [t.totalPaid, `$${totalPaid.toFixed(2)}`],
        [t.capitalPaid, `$${capitalPaidVal.toFixed(2)}`],
        [t.interestPaid, `$${interestPaid.toFixed(2)}`],
        [t.amountDue, `$${dueAmount.toFixed(2)}`],
        [t.numberOfPayments, `${payments.length}`],
      ],
      columns: [
        { header: t.paymentSummary, dataKey: 0 },
        { header: '', dataKey: 1 },
      ],
    });
    y = doc.lastAutoTable.finalY + 10;

    // Payment history
    if (payments.length > 0) {
      doc.setFontSize(13);
      doc.text(t.paymentHistory, 14, y);
      y += 2;

      const sortedPayments = [...payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      autoTable(doc, {
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] },
        head: [[t.date, t.amount, t.paymentType]],
        body: sortedPayments.map(p => [
          new Date(p.paymentDate).toLocaleDateString(),
          `$${parseFloat(p.amount).toFixed(2)}`,
          p.paymentType === 'interest' ? t.interestPayment : t.capitalPayment,
        ]),
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Interest breakdown
    if (interestBreakdown.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(13);
      doc.text(t.interestBreakdown || 'Interest Breakdown', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [192, 57, 43] },
        head: [[t.cycle || 'Cycle', t.cycleDates || 'Cycle Dates', t.amount]],
        body: [
          ...interestBreakdown.map(item => [
            item.cycle,
            `${formatDateDDMMYYYY(item.startDate)} - ${formatDateDDMMYYYY(item.endDate)}`,
            `$${item.amount.toFixed(2)}`,
          ]),
          [{ content: t.total || 'Total', colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `$${totalAccruedInterest.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
        ],
      });
    }

    doc.save(`${t.loanDetails}_${borrowerName}_${loan.loanId.substring(0, 8)}.pdf`);
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!loan) return <Alert severity="warning">Loan not found</Alert>;

  const totalPaid = calculateTotalPaid();
  const totalAccruedInterest = calculateAccruedInterest();
  const interestPaid = loan.balanceInterestAmount ? parseFloat(loan.balanceInterestAmount) : 0;
  const outstandingInterest = totalAccruedInterest - interestPaid; // Interest accrued but not yet paid
  const dueAmount = calculateDueAmount();
  const totalAmount = parseFloat(loan.amount) + totalAccruedInterest;
  const minimalBasePayment = calculateMinimalBasePayment();
  const nextPaymentDate = getNextPaymentDate();
  const billingCycles = calculateBillingCycles();
  const interestBreakdown = getInterestBreakdown();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate(-1)}
        >
          {t.backToLoans}
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined"
            color="primary"
            startIcon={<PictureAsPdf />}
            onClick={generatePDF}
          >
            {t.downloadPdf}
          </Button>
          <Button 
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteLoan}
          >
            {t.deleteLoan}
          </Button>
        </Box>
      </Box>
      
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
                    ${outstandingInterest.toFixed(2)}
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
                  <Typography color="text.secondary">{t.capitalPaid}:</Typography>
                  <Typography color="success.main" fontWeight="bold">
                    ${(parseFloat(loan.amount) - (loan.balanceAmount ? parseFloat(loan.balanceAmount) : parseFloat(loan.amount))).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">{t.interestPaid}:</Typography>
                  <Typography color="info.main" fontWeight="bold">
                    ${loan.balanceInterestAmount ? parseFloat(loan.balanceInterestAmount).toFixed(2) : '0.00'}
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
            <TextField
              select
              label={t.paymentType}
              value={newPayment.paymentType}
              onChange={(e) => setNewPayment({ ...newPayment, paymentType: e.target.value })}
              required
              fullWidth
            >
              <MenuItem value="capital">{t.capitalPayment}</MenuItem>
              <MenuItem value="interest">{t.interestPayment}</MenuItem>
            </TextField>
            <Button type="submit" variant="contained" sx={{ minWidth: 120 }}>
              {t.addPayment}
            </Button>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 2 }}>
          <Typography variant="h6">{t.paymentHistory}</Typography>
          <TextField
            select
            label={t.filterByType}
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">{t.all}</MenuItem>
            <MenuItem value="capital">{t.capitalPayment}</MenuItem>
            <MenuItem value="interest">{t.interestPayment}</MenuItem>
          </TextField>
        </Box>
        {payments.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                  <TableCell>{t.paymentType}</TableCell>
                  <TableCell>{t.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments
                  .filter(payment => paymentTypeFilter === 'all' || payment.paymentType === paymentTypeFilter)
                  .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                  .map((payment) => (
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
                          <TextField
                            select
                            value={editingPayment.paymentType}
                            onChange={(e) => setEditingPayment({ ...editingPayment, paymentType: e.target.value })}
                            size="small"
                            fullWidth
                          >
                            <MenuItem value="capital">{t.capitalPayment}</MenuItem>
                            <MenuItem value="interest">{t.interestPayment}</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleUpdatePayment(payment.paymentId, {
                              amount: editingPayment.amount,
                              paymentType: editingPayment.paymentType,
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
                        <TableCell>{payment.paymentType === 'interest' ? t.interestPayment : t.capitalPayment}</TableCell>
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

      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>{t.interestBreakdown || 'Interest Breakdown'}</Typography>
        {interestBreakdown.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.cycle || 'Cycle'}</TableCell>
                  <TableCell>{t.cycleDates || 'Cycle Dates'}</TableCell>
                  <TableCell>{t.amount}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {interestBreakdown.map((item) => (
                  <TableRow key={item.cycle} hover>
                    <TableCell>{item.cycle}</TableCell>
                    <TableCell>
                      {formatDateDDMMYYYY(item.startDate)} - {formatDateDDMMYYYY(item.endDate)}
                    </TableCell>
                    <TableCell>${item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                    {t.total || 'Total'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    ${totalAccruedInterest.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
            {t.noInterestAccrued || 'No interest has accrued yet'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default LoanDetails;
