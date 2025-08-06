import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Login, PersonAdd } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://172.20.10.9:8000');

const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      alert('Please enter phone/email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://172.20.10.9:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, identifier }));
      socket.emit('registerUser', identifier);
      navigate('/userlist');
    } catch (error) {
      alert('Login Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
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
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
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
          {/* Logo/Icon */}
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
              <Login sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600, 
                color: '#2c3e50',
                mb: 1,
                letterSpacing: '-0.5px'
              }}
            >
              Welcome Back
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#7f8c8d',
                fontSize: '16px'
              }}
            >
              Sign in to continue messaging
            </Typography>
          </Box>

          {/* Form */}
          <Box sx={{ mb: 3 }}>
            <TextField
              label="Phone or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyPress={handleKeyPress}
              fullWidth
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
            
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              fullWidth
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

            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Login />}
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
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          {/* Register link */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ color: '#7f8c8d', fontSize: '15px' }}>
              Don't have an account?{' '}
              <Link
                component="button"
                onClick={() => navigate('/register')}
                sx={{
                  color: '#40a7e3',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Create Account
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginScreen;