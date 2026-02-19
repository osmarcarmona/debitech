import { useState, useEffect } from 'react';
import { Paper, Typography, Grid, Card, CardContent, TextField, Button, Box, CircularProgress, Alert } from '@mui/material';
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
    return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!reports) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t.reportsTitle}</Typography>
      
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            type="date"
            label={t.startDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            label={t.endDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button variant="contained" onClick={handleApplyFilters}>
            {t.applyFilters}
          </Button>
          <Button variant="outlined" onClick={handleClearFilters}>
            {t.clearFilters}
          </Button>
        </Box>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>💰</Typography>
              <Typography variant="h6" gutterBottom>{t.totalDebt}</Typography>
              <Typography variant="h4" color="primary">{formatCurrency(reports.totalDebt)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t.activeLoansCount}: {reports.activeLoans}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>💵</Typography>
              <Typography variant="h6" gutterBottom>{t.totalInvested}</Typography>
              <Typography variant="h4" color="primary">{formatCurrency(reports.totalInvested)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t.principalAmounts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>📈</Typography>
              <Typography variant="h6" gutterBottom>{t.interestProfit}</Typography>
              <Typography variant="h4" color="success.main">{formatCurrency(reports.interestProfit)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t.earnedToDate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>📊</Typography>
              <Typography variant="h6" gutterBottom>{t.incomingPayment}</Typography>
              <Typography variant="h4" color="primary">{formatCurrency(reports.incomingPayment)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {getCurrentMonthName()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>🏆</Typography>
              <Typography variant="h6" gutterBottom>{t.topProfitableBorrowers}</Typography>
              {reports.topProfitableBorrowers && reports.topProfitableBorrowers.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  {reports.topProfitableBorrowers.map((borrower, index) => (
                    <Box 
                      key={borrower.borrowerId} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        p: 1,
                        bgcolor: 'background.default',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="h6" color="primary" sx={{ minWidth: 30 }}>
                        {index + 1}
                      </Typography>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1">{borrower.name}</Typography>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          {formatCurrency(borrower.profit)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">{t.noData}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h3" sx={{ mb: 1 }}>📋</Typography>
              <Typography variant="h6" gutterBottom>{t.summary}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t.totalLoans}:</Typography>
                  <Typography fontWeight="bold">{reports.totalLoans}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t.approvedLoans}:</Typography>
                  <Typography fontWeight="bold">{reports.approvedLoans}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t.activeLoans}:</Typography>
                  <Typography fontWeight="bold">{reports.activeLoans}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>{t.totalBorrowers}:</Typography>
                  <Typography fontWeight="bold">{reports.totalBorrowers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Reports;
