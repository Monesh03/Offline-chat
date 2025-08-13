import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, IconButton, TextField, Dialog, DialogTitle,
  DialogContent, DialogContentText, Menu, MenuItem, DialogActions,
  Button, InputLabel, Select, FormControl, Avatar, Badge,
  InputAdornment, Fab
} from '@mui/material';
import { 
  AttachFile, Send, MoreVert, Close, ArrowBack, Group,
  PersonAdd, Info, ExitToApp, EmojiEmotions, Circle
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';

const BASE_URL = 'http://192.168.160.25:8000';
const socket = io(BASE_URL);
const SECRET_KEY = 'your_secret_key_123';

const GroupChatScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const group = location.state?.group;
  const currentUser = JSON.parse(localStorage.getItem('user'))?.identifier;

  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [onlineMembers, setOnlineMembers] = useState([]);
  const scrollRef = useRef();

  const isAdmin = group && currentUser === group.admin;

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
    if (!group) return;
    socket.emit('joinGroup', group.id);
    fetchMessages();
    fetchMembers();
    fetchContacts();
  }, [group]);

  useEffect(() => {
    socket.on('receiveGroupMessage', (msg) => {
      if (parseInt(msg.groupId) === parseInt(group?.id)) {
        const decrypted = msg.text ? decryptMessage(msg.text) : '';
        setMessages(prev => {
          const exists = prev.some(m => m.timestamp === msg.timestamp && m.from === msg.from);
          if (exists) return prev;
          return [...prev, { ...msg, text: decrypted }];
        });
        scrollToBottom();
      }
    });

    socket.on('onlineUsers', (users) => {
      setOnlineMembers(users);
    });

    return () => {
      socket.off('receiveGroupMessage');
      socket.off('onlineUsers');
    };
  }, [group]);

  const getISTTimestamp = () => {
    const raw = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    }).replace(',', '');
    const [month, day, rest] = raw.split('/');
    const [year, time] = rest.split(' ');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${BASE_URL}/group-messages/${group.id}`);
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const recentMessages = data.filter(msg => {
        if (!msg.timestamp) return false;
        const msgDate = new Date(msg.timestamp);
        return !isNaN(msgDate) && msgDate >= fifteenDaysAgo;
      });

      const decryptedMsgs = recentMessages.map(msg => ({
        ...msg,
        text: msg.text ? decryptMessage(msg.text) : '',
      }));

      setMessages(decryptedMsgs);
      scrollToBottom();
    } catch (err) {
      console.error('Error in fetchMessages:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/group-info/${group.id}`);
      const data = await res.json();
      if (!Array.isArray(data.members)) return;

      const cleanMembers = data.members.filter(m => m);
      setMembers(cleanMembers);
    } catch (err) {
      console.error('Error in fetchMembers:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/contacts/${currentUser}`);
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setContacts(data);
    } catch (err) {
      console.error('Error in fetchContacts:', err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember) {
      alert('Please select a member.');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/add-group-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id, member: selectedMember })
      });

      const data = await res.json();

      if (data.success) {
        alert('Member added successfully!');
        fetchMembers();
        setAddDialogOpen(false);
        setSelectedMember('');
      } else {
        alert(data.message || 'Failed to add member');
      }
    } catch (err) {
      console.error('Add member error:', err);
      alert('Server error.');
    }
  };

  const getDisplayName = (identifier) => {
    const match = contacts.find(c => c.contact === identifier);
    return match ? match.name : identifier;
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  };

  const encryptMessage = (msg) => CryptoJS.AES.encrypt(msg, SECRET_KEY).toString();
  const decryptMessage = (cipher) => {
    try {
      return CryptoJS.AES.decrypt(cipher, SECRET_KEY).toString(CryptoJS.enc.Utf8);
    } catch {
      return '';
    }
  };

  const pickAttachment = (e) => {
    setAttachment(e.target.files[0]);
    e.target.value = '';
  };

  const sendMessage = async () => {
    if (!message && !attachment) return;

    let uploadedUrl = null;
    if (attachment) {
      const formData = new FormData();
      formData.append('file', attachment);
      const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      uploadedUrl = data.url;
    }

    const encryptedText = encryptMessage(message);
    const timestamp = getISTTimestamp();
    const msg = {
      groupId: group.id,
      from: currentUser,
      text: encryptedText,
      attachment_url: uploadedUrl,
      timestamp
    };

    socket.emit('groupMessage', msg);

    setMessages(prev => [...prev, {
      ...msg,
      text: message
    }]);

    scrollToBottom();

    try {
      await fetch(`${BASE_URL}/group-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
    } catch (err) {
      console.error('Failed to save group message:', err);
    }

    setMessage('');
    setAttachment(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const groupByDate = (msgs) => {
    const grouped = {};
    msgs.forEach(msg => {
      const date = new Date(msg.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  };

  if (!group) {
    return (
      <Box sx={{ p: 4, background: '#17212b', minHeight: '100vh' }}>
        <Typography variant="h6" color="error">Invalid group selected.</Typography>
      </Box>
    );
  }

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
          <Avatar
            sx={{
              width: 40,
              height: 40,
              mr: 2,
              background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            <Group />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 500, fontSize: '18px' }}>
              {group.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#8596a8', fontSize: '13px' }}>
              {members.length} members
            </Typography>
          </Box>
        </Box>
        <div>
          <IconButton 
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ color: '#8596a8' }}
          >
            <MoreVert />
          </IconButton>
          <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={() => setAnchorEl(null)}
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
                setAnchorEl(null);
              }}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <Info sx={{ mr: 1, fontSize: 20 }} />
              Group Info
            </MenuItem>
            {isAdmin && (
              <MenuItem 
                onClick={() => {
                  setAddDialogOpen(true);
                  setAnchorEl(null);
                }}
                sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
              >
                <PersonAdd sx={{ mr: 1, fontSize: 20 }} />
                Add Member
              </MenuItem>
            )}
            <MenuItem 
              onClick={() => {
                alert('Left group');
                setAnchorEl(null);
              }}
              sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <ExitToApp sx={{ mr: 1, fontSize: 20 }} />
              Leave Group
            </MenuItem>
          </Menu>
        </div>
      </Box>

      {/* View Members Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        PaperProps={{
          sx: {
            background: '#242f3d',
            color: '#ffffff',
            borderRadius: 3,
            minWidth: 400,
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
              fontSize: '32px',
              fontWeight: 600,
            }}
          >
            <Group />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {group.name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#8596a8' }}>
            {members.length} members
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ color: '#8596a8', mb: 2, fontWeight: 500 }}>
            ADMIN
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, p: 1 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                onlineMembers.includes(group.admin) ? (
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
                {getInitials(getDisplayName(group.admin))}
              </Avatar>
            </Badge>
            <Box>
              <Typography sx={{ fontWeight: 500 }}>
                {getDisplayName(group.admin)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#8596a8' }}>
                Group Admin
              </Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ color: '#8596a8', mb: 2, fontWeight: 500 }}>
            MEMBERS
          </Typography>
          {members.filter(m => m !== group.admin).map((member, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  onlineMembers.includes(member) ? (
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
                  {getInitials(getDisplayName(member))}
                </Avatar>
              </Badge>
              <Box>
                <Typography sx={{ fontWeight: 500 }}>
                  {getDisplayName(member)}
                </Typography>
                <Typography variant="body2" sx={{ color: onlineMembers.includes(member) ? '#4caf50' : '#8596a8' }}>
                  {onlineMembers.includes(member) ? 'online' : 'last seen recently'}
                </Typography>
              </Box>
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)}
        PaperProps={{
          sx: {
            background: '#242f3d',
            color: '#ffffff',
            borderRadius: 3,
            minWidth: 400,
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', fontWeight: 600 }}>
          Add Member
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel sx={{ color: '#8596a8' }}>Select Member</InputLabel>
            <Select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              label="Select Member"
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#8596a8',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#40a7e3',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#40a7e3',
                },
                '& .MuiSvgIcon-root': {
                  color: '#8596a8',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    background: '#242f3d',
                    color: '#ffffff',
                  }
                }
              }}
            >
              {contacts
                .filter(c => c.contact && !members.includes(c.contact))
                .map((c, i) => (
                  <MenuItem key={i} value={c.contact} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
                    {c.name} ({c.contact})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setAddDialogOpen(false)}
            sx={{ color: '#8596a8' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAddMember}
            sx={{
              background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0088cc, #40a7e3)',
              },
            }}
          >
            Add Member
          </Button>
        </DialogActions>
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
        {Object.entries(groupByDate(messages)).map(([date, msgs]) => (
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
              const sender = msg.sender || msg.from;
              const isMe = sender === currentUser;
              const time = new Date(msg.timestamp).toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
              });
              const senderName = sender === currentUser ? 'You' : getDisplayName(sender);

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
                      minWidth: '120px',
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
                    {!isMe && (
                      <Typography 
                        sx={{ 
                          fontSize: '12px', 
                          color: '#40a7e3', 
                          fontWeight: 600, 
                          mb: 0.5 
                        }}
                      >
                        {senderName}
                      </Typography>
                    )}
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
            <div ref={scrollRef} />
          </React.Fragment>
        ))}
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

export default GroupChatScreen;