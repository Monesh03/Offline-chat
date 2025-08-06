import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Typography, Button, Snackbar, Paper, Avatar,
  IconButton, Divider, Badge, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, InputAdornment, Tabs, Tab
} from '@mui/material';
import { 
  Add, Search, Group, Person, Delete, PersonAdd, 
  Circle, Settings, Menu as MenuIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const BASE_URL = 'http://172.20.10.9:8000';
let socket;

const UserListScreen = () => {
  const [contacts, setContacts] = useState([]);
  const [unknownSenders, setUnknownSenders] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [filteredUnknownSenders, setFilteredUnknownSenders] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Groups, 1: Contacts, 2: Unknown Contacts

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const identifier = parsed?.identifier;
        if (identifier) {
          setCurrentUser(identifier);
          fetchContacts(identifier);
          fetchUnknownSenders(identifier);
          fetchGroups(identifier);

          if (!socket) {
            socket = io(BASE_URL, { transports: ['websocket'] });
            socket.emit('registerUser', identifier);

            socket.on('onlineUsers', (onlineList) => {
              setOnlineUsers(onlineList);
            });

            socket.on('newMessage', () => {
              fetchUnknownSenders(identifier);
            });
          }
        }
      } catch (err) {
        console.error('Invalid user object in localStorage', err);
      }
    }
  }, []);

  const fetchContacts = async (user) => {
    try {
      const res = await fetch(`${BASE_URL}/contacts/${user}`);
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async (user) => {
    try {
      const res = await fetch(`${BASE_URL}/groups/${user}`);
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    }
  };

  const fetchUnknownSenders = async (user) => {
    try {
      const res = await fetch(`${BASE_URL}/messages`);
      const data = await res.json();

      const senders = new Set();
      data.forEach(conv => {
        if (conv.receiver === user || conv.sender === user) {
          conv.conversation.forEach(msg => {
            if (msg.from !== user) {
              senders.add(msg.from);
            }
          });
        }
      });

      const contactRes = await fetch(`${BASE_URL}/contacts/${user}`);
      const contactList = await contactRes.json();
      const knownContacts = new Set(contactList.map(c => c.contact));
      const unknown = Array.from(senders).filter(sender => !knownContacts.has(sender));
      setUnknownSenders(unknown);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddContact = async (customContact = null, customName = null, e = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const contactToAdd = customContact || emailInput.trim();
    const nameToAdd = customName || contactName.trim();

    if (!contactToAdd || !nameToAdd) {
      setSnackbarMessage('Both name and contact are required.');
      setSnackbarVisible(true);
      return;
    }

    const alreadyExists = contacts.some(c => c.contact === contactToAdd);
    if (alreadyExists) {
      setSnackbarMessage('Contact already exists.');
      setSnackbarVisible(true);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/add-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: currentUser, contact: contactToAdd, name: nameToAdd })
      });

      const data = await res.json();
      if (data.success || data.message === 'Already added') {
        setSnackbarMessage('Contact added!');
        setSnackbarVisible(true);
        setEmailInput('');
        setContactName('');
        setAddContactOpen(false);
        fetchContacts(currentUser);
        fetchUnknownSenders(currentUser);
      } else {
        setSnackbarMessage(data.error || 'Something went wrong');
        setSnackbarVisible(true);
      }
    } catch (err) {
      console.error(err);
      setSnackbarMessage('Network error while adding contact');
      setSnackbarVisible(true);
    }
  };

  const handleAddFromUnknownUser = (contact) => {
    setEmailInput(contact);
    setContactName('');
    setAddContactOpen(true);
  };

  useEffect(() => {
    setFilteredContacts(contacts);
    setFilteredGroups(groups);
    setFilteredUnknownSenders(unknownSenders);
  }, [contacts, groups, unknownSenders]);

  const handleSearch = (text) => {
    setSearchText(text);
    
    // Filter based on active tab
    if (activeTab === 0) {
      // Filter groups
      const filtered = groups.filter(group =>
        group.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredGroups(filtered);
    } else if (activeTab === 1) {
      // Filter contacts
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else if (activeTab === 2) {
      // Filter unknown senders
      const filtered = unknownSenders.filter(sender =>
        sender.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredUnknownSenders(filtered);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setSearchText(''); // Clear search when switching tabs
    // Reset all filters
    setFilteredContacts(contacts);
    setFilteredGroups(groups);
    setFilteredUnknownSenders(unknownSenders);
  };

  const handleDeleteUnknownSender = async (sender) => {
    try {
      await fetch(`${BASE_URL}/delete-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1: currentUser, user2: sender })
      });
      setSnackbarMessage('Conversation deleted');
      setSnackbarVisible(true);
      fetchUnknownSenders(currentUser);
    } catch {
      setSnackbarMessage('Failed to delete conversation');
      setSnackbarVisible(true);
    }
  };

  const handleDeleteContact = async (contactToRemove) => {
    try {
      await fetch(`${BASE_URL}/delete-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: currentUser, contact: contactToRemove })
      });
      fetchContacts(currentUser);
      fetchUnknownSenders(currentUser);
    } catch (err) {
      console.error(err);
    }
  };

  const navigateToChat = (userObj) => {
    navigate('/privatechat', {
      state: { to: userObj.contact || userObj, name: userObj.name || null },
    });
  };

  const navigateToGroup = (group) => {
    navigate('/groupchat', { state: { group } });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setSnackbarMessage('Enter group name');
      setSnackbarVisible(true);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/create-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, admin: currentUser })
      });
      const data = await res.json();
      if (data.success) {
        setSnackbarMessage('Group created!');
        setNewGroupName('');
        setCreateGroupOpen(false);
        fetchGroups(currentUser);
      } else {
        setSnackbarMessage(data.message || 'Failed to create group');
      }
      setSnackbarVisible(true);
    } catch (err) {
      setSnackbarMessage('Error creating group');
      setSnackbarVisible(true);
    }
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  };

  return (
    <Box
      sx={{
        height: '100vh',
        background: '#17212b',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: '#242f3d',
          borderBottom: '1px solid #0f1419',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
        
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 500 }}>
            Messager
          </Typography>
        </Box>
       
      </Box>

      {/* Search */}
      <Box sx={{ p: 2, background: '#242f3d', borderBottom: '1px solid #0f1419' }}>
        <TextField
          placeholder={`Search ${activeTab === 0 ? 'groups' : activeTab === 1 ? 'contacts' : 'unknown contacts'}...`}
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#8596a8' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#17212b',
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
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ background: '#242f3d', borderBottom: '1px solid #0f1419' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#40a7e3',
              height: 3,
            },
            '& .MuiTab-root': {
              color: '#8596a8',
              fontWeight: 500,
              fontSize: '14px',
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': {
                color: '#40a7e3',
              },
              '&:hover': {
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            },
          }}
        >
          <Tab 
            label={`Groups (${groups.length})`} 
            icon={<Group sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab 
            label={`Contacts (${contacts.length})`} 
            icon={<Person sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
          <Tab 
            label={`Unknown (${unknownSenders.length})`} 
            icon={<PersonAdd sx={{ fontSize: 18 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Groups Tab Content */}
        {activeTab === 0 && (
          <>
            {filteredGroups.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Group sx={{ fontSize: 48, color: '#8596a8', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#8596a8', mb: 1 }}>
                  {searchText ? 'No groups found' : 'No groups yet'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8596a8' }}>
                  {searchText ? 'Try a different search term' : 'Create your first group to get started'}
                </Typography>
              </Box>
            ) : (
              filteredGroups.map((group) => (
                <Box
                  key={group.id}
                  onClick={() => navigateToGroup(group)}
                  className="hover-bg"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 50,
                      height: 50,
                      mr: 2,
                      background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
                      fontSize: '18px',
                      fontWeight: 600,
                    }}
                  >
                    <Group />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#ffffff',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#8596a8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Admin: {group.admin}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </>
        )}

        {/* Contacts Tab Content */}
        {activeTab === 1 && (
          <>
            {filteredContacts.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Person sx={{ fontSize: 48, color: '#8596a8', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#8596a8', mb: 1 }}>
                  {searchText ? 'No contacts found' : 'No contacts yet'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8596a8' }}>
                  {searchText ? 'Try a different search term' : 'Add your first contact to start chatting'}
                </Typography>
              </Box>
            ) : (
              filteredContacts.map((item) => (
                <Box
                  key={item.contact}
                  onClick={() => navigateToChat(item)}
                  className="hover-bg"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    badgeContent={
                      onlineUsers.includes(item.contact) ? (
                        <Circle sx={{ color: '#4caf50', fontSize: 12 }} />
                      ) : null
                    }
                  >
                    <Avatar
                      sx={{
                        width: 50,
                        height: 50,
                        mr: 2,
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        fontSize: '18px',
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(item.name)}
                    </Avatar>
                  </Badge>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#ffffff',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name || item.contact}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: onlineUsers.includes(item.contact) ? '#4caf50' : '#8596a8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {onlineUsers.includes(item.contact) ? 'online' : 'last seen recently'}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteContact(item.contact);
                    }}
                    sx={{ color: '#8596a8', opacity: 0.7 }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              ))
            )}
          </>
        )}

        {/* Unknown Contacts Tab Content */}
        {activeTab === 2 && (
          <>
            {filteredUnknownSenders.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <PersonAdd sx={{ fontSize: 48, color: '#8596a8', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#8596a8', mb: 1 }}>
                  {searchText ? 'No unknown contacts found' : 'No unknown contacts'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#8596a8' }}>
                  {searchText ? 'Try a different search term' : 'Unknown contacts will appear here when they message you'}
                </Typography>
              </Box>
            ) : (
              filteredUnknownSenders.map((item) => (
                <Box
                  key={item}
                  onClick={() => navigateToChat(item)}
                  className="hover-bg"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Avatar
                    sx={{
                      width: 50,
                      height: 50,
                      mr: 2,
                      background: '#8596a8',
                      fontSize: '18px',
                      fontWeight: 600,
                    }}
                  >
                    {getInitials(item)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#ffffff',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#8596a8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Unknown contact
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFromUnknownUser(item);
                      }}
                      sx={{ color: '#4caf50', opacity: 0.8 }}
                    >
                      <PersonAdd fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUnknownSender(item);
                      }}
                      sx={{ color: '#f44336', opacity: 0.8 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))
            )}
          </>
        )}
      </Box>

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', top: 10, right: 20, display: 'flex', flexDirection: 'row', gap: 1 }}>
        {activeTab === 0 && (
          <Fab
            size="medium"
            onClick={() => setCreateGroupOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2, #667eea)',
              },
            }}
          >
            <Group />
          </Fab>
        )}
        <Fab
          size="medium"
          onClick={() => setAddContactOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #0088cc, #40a7e3)',
            },
          }}
        >
          <Add />
        </Fab>
      </Box>

      {/* Add Contact Dialog */}
      <Dialog 
        open={addContactOpen} 
        onClose={() => setAddContactOpen(false)}
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
          Add New Contact
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#17212b',
                color: '#ffffff',
                '& fieldset': {
                  borderColor: '#8596a8',
                },
                '&:hover fieldset': {
                  borderColor: '#40a7e3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#40a7e3',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#8596a8',
              },
            }}
          />
          <TextField
            margin="dense"
            label="Email or Phone"
            fullWidth
            variant="outlined"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#17212b',
                color: '#ffffff',
                '& fieldset': {
                  borderColor: '#8596a8',
                },
                '&:hover fieldset': {
                  borderColor: '#40a7e3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#40a7e3',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#8596a8',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setAddContactOpen(false)}
            sx={{ color: '#8596a8' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => handleAddContact()}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #40a7e3, #0088cc)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0088cc, #40a7e3)',
              },
            }}
          >
            Add Contact
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog 
        open={createGroupOpen} 
        onClose={() => setCreateGroupOpen(false)}
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
          Create New Group
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#17212b',
                color: '#ffffff',
                '& fieldset': {
                  borderColor: '#8596a8',
                },
                '&:hover fieldset': {
                  borderColor: '#40a7e3',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#40a7e3',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#8596a8',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setCreateGroupOpen(false)}
            sx={{ color: '#8596a8' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateGroup}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2, #667eea)',
              },
            }}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarVisible}
        onClose={() => setSnackbarVisible(false)}
        autoHideDuration={3000}
        message={snackbarMessage}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: '#242f3d',
            color: '#ffffff',
          },
        }}
      />
    </Box>
  );
};

export default UserListScreen;