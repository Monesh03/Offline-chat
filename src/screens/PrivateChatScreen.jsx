import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, Typography, IconButton, Menu, MenuItem, TextField, Dialog,
  DialogTitle, DialogContent, DialogContentText, Avatar, Badge,
  InputAdornment, Fab
} from '@mui/material';
import { 
  MoreVert, AttachFile, Send, Close, ArrowBack, 
  Circle, Info, Block, Delete, EmojiEmotions 
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';

const BASE_URL = 'http://172.20.10.9:8000';
const socket = io(BASE_URL);
const SECRET_KEY = 'your_secret_key_123';

const PrivateChatScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const to = location.state?.to || 'Unknown';
  const passedName = location.state?.name || null;

  const [contactName, setContactName] = useState(passedName || to);
  const [currentUser, setCurrentUser] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const scrollRef = useRef();

  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  useEffect(() => {
    const overlay = document.createElement('div');
    overlay.id = 'screenshot-blocker';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'black';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = 9999;
    overlay.style.fontSize = '20px';
    overlay.style.fontWeight = 'bold';
    overlay.style.flexDirection = 'column';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div>📸 Screenshot Blocked</div>
      <div style="font-size: 14px; margin-top: 8px;">For your privacy, screenshots are not allowed.</div>
    `;

    document.body.appendChild(overlay);

    const disableRightClick = (e) => e.preventDefault();
    const disableClipboard = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        alert('Clipboard operations are disabled!');
      }
    };
    const detectPrintScreen = (e) => {
      if (e.key === 'PrintScreen') {
        overlay.style.display = 'flex';
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 3000);
      }
    };

    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableClipboard);
    document.addEventListener('keyup', detectPrintScreen);

    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableClipboard);
      document.removeEventListener('keyup', detectPrintScreen);
      document.body.removeChild(overlay);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const identifier = parsed?.identifier;
        if (identifier) {
          setCurrentUser(identifier);
          socket.emit('registerUser', identifier);
          if (to) {
            const fetchMessages = async (fromUser, toUser) => {
              try {
                const res = await fetch(`${BASE_URL}/messages`);
                const data = await res.json();

                const filtered = (Array.isArray(data) ? data : []).filter(
                  conv =>
                    (conv.sender === fromUser && conv.receiver === toUser) ||
                    (conv.sender === toUser && conv.receiver === fromUser)
                );

                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

                const allMessages = [];
                filtered.forEach(conv => {
                  (conv.conversation || []).forEach(msg => {
                    const msgDate = new Date(msg.timestamp);
                    if (msgDate >= fifteenDaysAgo) {
                      const decrypted = msg.text ? decryptMessage(msg.text) : '';
                      allMessages.push({ ...msg, to: toUser, text: decrypted });
                    }
                  });
                });

                setMessages(allMessages);
                scrollToBottom();
              } catch (err) {
                console.error(err);
              }
            };

            const fetchContactName = async (owner, contact) => {
              try {
                const res = await fetch(`${BASE_URL}/contacts/${owner}`);
                const contacts = await res.json();
                const match = contacts.find(c => c.contact === contact);
                if (match?.name) setContactName(match.name);
              } catch (err) {
                console.error(err);
              }
            };

            fetchMessages(identifier, to);
            fetchContactName(identifier, to);
          }
        }
      } catch (err) {
        console.error('Invalid user object in localStorage', err);
      }
    }
  }, [to, decryptMessage, scrollToBottom]);

  useEffect(() => {
    const receive = (msg) => {
      const isRelevant =
        (msg.from === to && msg.to === currentUser) ||
        (msg.from === currentUser && msg.to === to);

      if (isRelevant) {
        const decryptedText = msg.text ? decryptMessage(msg.text) : '';
        setMessages((prev) => [...prev, { ...msg, text: decryptedText }]);
        scrollToBottom();
      }
    };

    socket.on('receivePrivateMessage', receive);
    socket.on('onlineUsers', (users) => {
      setIsOnline(users.includes(to));
    });

    return () => {
      socket.off('receivePrivateMessage', receive);
      socket.off('onlineUsers');
    };
  }, [currentUser, to]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const encryptMessage = (msg) => CryptoJS.AES.encrypt(msg, SECRET_KEY).toString();

  const decryptMessage = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8) || '';
    } catch {
      return '';
    }
  };

  const pickAttachment = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() && !attachment) return;

    let uploadedUrl = null;
    if (attachment) {
      try {
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await fetch(`${BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        uploadedUrl = data.url;
      } catch (err) {
        return;
      }
    }

    const encryptedText = encryptMessage(message.trim());

    const msg = {
      from: currentUser,
      to,
      text: encryptedText,
      attachment_url: uploadedUrl,
      timestamp: new Date().toISOString(),
    };

    socket.emit('privateMessage', msg);
    setMessage('');
    setAttachment(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const groupMessagesByDate = (msgs) => {
    const grouped = {};
    msgs.forEach((msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0e1621' }}>
      {/* Header */}
      <Box
        sx={{
          background: '#17212b',
          borderBottom: '1px solid #0f1419',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={() => navigate('/userlist')}
            sx={{ color: '#8596a8', mr: 1 }}
          >
            <ArrowBack />
          </IconButton>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              isOnline ? (
                <Circle sx={{ color: '#4caf50', fontSize: 12 }} />
              ) : null
            }
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                mr: 2,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {getInitials(contactName)}
            </Avatar>
          </Badge>
          <Box>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 500, fontSize: '18px' }}>
              {contactName}
            </Typography>
            <Typography variant="body2" sx={{ color: isOnline ? '#4caf50' : '#8596a8', fontSize: '13px' }}>
              {isOnline ? 'online' : 'last seen recently'}
            </Typography>
          </Box>
        </Box>
        <div>
          <IconButton onClick={handleMenuOpen} sx={{ color: '#8596a8' }}>
            <MoreVert />
          </IconButton>
          <Menu 
            anchorEl={anchorEl} 
            open={open} 
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                background: '#242f3d',
                color: '#ffffff',
                borderRadius: 2,
                minWidth: 180,
              }
            }}
          >
            <MenuItem 
              onClick={() => {
                setViewDialogOpen(true);
                handleMenuClose();
              }}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <Info sx={{ mr: 1, fontSize: 20 }} />
              Contact Info
            </MenuItem>
            <MenuItem 
              onClick={() => {
                alert('User blocked');
                handleMenuClose();
              }}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <Block sx={{ mr: 1, fontSize: 20 }} />
              Block User
            </MenuItem>
            <MenuItem 
              onClick={() => {
                alert('Chat cleared');
                handleMenuClose();
              }}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <Delete sx={{ mr: 1, fontSize: 20 }} />
              Clear Chat
            </MenuItem>
          </Menu>
        </div>
      </Box>

      {/* View Contact Modal */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        PaperProps={{
          sx: {
            background: '#242f3d',
            color: '#ffffff',
            borderRadius: 3,
            minWidth: 350,
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              fontSize: '32px',
              fontWeight: 600,
            }}
          >
            {getInitials(contactName)}
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {contactName}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#8596a8', textAlign: 'center' }}>
            <strong>Contact:</strong> {to}<br />
            <strong>Status:</strong> {isOnline ? 'Online' : 'Last seen recently'}
          </DialogContentText>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <Box 
        sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 1,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
          <React.Fragment key={date}>
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <Typography 
                sx={{ 
                  display: 'inline-block',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#8596a8',
                  fontSize: '12px',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)',
                }}
              >
                {date}
              </Typography>
            </Box>
            {msgs.map((msg, i) => {
              const isMe = msg.from === currentUser;
              const time = new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <Box
                  key={i}
                  className="message-bubble"
                  sx={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    mb: 1,
                    px: 1,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      minWidth: '80px',
                      background: isMe 
                        ? 'linear-gradient(135deg, #40a7e3, #0088cc)' 
                        : '#242f3d',
                      borderRadius: isMe 
                        ? '18px 18px 4px 18px' 
                        : '18px 18px 18px 4px',
                      p: 1.5,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      position: 'relative',
                    }}
                  >
                    {msg.text && (
                      <Typography 
                        sx={{ 
                          color: '#ffffff',
                          fontSize: '15px',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                          mb: msg.attachment_url ? 1 : 0.5,
                        }}
                      >
                        {msg.text}
                      </Typography>
                    )}
                    {msg.attachment_url && (
                      <Box sx={{ mb: 0.5 }}>
                        {msg.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={msg.attachment_url}
                            alt="attachment"
                            style={{ 
                              maxWidth: '100%', 
                              borderRadius: 12, 
                              display: 'block',
                              cursor: 'pointer',
                            }}
                            onClick={() => window.open(msg.attachment_url, '_blank')}
                          />
                        ) : (
                          <Box
                            component="a"
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#ffffff',
                              textDecoration: 'none',
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: 2,
                              p: 1,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              },
                            }}
                          >
                            <AttachFile sx={{ mr: 1, fontSize: 18 }} />
                            <Typography variant="body2">View File</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    <Typography 
                      sx={{ 
                        fontSize: '11px', 
                        color: isMe ? 'rgba(255, 255, 255, 0.7)' : '#8596a8',
                        textAlign: 'right',
                        mt: 0.5,
                      }}
                    >
                      {time}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </React.Fragment>
        ))}
        <div ref={scrollRef} />
      </Box>

      {/* Attachment Preview */}
      {attachment && (
        <Box 
          sx={{ 
            background: '#17212b', 
            p: 2, 
            borderTop: '1px solid #0f1419',
            position: 'relative',
          }}
        >
          <IconButton
            sx={{ 
              position: 'absolute', 
              top: 8, 
              right: 8, 
              color: '#8596a8',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
            onClick={() => setAttachment(null)}
          >
            <Close />
          </IconButton>
          {attachment.type?.startsWith('image') ? (
            <img
              src={URL.createObjectURL(attachment)}
              alt="preview"
              style={{ 
                maxWidth: 200, 
                maxHeight: 200, 
                borderRadius: 12,
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#ffffff' }}>
              <AttachFile sx={{ mr: 1 }} />
              <Typography>{attachment.name}</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Input Field */}
      <Box
        sx={{
          background: '#17212b',
          borderTop: '1px solid #0f1419',
          p: 2,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
        }}
      >
        <IconButton 
          component="label"
          sx={{ 
            color: '#8596a8',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          <AttachFile />
          <input type="file" hidden onChange={pickAttachment} />
        </IconButton>
        
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Message"
          multiline
          maxRows={4}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton sx={{ color: '#8596a8' }}>
                  <EmojiEmotions />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#242f3d',
              borderRadius: 3,
              color: '#ffffff',
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: '#40a7e3',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#40a7e3',
              },
            },
            '& .MuiInputBase-input::placeholder': {
              color: '#8596a8',
              opacity: 1,
            },
          }}
        />
        
        <Fab
          size="small"
          onClick={sendMessage}
          disabled={!message.trim() && !attachment}
          sx={{
            background: message.trim() || attachment 
              ? 'linear-gradient(135deg, #40a7e3, #0088cc)' 
              : '#8596a8',
            color: 'white',
            '&:hover': {
              background: message.trim() || attachment 
                ? 'linear-gradient(135deg, #0088cc, #40a7e3)' 
                : '#8596a8',
            },
            '&:disabled': {
              background: '#8596a8',
              color: 'rgba(255, 255, 255, 0.5)',
            },
          }}
        >
          <Send />
        </Fab>
      </Box>
    </Box>
  );
};

export default PrivateChatScreen;