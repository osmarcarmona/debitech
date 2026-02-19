import { useState, useEffect } from 'react';
import { Paper, TextField, Button, MenuItem, Typography, Box } from '@mui/material';
import { loanService, borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const CreateLoan = ({ onSuccess }) => {
  const { t } = useLanguage();
  const [borrowers, setBorrowers] = useState([]);
  const [formData, setFormData] = useState({
    borrowerId: '',
    amount: '',
    interestRate: '',
    approvedAt: new Date().toISOString().split('T')[0], // Set today's date as default
  });

  useEffect(() => {
    fetchBorrowers();
  }, []);

  const fetchBorrowers = async () => {
    try {
      const response = await borrowerService.getBorrowers();
      setBorrowers(response.data);
    } catch (error) {
      console.error('Error fetching borrowers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await loanService.createLoan(formData);
      setFormData({ 
        borrowerId: '', 
        amount: '', 
        interestRate: '', 
        approvedAt: new Date().toISOString().split('T')[0] // Reset to today's date
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating loan:', error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>{t.createNewLoan}</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          select
          label={t.selectBorrower}
          value={formData.borrowerId}
          onChange={(e) => setFormData({ ...formData, borrowerId: e.target.value })}
          required
          fullWidth
        >
          {borrowers.map((b) => (
            <MenuItem key={b.borrowerId} value={b.borrowerId}>
              {b.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="number"
          label={t.amount}
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
          fullWidth
        />
        <TextField
          type="number"
          label={`${t.interestRate} (%)`}
          value={formData.interestRate}
          onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
          inputProps={{ step: '0.01' }}
          required
          fullWidth
        />
        <TextField
          type="date"
          label={t.approvalDate}
          value={formData.approvedAt}
          onChange={(e) => setFormData({ ...formData, approvedAt: e.target.value })}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <Button type="submit" variant="contained" size="large">
          {t.createLoan}
        </Button>
      </Box>
    </Paper>
  );
};

export default CreateLoan;
