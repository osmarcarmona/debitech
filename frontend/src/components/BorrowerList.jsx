import { useState, useEffect } from 'react';
import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert } from '@mui/material';
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

  if (loading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>{t.borrowers} ({borrowers.length})</Typography>
      {borrowers.length === 0 ? (
        <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
          {t.noBorrowersYet}
        </Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell>{t.status}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {borrowers.map((borrower) => (
                <TableRow key={borrower.borrowerId} hover>
                  <TableCell>{borrower.name}</TableCell>
                  <TableCell>{borrower.phone}</TableCell>
                  <TableCell>
                    <Chip label={borrower.status} color="primary" size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default BorrowerList;
