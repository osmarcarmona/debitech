import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, FormControl, InputLabel, OutlinedInput, Chip, Link, CircularProgress, TableSortLabel, Box } from '@mui/material';
import { loanService, borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const LoanList = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loans, setLoans] = useState([]);
  const [borrowers, setBorrowers] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(['approved', 'active']);
  const [sortField, setSortField] = useState('approvedAt');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const loansResponse = await loanService.getLoans();
      const borrowersResponse = await borrowerService.getBorrowers();
      
      // Filter loans by selected statuses
      const filteredLoans = statusFilter.length === 0 
        ? loansResponse.data 
        : loansResponse.data.filter(loan => statusFilter.includes(loan.status));
      
      setLoans(filteredLoans);
      
      // Create a map of borrowerId to borrower name
      const borrowerMap = {};
      borrowersResponse.data.forEach(b => {
        borrowerMap[b.borrowerId] = b.name;
      });
      setBorrowers(borrowerMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (loanId, newStatus) => {
    try {
      await loanService.updateLoanStatus(loanId, newStatus);
      fetchData();
    } catch (error) {
      console.error('Error updating loan status:', error);
    }
  };

  const getBalanceAmount = (loan) => {
    // Use balanceAmount from the loan data, fallback to principal if not available
    return loan.balanceAmount ? parseFloat(loan.balanceAmount) : parseFloat(loan.amount);
  };

  const getNextPaymentDate = (loan) => {
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedLoans = () => {
    const sorted = [...loans].sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'borrower':
          aValue = borrowers[a.borrowerId] || a.borrowerId;
          bValue = borrowers[b.borrowerId] || b.borrowerId;
          break;
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'interestRate':
          aValue = parseFloat(a.interestRate);
          bValue = parseFloat(b.interestRate);
          break;
        case 'pendingToPay':
          aValue = getBalanceAmount(a);
          bValue = getBalanceAmount(b);
          break;
        case 'approvedAt':
          aValue = a.approvedAt ? new Date(a.approvedAt).getTime() : 0;
          bValue = b.approvedAt ? new Date(b.approvedAt).getTime() : 0;
          break;
        case 'nextPaymentDue':
          aValue = getNextPaymentDate(a) ? getNextPaymentDate(a).getTime() : 0;
          bValue = getNextPaymentDate(b) ? getNextPaymentDate(b).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>{t.loans}</Typography>
      <FormControl sx={{ mb: 3, minWidth: 200 }}>
        <InputLabel>{t.filterByStatus}</InputLabel>
        <Select
          multiple
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          input={<OutlinedInput label={t.filterByStatus} />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={t[value]} size="small" />
              ))}
            </Box>
          )}
        >
          <MenuItem value="pending">{t.pending}</MenuItem>
          <MenuItem value="approved">{t.approved}</MenuItem>
          <MenuItem value="active">{t.active}</MenuItem>
          <MenuItem value="paid">{t.paid}</MenuItem>
          <MenuItem value="defaulted">{t.defaulted}</MenuItem>
        </Select>
      </FormControl>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'borrower'}
                  direction={sortField === 'borrower' ? sortDirection : 'asc'}
                  onClick={() => handleSort('borrower')}
                >
                  {t.borrower}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'amount'}
                  direction={sortField === 'amount' ? sortDirection : 'asc'}
                  onClick={() => handleSort('amount')}
                >
                  {t.amount}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'interestRate'}
                  direction={sortField === 'interestRate' ? sortDirection : 'asc'}
                  onClick={() => handleSort('interestRate')}
                >
                  {t.interestRate}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'pendingToPay'}
                  direction={sortField === 'pendingToPay' ? sortDirection : 'asc'}
                  onClick={() => handleSort('pendingToPay')}
                >
                  {t.pendingToPay}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'approvedAt'}
                  direction={sortField === 'approvedAt' ? sortDirection : 'asc'}
                  onClick={() => handleSort('approvedAt')}
                >
                  {t.approvedDate}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'nextPaymentDue'}
                  direction={sortField === 'nextPaymentDue' ? sortDirection : 'asc'}
                  onClick={() => handleSort('nextPaymentDue')}
                >
                  {t.nextPaymentDue}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t.actions}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedLoans().map((loan) => (
              <TableRow key={loan.loanId} hover>
                <TableCell>
                  <Link
                    href={`/loans/${loan.loanId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    title={loan.loanId}
                  >
                    {loan.loanId.substring(0, 4)}
                  </Link>
                </TableCell>
                <TableCell>{borrowers[loan.borrowerId] || loan.borrowerId}</TableCell>
                <TableCell>${parseFloat(loan.amount).toFixed(2)}</TableCell>
                <TableCell>{loan.interestRate}%</TableCell>
                <TableCell sx={{ 
                  color: getBalanceAmount(loan) > 0 ? 'error.main' : 'success.main',
                  fontWeight: 'bold'
                }}>
                  ${getBalanceAmount(loan).toFixed(2)}
                </TableCell>
                <TableCell>{loan.approvedAt ? new Date(loan.approvedAt).toLocaleDateString() : '-'}</TableCell>
                <TableCell sx={{ color: 'error.light' }}>
                  {getNextPaymentDate(loan) 
                    ? getNextPaymentDate(loan).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '-'
                  }
                </TableCell>
                <TableCell>
                  <Select
                    value={loan.status}
                    onChange={(e) => updateStatus(loan.loanId, e.target.value)}
                    size="small"
                  >
                    <MenuItem value="pending">{t.pending}</MenuItem>
                    <MenuItem value="approved">{t.approved}</MenuItem>
                    <MenuItem value="active">{t.active}</MenuItem>
                    <MenuItem value="paid">{t.paid}</MenuItem>
                    <MenuItem value="defaulted">{t.defaulted}</MenuItem>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LoanList;
