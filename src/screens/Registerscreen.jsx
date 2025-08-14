import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Card, CardContent, CircularProgress,
  InputAdornment, IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OTPFlow from 'raj-otp';

// const SECRET_KEY = "9D941AF69FAA5E041172D29A8B459BB4";
// const OTP_API = 'http://192.168.160.25:3002/api/check-otp-availability';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [showOtpFlow, setShowOtpFlow] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name || !identifier || !password) {
      alert('Please fill all fields');
      return;
    }

    if (!isOtpVerified) {
      alert('Please verify your OTP first');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name, identifier }));
      alert('Registered successfully');
      navigate('/');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -200,
          right: -200,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      />

      <Card
        className="slide-in"
        sx={{
          width: { xs: '100%', sm: 420 },
          maxWidth: 420,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton
              onClick={() => navigate('/')}
              sx={{
                mr: 1,
                color: '#40a7e3',
                '&:hover': {
                  backgroundColor: 'rgba(64, 167, 227, 0.1)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600, 
                color: '#2c3e50',
                letterSpacing: '-0.5px'
              }}
            >
              Create Account
            </Typography>
          </Box>

          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 2,
                boxShadow: '0 8px 20px rgba(64, 167, 227, 0.3)',
              }}
            >
              <PersonAdd sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#7f8c8d',
                fontSize: '16px'
              }}
            >
              Join the conversation
            </Typography>
          </Box>

          {/* Form */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              variant="outlined"
              className="telegram-input"
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#f8f9fa',
                  '& fieldset': {
                    borderColor: '#e9ecef',
                    borderWidth: 1,
                  },
                  '&:hover fieldset': {
                    borderColor: '#40a7e3',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#6c757d',
                },
              }}
            />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
  <TextField
    fullWidth
    label="Phone or Email"
    value={identifier}
    onChange={e => setIdentifier(e.target.value)}
    variant="outlined"
  />
  <Button
    variant="contained"
    onClick={() => setShowOtpFlow(true)}
    disabled={!identifier}
    sx={{ height: 56 }}
  >
    Verify
  </Button>
</Box>

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              variant="outlined"
              className="telegram-input"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#6c757d' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#f8f9fa',
                  '& fieldset': {
                    borderColor: '#e9ecef',
                    borderWidth: 1,
                  },
                  '&:hover fieldset': {
                    borderColor: '#40a7e3',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#6c757d',
                },
              }}
            />

            {/* OTP Verification */}
            {/* {identifier && !isOtpVerified && (
              <Box sx={{ 
                mt: 2, 
                mb: 3,
                p: 3,
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                border: '1px solid #e9ecef'
              }}>
                <Typography variant="body2" sx={{ mb: 2, color: '#6c757d' }}>
                  Please verify your phone number or email:
                </Typography>
                <OTPFlow
                  secretKey={SECRET_KEY}
                  apiEndpoint={OTP_API}
                  phoneNumber={identifier}
                  initialTheme="light"
                  onVerified={() => {
                    alert('OTP Verified Successfully!');
                    setIsOtpVerified(true);
                  }}
                  onFailed={() => {
                    alert('OTP Verification Failed');
                    setIsOtpVerified(false);
                  }}
                />
              </Box>
            )} */}
            {showOtpFlow && !isOtpVerified && (
  <OTPFlow
    secretKey="9D941AF69FAA5E041172D29A8B459BB4"
    apiEndpoint="http://192.168.137.1:3002/api/check-otp-availability"
    phoneNumber={identifier}
    initialTheme="light"
    onComplete={(data) => {
      if (data.stage === 'verified') setIsOtpVerified(true);
      else if (data.stage === 'error') setIsOtpVerified(false);
    }}
  />
)}

            <Button
              variant="contained"
              fullWidth
              onClick={handleRegister}
              disabled={loading || !isOtpVerified}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAdd />}
              sx={{
                height: 56,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
                boxShadow: '0 4px 15px rgba(64, 167, 227, 0.4)',
                fontSize: '16px',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0088cc, #006bb3)',
                  boxShadow: '0 6px 20px rgba(64, 167, 227, 0.5)',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  background: '#bdc3c7',
                  boxShadow: 'none',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterScreen;