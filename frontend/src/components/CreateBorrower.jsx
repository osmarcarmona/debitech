import { useState } from 'react';
import { Paper, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { borrowerService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const CreateBorrower = ({ onSuccess }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const borrowerData = {
        name: formData.name,
        phone: formData.phone,
      };

      await borrowerService.createBorrower(borrowerData);
      setFormData({ name: '', phone: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error creating borrower:', error);
      setError(error.response?.data?.error || t.failedToCreateBorrower);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>{t.createNewBorrower}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          name="name"
          label={t.fullName}
          value={formData.name}
          onChange={handleChange}
          required
          fullWidth
        />
        <TextField
          type="tel"
          name="phone"
          label={t.phoneNumber}
          value={formData.phone}
          onChange={handleChange}
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" disabled={loading}>
          {loading ? t.creating : t.createBorrower}
        </Button>
      </Box>
    </Paper>
  );
};

export default CreateBorrower;
