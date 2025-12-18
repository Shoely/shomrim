// ===== Shomrim App - Main JavaScript =====

// API Configuration - Use current host IP instead of localhost
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : `http://${window.location.hostname}:5000`;

console.log('API Base URL:', API_BASE_URL);

// App State
const state = {
    currentScreen: 'splash-screen',
    isLoggedIn: false,
    user: {
        name: 'User',
        email: 'user@example.com',
        callsign: 'S00',
        phone: '',
        role: 'Member',
        avatar: null
    },
    onPatrol: true,
    onDuty: false,
    currentTab: 'me',
    passcode: '',
    confirmPasscode: '',
    isConfirmingPasscode: false,
    incidents: [],
    contacts: [],
    users: [],
    suspects: [],
    vehicles: [],
    notifications: [],
    notificationCount: 3,
    selectedIncidentId: null,
    currentFilter: null,
    counts: {
        onair: 0,
        invitation: 1,
        pending: 1,
        started: 2,
        completed: 18,
        cancelled: 9
    },
    incidentTypes: [
        { id: 1, name: 'Theft' },
        { id: 2, name: 'Vandalism' },
        { id: 3, name: 'Assault' },
        { id: 4, name: 'Suspicious Activity' },
        { id: 5, name: 'Emergency' },
        { id: 6, name: 'Missing Person' },
        { id: 7, name: 'Fire' },
        { id: 8, name: 'Medical' },
        { id: 9, name: 'Other' }
    ]
};

// DOM Elements
const screens = {
    splash: document.getElementById('splash-screen'),
    login: document.getElementById('login-screen'),
    otp: document.getElementById('otp-screen'),
    passcode: document.getElementById('passcode-screen'),
    face: document.getElementById('face-screen'),
    main: document.getElementById('main-screen'),
    incidents: document.getElementById('incidents-screen'),
    createIncident: document.getElementById('create-incident-screen'),
    incidentDetail: document.getElementById('incident-detail-screen'),
    contacts: document.getElementById('contacts-screen'),
    profile: document.getElementById('profile-screen'),
    settings: document.getElementById('settings-screen'),
    schedule: document.getElementById('schedule-screen')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    loadSampleData();
    
    // Show admin menu item for admins after login
    setTimeout(() => {
        if (state.user && (state.user.role === 'Admin' || state.user.role === 'Dispatcher' || state.user.role === 'Coordinator')) {
            const adminMenuItem = document.getElementById('admin-menu-item');
            if (adminMenuItem) {
                adminMenuItem.style.display = 'flex';
            }
        }
    }, 2500);
});

function initApp() {
    // Show splash screen, then transition to login or main
    setTimeout(async () => {
        const savedUser = localStorage.getItem('shomrim_user');
        if (savedUser) {
            state.user = JSON.parse(savedUser);
            state.isLoggedIn = true;
            
            // Load incidents from database
            await loadIncidents();
            
            showScreen('main-screen');
            updateUI();
        } else {
            showScreen('login-screen');
        }
    }, 2000);
}

// Load incidents from database
async function loadIncidents() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents?user_phone=${encodeURIComponent(state.user.phone || state.user.email)}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            state.incidents = data;
            updateCountsFromIncidents();
            console.log(`✅ Loaded ${data.length} incidents from database`);
        }
    } catch (error) {
        console.error('Error loading incidents:', error);
        // Load from localStorage as fallback
        loadState();
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    state.currentScreen = screenId;
}

function setupEventListeners() {
    // Login
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('phone-number').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // OTP
    setupOtpInputs();
    document.getElementById('resend-otp').addEventListener('click', async (e) => {
        e.preventDefault();
        await resendOtp();
    });
    
    // Registration
    document.getElementById('btn-register').addEventListener('click', handleRegistration);

    // Passcode
    setupNumpad();

    // Face capture
    document.getElementById('btn-take-photo').addEventListener('click', () => {
        document.getElementById('face-file-input').click();
    });
    document.getElementById('btn-choose-gallery').addEventListener('click', () => {
        document.getElementById('face-file-input').click();
    });
    document.getElementById('face-file-input').addEventListener('change', handleFaceUpload);
    document.getElementById('btn-continue-face').addEventListener('click', handleFaceContinue);

    // Header
    document.getElementById('btn-menu').addEventListener('click', toggleDrawer);
    document.getElementById('btn-notifications').addEventListener('click', toggleNotifications);

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => handleTabChange(btn.dataset.tab));
    });

    // Status toggles
    document.getElementById('btn-patrol').addEventListener('click', () => toggleStatus('patrol'));
    document.getElementById('btn-duty').addEventListener('click', () => toggleStatus('duty'));

    // Dashboard cards
    document.querySelectorAll('.dashboard-card').forEach(card => {
        card.addEventListener('click', () => handleCardClick(card.dataset.filter));
    });

    // FAB
    document.getElementById('btn-fab').addEventListener('click', () => showScreen('create-incident-screen'));

    // Drawer
    document.getElementById('drawer-overlay').addEventListener('click', toggleDrawer);
    document.querySelectorAll('.drawer-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            handleDrawerNavigation(item.dataset.page);
        });
    });
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Back buttons
    document.getElementById('btn-back-incidents').addEventListener('click', () => showScreen('main-screen'));
    document.getElementById('btn-back-create').addEventListener('click', () => showScreen('main-screen'));
    document.getElementById('btn-back-detail').addEventListener('click', () => {
        if (state.currentFilter) {
            renderIncidentsList(state.currentFilter);
            showScreen('incidents-screen');
        } else {
            showScreen('main-screen');
        }
    });
    document.getElementById('btn-back-contacts').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-profile').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-settings').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-schedule').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-admin').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-onduty').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-onpatrol').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-dispatcher').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-supervisors').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-responders').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-suspect').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });
    document.getElementById('btn-back-vehicle').addEventListener('click', () => {
        showScreen('main-screen');
        toggleDrawer();
    });

    // Save incident
    document.getElementById('btn-save-incident').addEventListener('click', handleSaveIncident);

    // Incident action buttons - delegate to handleIncidentAction
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-assign-incident')) {
            handleIncidentAction('assign');
        } else if (e.target.closest('#btn-start-incident')) {
            handleIncidentAction('start');
        } else if (e.target.closest('#btn-complete-incident')) {
            handleIncidentAction('complete');
        } else if (e.target.closest('#btn-notes')) {
            const incident = state.incidents.find(i => i.id === state.selectedIncidentId);
            if (incident) addNoteToIncident(incident.id);
        }
    });

    // Clear notifications
    document.getElementById('btn-clear-notifications').addEventListener('click', clearNotifications);
    
    // Setup search functionality
    setupIncidentSearch();
}

function setupIncidentSearch() {
    // Add search functionality to incidents screen
    const searchBtn = document.querySelector('#incidents-screen .search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = prompt('Search incidents by title, type, or SH-CAD:');
            if (query) {
                searchIncidents(query);
            }
        });
    }
}

function searchIncidents(query) {
    const searchTerm = query.toLowerCase();
    const results = state.incidents.filter(incident => 
        incident.title.toLowerCase().includes(searchTerm) ||
        incident.type.toLowerCase().includes(searchTerm) ||
        incident.shcad.toLowerCase().includes(searchTerm) ||
        incident.id.toLowerCase().includes(searchTerm) ||
        (incident.address && incident.address.toLowerCase().includes(searchTerm))
    );
    
    const container = document.getElementById('incidents-list');
    document.getElementById('incidents-title').textContent = `Search Results (${results.length})`;
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round">search_off</span>
                <p>No incidents found matching "${query}"</p>
            </div>
        `;
        return;
    }
    
    renderIncidentsInContainer(results, container);
}

// Login Handler
async function handleLogin() {
    const phone = document.getElementById('phone-number').value;
    const countryCode = document.getElementById('country-code').value;
    
    if (phone.length < 10) {
        alert('Please enter a valid mobile number');
        return;
    }
    
    // Show loading state
    const btnLogin = document.getElementById('btn-login');
    const originalText = btnLogin.textContent;
    btnLogin.textContent = 'Sending OTP...';
    btnLogin.disabled = true;
    
    try {
        // Send OTP via backend API
        const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone_number: phone,
                country_code: countryCode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store phone for verification
            sessionStorage.setItem('otp_phone', phone);
            sessionStorage.setItem('otp_country_code', countryCode);
            
            // Show dev OTP in console and on screen (only for testing)
            if (data.dev_otp) {
                console.log('%c OTP CODE: ' + data.dev_otp, 'background: #4CAF50; color: white; font-size: 20px; padding: 10px;');
                
                // Display OTP on screen instead of alert
                const devDisplay = document.getElementById('dev-otp-display');
                const devCode = document.getElementById('dev-otp-code');
                if (devDisplay && devCode) {
                    devCode.textContent = data.dev_otp;
                    devDisplay.style.display = 'block';
                }
            } else {
                // Hide dev display for production
                const devDisplay = document.getElementById('dev-otp-display');
                if (devDisplay) {
                    devDisplay.style.display = 'none';
                }
            }
            
            showScreen('otp-screen');
            // Focus first OTP input
            setTimeout(() => {
                const firstInput = document.querySelector('.otp-digit');
                if (firstInput) firstInput.focus();
            }, 300);
        } else {
            alert(data.error || 'Failed to send OTP');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        alert('Failed to send OTP. Make sure the backend server is running on port 5000.');
    } finally {
        btnLogin.textContent = originalText;
        btnLogin.disabled = false;
    }
}

// OTP Inputs
function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-digit');
    inputs.forEach((input, index) => {
        input.addEventListener('input', async (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            
            // Check if all inputs are filled
            const allFilled = Array.from(inputs).every(inp => inp.value.length === 1);
            if (allFilled) {
                const otp = Array.from(inputs).map(inp => inp.value).join('');
                await verifyOtp(otp);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

// Verify OTP with backend
async function verifyOtp(otp) {
    const phone = sessionStorage.getItem('otp_phone');
    const countryCode = sessionStorage.getItem('otp_country_code');
    
    if (!phone) {
        alert('Session expired. Please login again.');
        showScreen('login-screen');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone_number: phone,
                country_code: countryCode,
                otp: otp
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // OTP verified successfully
            setTimeout(() => {
                handleOtpComplete();
            }, 300);
        } else {
            alert(data.error || 'Invalid OTP');
            // Clear OTP inputs
            document.querySelectorAll('.otp-digit').forEach(input => {
                input.value = '';
            });
            document.querySelector('.otp-digit').focus();
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        alert('Failed to verify OTP. Make sure the backend server is running.');
        // Clear OTP inputs
        document.querySelectorAll('.otp-digit').forEach(input => {
            input.value = '';
        });
        document.querySelector('.otp-digit').focus();
    }
}

// Resend OTP
async function resendOtp() {
    const phone = sessionStorage.getItem('otp_phone');
    const countryCode = sessionStorage.getItem('otp_country_code');
    
    if (!phone) {
        alert('Session expired. Please login again.');
        showScreen('login-screen');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone_number: phone,
                country_code: countryCode
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show dev OTP in console (only for testing)
            if (data.dev_otp) {
                console.log('%c OTP CODE: ' + data.dev_otp, 'background: #4CAF50; color: white; font-size: 20px; padding: 10px;');
                
                // Display OTP on screen
                const devDisplay = document.getElementById('dev-otp-display');
                const devCode = document.getElementById('dev-otp-code');
                if (devDisplay && devCode) {
                    devCode.textContent = data.dev_otp;
                    devDisplay.style.display = 'block';
                }
            }
            
            alert('New OTP code sent! Check above for the code.');
        } else {
            alert(data.error || 'Failed to resend OTP');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        alert('Failed to resend OTP. Make sure the backend server is running.');
    }
}

// OTP Verification - Check if new or returning user
function handleOtpComplete() {
    const savedUser = localStorage.getItem('shomrim_user');
    if (savedUser) {
        // Returning user - load their info and go to passcode
        state.user = JSON.parse(savedUser);
        showScreen('passcode-screen');
    } else {
        // New user - go to registration
        showScreen('registration-screen');
    }
}

// Registration Handler
function handleRegistration() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const callsign = document.getElementById('reg-callsign').value.trim();
    const role = document.getElementById('reg-role').value;
    const phone = document.getElementById('phone-number').value;
    const countryCode = document.getElementById('country-code').value;
    
    if (!name) {
        alert('Please enter your full name');
        return;
    }
    
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    if (!callsign) {
        alert('Please enter your unit number/callsign');
        return;
    }
    
    // Update user state with registration info
    state.user = {
        name: name,
        email: email,
        callsign: callsign,
        phone: countryCode + ' ' + phone,
        role: role,
        avatar: null
    };
    
    // Save to localStorage
    localStorage.setItem('shomrim_user', JSON.stringify(state.user));
    
    // Continue to passcode setup
    showScreen('passcode-screen');
}

// Numpad for Passcode
function setupNumpad() {
    document.querySelectorAll('.numpad-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = btn.dataset.num;
            if (num === '') return;
            
            if (num === 'del') {
                handlePasscodeDelete();
            } else {
                handlePasscodeInput(num);
            }
        });
    });
}

function handlePasscodeInput(num) {
    if (state.isConfirmingPasscode) {
        if (state.confirmPasscode.length < 4) {
            state.confirmPasscode += num;
            updatePasscodeDots(state.confirmPasscode.length);
            
            if (state.confirmPasscode.length === 4) {
                if (state.passcode === state.confirmPasscode) {
                    localStorage.setItem('shomrim_passcode', state.passcode);
                    setTimeout(() => {
                        showScreen('face-screen');
                    }, 300);
                } else {
                    alert('Passcode does not match!');
                    state.confirmPasscode = '';
                    updatePasscodeDots(0);
                }
            }
        }
    } else {
        if (state.passcode.length < 4) {
            state.passcode += num;
            updatePasscodeDots(state.passcode.length);
            
            if (state.passcode.length === 4) {
                setTimeout(() => {
                    state.isConfirmingPasscode = true;
                    document.getElementById('passcode-title').textContent = 'Confirm Passcode';
                    updatePasscodeDots(0);
                }, 300);
            }
        }
    }
}

function handlePasscodeDelete() {
    if (state.isConfirmingPasscode) {
        if (state.confirmPasscode.length > 0) {
            state.confirmPasscode = state.confirmPasscode.slice(0, -1);
            updatePasscodeDots(state.confirmPasscode.length);
        }
    } else {
        if (state.passcode.length > 0) {
            state.passcode = state.passcode.slice(0, -1);
            updatePasscodeDots(state.passcode.length);
        }
    }
}

function updatePasscodeDots(count) {
    const dots = document.querySelectorAll('.passcode-dot');
    dots.forEach((dot, index) => {
        if (index < count) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

// Face Upload
function handleFaceUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('face-preview');
            preview.src = event.target.result;
            preview.style.display = 'block';
            document.querySelector('.face-placeholder').style.display = 'none';
            
            // Save avatar to user state
            state.user.avatar = event.target.result;
            if (state.currentUser) {
                state.currentUser.avatar = event.target.result;
            }
            
            // Update all avatar displays immediately
            updateAvatarDisplays(event.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function handleFaceContinue() {
    // Save user and complete registration
    localStorage.setItem('shomrim_user', JSON.stringify(state.user));
    state.isLoggedIn = true;
    
    // Update drawer with user info
    const drawerName = document.querySelector('.drawer-user-name');
    const drawerEmail = document.querySelector('.drawer-user-email');
    if (drawerName) drawerName.textContent = state.user.name;
    if (drawerEmail) drawerEmail.textContent = state.user.email;
    
    // Update avatar displays if photo was uploaded
    if (state.user.avatar) {
        updateAvatarDisplays(state.user.avatar);
    }
    
    showScreen('main-screen');
    updateUI();
}

// Tab Change
function handleTabChange(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    // Could filter incidents based on tab
}

// Status Toggles
function toggleStatus(type) {
    if (type === 'patrol') {
        state.onPatrol = !state.onPatrol;
        document.getElementById('btn-patrol').classList.toggle('active', state.onPatrol);
    } else {
        state.onDuty = !state.onDuty;
        document.getElementById('btn-duty').classList.toggle('active', state.onDuty);
    }
}

// Dashboard Card Click
function handleCardClick(filter) {
    const titles = {
        onair: 'OnAir',
        invitation: 'Invitation Pending',
        pending: 'Pending',
        started: 'Started',
        completed: 'Completed',
        cancelled: 'Cancelled'
    };
    
    document.getElementById('incidents-title').textContent = titles[filter] || 'Incidents';
    renderIncidentsList(filter);
    showScreen('incidents-screen');
}

// Drawer Toggle
function toggleDrawer() {
    const drawer = document.getElementById('side-drawer');
    const overlay = document.getElementById('drawer-overlay');
    drawer.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Notifications Toggle
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('active');
}

function clearNotifications() {
    document.getElementById('notifications-list').innerHTML = '';
    state.notifications = 0;
    document.getElementById('notification-count').textContent = '0';
    document.getElementById('notification-count').style.display = 'none';
}

// Drawer Navigation
function handleDrawerNavigation(page) {
    toggleDrawer();
    
    switch (page) {
        case 'home':
            showScreen('main-screen');
            break;
        case 'profile':
            updateProfileDisplay();
            showScreen('profile-screen');
            break;
        case 'contacts':
            renderContactsList();
            setupContactSearch();
            setupAddContact();
            showScreen('contacts-screen');
            break;
        case 'schedule':
            showScreen('schedule-screen');
            break;
        case 'notifications':
            renderNotificationsList();
            toggleNotifications();
            break;
        case 'settings':
            showScreen('settings-screen');
            break;
        case 'admin':
            showAdminPanel();
            break;
        case 'on-duty':
            // Set toggle state based on current user status
            if (state.currentUser) {
                document.getElementById('duty-toggle').checked = state.currentUser.on_duty || false;
                document.getElementById('duty-status-text').textContent = 
                    state.currentUser.on_duty ? 'Currently On Duty' : 'Currently Off Duty';
            }
            refreshOnDuty();
            showScreen('on-duty-screen');
            break;
        case 'on-patrol':
            // Set toggle state based on current user status
            if (state.currentUser) {
                document.getElementById('patrol-toggle').checked = state.currentUser.on_patrol || false;
                document.getElementById('patrol-status-text').textContent = 
                    state.currentUser.on_patrol ? 'Currently On Patrol' : 'Currently Not On Patrol';
            }
            refreshOnPatrol();
            showScreen('on-patrol-screen');
            break;
        case 'dispatcher':
            refreshDispatchers();
            showScreen('dispatcher-screen');
            break;
        case 'supervisors':
            refreshSupervisors();
            showScreen('supervisors-screen');
            break;
        case 'responders':
            refreshResponders();
            showScreen('responders-screen');
            break;
        case 'suspect':
            loadSuspects();
            showScreen('suspect-screen');
            break;
        case 'vehicle':
            loadVehicles();
            showScreen('vehicle-screen');
            break;
        case 'synagogues':
        case 'schools':
        case 'cctv':
        case 'hospitals':
        case 'police':
        case 'legal':
            alert(`${page.charAt(0).toUpperCase() + page.slice(1)} - Coming soon!`);
            break;
        default:
            alert(`${page} - Coming soon!`);
    }
    
    // Update active state
    document.querySelectorAll('.drawer-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
}

// Logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('shomrim_user');
        localStorage.removeItem('shomrim_passcode');
        state.isLoggedIn = false;
        state.passcode = '';
        state.confirmPasscode = '';
        state.isConfirmingPasscode = false;
        toggleDrawer();
        showScreen('login-screen');
    }
}

function clearNotifications() {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    
    state.notifications = [];
    state.notificationCount = 0;
    updateNotificationBadge();
    renderNotificationsList();
    saveState();
}

// Save Incident
// Save Incident
async function handleSaveIncident() {
    const title = document.getElementById('incident-title').value.trim();
    const type = document.getElementById('incident-type').value;
    const description = document.getElementById('incident-description').value.trim();
    const address = document.getElementById('incident-address').value.trim();
    
    // Validate required fields
    if (!title) {
        alert('⚠️ Please enter an incident title');
        document.getElementById('incident-title').focus();
        return;
    }
    
    if (!type) {
        alert('⚠️ Please select an incident type');
        document.getElementById('incident-type').focus();
        return;
    }
    
    if (!description || description.split(/\s+/).filter(w => w.length > 0).length < 10) {
        alert('⚠️ Description must be at least 10 words');
        document.getElementById('incident-description').focus();
        return;
    }
    
    if (!address) {
        alert('⚠️ Please enter the incident location');
        document.getElementById('incident-address').focus();
        return;
    }
    
    const btnSave = document.getElementById('btn-save-incident');
    btnSave.textContent = 'Saving...';
    btnSave.disabled = true;
    
    // Show professional loading overlay
    showLoading('Creating Incident...');
    
    try {
        const id = generateIncidentId();
        const incident = {
            id,
            shcad: generateShcad(id),
            title,
            type: type || 'Other',
            description,
            status: 'pending',
            address: document.getElementById('incident-address').value,
            postcode: document.getElementById('incident-postcode').value,
            location: null,
            caller: {
                name: document.getElementById('caller-name').value,
                phone: document.getElementById('caller-phone').value,
                isVictim: document.getElementById('caller-is-victim').checked,
                isWitness: document.getElementById('caller-is-witness').checked
            },
            victims: tempVictims,
            witnesses: tempWitnesses,
            suspects: tempSuspects,
            assignedUsers: tempAssignedUsers.length > 0 ? tempAssignedUsers : [state.user.name],
            invitedUsers: [],
            notes: [],
            followUp: document.getElementById('incident-followup')?.value || '',
            questions: document.getElementById('incident-questions')?.value || '',
            vehicleInfo: {
                registration: document.getElementById('vehicle-registration')?.value || '',
                makeModel: document.getElementById('vehicle-make-model')?.value || '',
                color: document.getElementById('vehicle-color')?.value || ''
            },
            policeInfo: {
                cadRef: document.getElementById('police-cad')?.value || '',
                crisRef: document.getElementById('police-cris')?.value || '',
                chsRef: '',
                cadDate: null,
                crisDate: null,
                chsDate: null,
                officerName: document.getElementById('police-officer')?.value || '',
                officerBadge: document.getElementById('police-badge')?.value || '',
                reportToPolice: document.getElementById('report-to-police')?.checked || false
            },
            arrestInfo: {
                arrestMade: false,
                arrestCount: 0,
                description: ''
            },
            arrests: [],
            grade: null,
            images: [],
            videos: [],
            history: [
                { action: 'Created', user: state.user.name, timestamp: new Date().toISOString() }
            ],
            createdBy: state.user.phone || state.user.email,
            created_by: state.user.phone || state.user.email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save to database
        const response = await fetch(`${API_BASE_URL}/api/incidents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(incident)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Add to local state
            state.incidents.unshift(incident);
            updateCountsFromIncidents();
            updateCounts();
            
            // Add notification
            addNotification('incident_created', 'Incident Created', `Incident ${incident.shcad} has been created`, incident.id);
            
            // Clear form
            document.getElementById('incident-title').value = '';
            document.getElementById('incident-type').value = '';
            document.getElementById('incident-description').value = '';
            document.getElementById('incident-address').value = '';
            document.getElementById('incident-postcode').value = '';
            document.getElementById('caller-name').value = '';
            document.getElementById('caller-phone').value = '';
            document.getElementById('caller-is-victim').checked = false;
            document.getElementById('caller-is-witness').checked = false;
            
            // Clear new fields
            if (document.getElementById('incident-questions')) document.getElementById('incident-questions').value = '';
            if (document.getElementById('incident-followup')) document.getElementById('incident-followup').value = '';
            if (document.getElementById('vehicle-registration')) document.getElementById('vehicle-registration').value = '';
            if (document.getElementById('vehicle-make-model')) document.getElementById('vehicle-make-model').value = '';
            if (document.getElementById('vehicle-color')) document.getElementById('vehicle-color').value = '';
            if (document.getElementById('police-cad')) document.getElementById('police-cad').value = '';
            if (document.getElementById('police-cris')) document.getElementById('police-cris').value = '';
            if (document.getElementById('police-officer')) document.getElementById('police-officer').value = '';
            if (document.getElementById('police-badge')) document.getElementById('police-badge').value = '';
            if (document.getElementById('report-to-police')) document.getElementById('report-to-police').checked = false;
            
            // Reset temporary arrays
            tempVictims = [];
            tempWitnesses = [];
            tempSuspects = [];
            tempAssignedUsers = [];
            renderVictimsList();
            renderWitnessesList();
            renderSuspectsList();
            renderAssignedUsersList();
            
            // Hide collapsible sections
            if (document.getElementById('caller-section')) document.getElementById('caller-section').style.display = 'none';
            if (document.getElementById('vehicle-section')) document.getElementById('vehicle-section').style.display = 'none';
            if (document.getElementById('police-section')) document.getElementById('police-section').style.display = 'none';
            
            saveState();
            showScreen('main-screen');
            
            // Show success message with incident number
            alert(`✅ Incident Created Successfully!\n\nIncident Number: ${incident.shcad}\n\nThe incident has been saved to the database and all team members have been notified.`);
        } else {
            alert('❌ Failed to save incident: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving incident:', error);
        alert('❌ Failed to save incident to database.\n\nPlease check:\n• Backend server is running on port 5000\n• Database connection is active\n\nError: ' + error.message);
    } finally {
        // Hide loading overlay
        hideLoading();
        btnSave.innerHTML = '<span class="material-icons-round">check</span>';
        btnSave.disabled = false;
    }
}

// Incident Actions
async function handleIncidentAction(action) {
    const incidentId = state.selectedIncidentId;
    const incident = state.incidents.find(i => i.id === incidentId);
    
    if (!incident) return;
    
    const oldStatus = incident.status;
    let confirmed = false;
    let newStatus = oldStatus;
    
    switch (action) {
        case 'start':
            confirmed = confirm('Are you sure you want to start this incident?');
            if (confirmed) {
                newStatus = 'started';
                addIncidentHistory(incidentId, 'Started');
                addNotification('incident_started', 'Incident Started', `Incident ${incident.shcad} has been started`, incidentId);
            }
            break;
            
        case 'complete':
            confirmed = confirm('Are you sure you want to complete this incident?');
            if (confirmed) {
                newStatus = 'completed';
                addIncidentHistory(incidentId, 'Completed');
                addNotification('incident_completed', 'Incident Completed', `Incident ${incident.shcad} has been completed`, incidentId);
            }
            break;
            
        case 'cancel':
            const reason = prompt('Please enter the reason for cancellation (minimum 10 words):');
            if (reason && reason.split(/\s+/).length >= 10) {
                confirmed = true;
                newStatus = 'cancelled';
                if (!incident.notes) incident.notes = [];
                incident.notes.push({
                    id: Date.now(),
                    text: `Cancellation Reason: ${reason}`,
                    createdBy: state.user.name,
                    createdAt: new Date().toISOString()
                });
                addIncidentHistory(incidentId, 'Cancelled');
                addNotification('incident_cancelled', 'Incident Cancelled', `Incident ${incident.shcad} has been cancelled`, incidentId);
            } else if (reason) {
                alert('Cancellation reason must be at least 10 words');
                return;
            }
            break;
            
        case 'reopen':
            confirmed = confirm('Are you sure you want to reopen this incident?');
            if (confirmed) {
                newStatus = 'pending';
                addIncidentHistory(incidentId, 'Reopened');
                addNotification('update', 'Incident Reopened', `Incident ${incident.shcad} has been reopened`, incidentId);
            }
            break;
            
        case 'assign':
            showAssignUsersDialog(incidentId);
            return;
            
        case 'accept':
            confirmed = confirm('Do you want to accept this incident request?');
            if (confirmed) {
                if (!incident.assignedUsers) incident.assignedUsers = [];
                if (!incident.assignedUsers.includes(state.user.name)) {
                    incident.assignedUsers.push(state.user.name);
                }
                if (incident.invitedUsers && incident.invitedUsers.includes(state.user.name)) {
                    incident.invitedUsers = incident.invitedUsers.filter(u => u !== state.user.name);
                }
                addIncidentHistory(incidentId, 'Request Accepted');
                addNotification('invitation_accepted', 'Request Accepted', `You have accepted incident ${incident.shcad}`, incidentId);
            }
            break;
            
        case 'decline':
            confirmed = confirm('Do you want to decline this incident request?');
            if (confirmed) {
                if (incident.invitedUsers && incident.invitedUsers.includes(state.user.name)) {
                    incident.invitedUsers = incident.invitedUsers.filter(u => u !== state.user.name);
                }
                addIncidentHistory(incidentId, 'Request Declined');
                addNotification('invitation_declined', 'Request Declined', `You have declined incident ${incident.shcad}`, incidentId);
                showScreen('main-screen');
                return;
            }
            break;
    }
    
    if (confirmed && newStatus !== oldStatus) {
        incident.status = newStatus;
        incident.updatedAt = new Date().toISOString();
        
        // Show loading and update in database
        showLoading('Updating Incident...');
        try {
            await updateIncidentInDatabase(incident);
            updateCountsFromIncidents();
            updateCounts();
            saveState();
        } catch (error) {
            console.error('Failed to update incident in database:', error);
            alert('❌ Failed to update incident status in database.\n\nThe change was saved locally but may not persist.');
        } finally {
            hideLoading();
        }
    }
    
    if (confirmed) {
        showIncidentDetail(incidentId);
    }
}

// Update UI
function updateUI() {
    // Load user data from localStorage
    const savedUser = localStorage.getItem('shomrim_user');
    if (savedUser) {
        state.user = JSON.parse(savedUser);
    }
    
    // Update user info
    document.getElementById('user-name').textContent = state.user.name;
    document.getElementById('user-email').textContent = state.user.email;
    document.getElementById('user-callsign').textContent = state.user.callsign;
    
    // Update drawer
    document.querySelector('.drawer-user-name').textContent = state.user.name;
    document.querySelector('.drawer-user-email').textContent = state.user.email;
    
    // Update counts
    updateCounts();
    
    // Update notification badge
    updateNotificationBadge();
    
    // Render notifications
    renderNotificationsList();
}

function updateProfileDisplay() {
    // Update profile screen with current user data
    document.getElementById('profile-name').textContent = state.user.name;
    document.getElementById('profile-callsign').textContent = state.user.callsign;
    document.getElementById('profile-field-name').textContent = state.user.name;
    document.getElementById('profile-field-email').textContent = state.user.email;
    document.getElementById('profile-field-phone').textContent = state.user.phone || 'Not provided';
    document.getElementById('profile-field-callsign').textContent = state.user.callsign;
    document.getElementById('profile-field-role').textContent = state.user.role;
    
    // Update avatar if available
    if (state.user.avatar || state.currentUser?.avatar) {
        const avatarUrl = state.user.avatar || state.currentUser.avatar;
        updateAvatarDisplays(avatarUrl);
    }
}

function updateAvatarDisplays(avatarUrl) {
    // Update drawer avatar
    const drawerAvatar = document.querySelector('.drawer-user-avatar img');
    if (drawerAvatar) {
        drawerAvatar.src = avatarUrl;
        drawerAvatar.style.display = 'block';
        const drawerFallback = document.querySelector('.drawer-user-avatar .avatar-fallback');
        if (drawerFallback) drawerFallback.style.display = 'none';
    }
    
    // Update main screen avatar
    const mainAvatar = document.getElementById('user-avatar-img');
    if (mainAvatar) {
        mainAvatar.src = avatarUrl;
        mainAvatar.style.display = 'block';
        const mainFallback = mainAvatar.nextElementSibling;
        if (mainFallback) mainFallback.style.display = 'none';
    }
    
    // Update profile screen avatar
    const profileAvatar = document.querySelector('.profile-avatar-large img');
    if (profileAvatar) {
        profileAvatar.src = avatarUrl;
        profileAvatar.style.display = 'block';
        const profileFallback = document.querySelector('.profile-avatar-large .avatar-fallback');
        if (profileFallback) profileFallback.style.display = 'none';
    }
}

function updateCounts() {
    document.getElementById('count-onair').textContent = state.counts.onair;
    document.getElementById('count-invitation').textContent = state.counts.invitation;
    document.getElementById('count-pending').textContent = state.counts.pending;
    document.getElementById('count-started').textContent = state.counts.started;
    document.getElementById('count-completed').textContent = state.counts.completed;
    document.getElementById('count-cancelled').textContent = state.counts.cancelled;
}

// Render Incidents List
function renderIncidentsList(filter = null) {
    const container = document.getElementById('incidents-list');
    state.currentFilter = filter;
    let incidents = state.incidents;
    
    if (filter) {
        if (filter === 'invitation') {
            // Show incidents where user is invited
            incidents = incidents.filter(i => 
                i.invitedUsers && i.invitedUsers.includes(state.user.name)
            );
        } else if (filter === 'onair') {
            incidents = incidents.filter(i => i.status === 'onair');
        } else {
            // Map statuses
            const statusMap = {
                'pending': ['pending', 'created'],
                'started': ['started', 'assigned'],
                'completed': 'completed',
                'cancelled': 'cancelled'
            };
            
            if (statusMap[filter]) {
                const allowedStatuses = Array.isArray(statusMap[filter]) ? statusMap[filter] : [statusMap[filter]];
                incidents = incidents.filter(i => allowedStatuses.includes(i.status));
            }
        }
    }
    
    // Filter by current tab (Me vs Global)
    if (state.currentTab === 'me') {
        incidents = incidents.filter(i => 
            i.createdBy === state.user.name ||
            (i.assignedUsers && i.assignedUsers.includes(state.user.name)) ||
            (i.invitedUsers && i.invitedUsers.includes(state.user.name))
        );
    }
    
    if (incidents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round">inbox</span>
                <p>No Incidents Found!</p>
            </div>
        `;
        return;
    }
    
    renderIncidentsInContainer(incidents, container);
}

function renderIncidentsInContainer(incidents, container) {
    container.innerHTML = incidents.map(incident => {
        const statusClass = incident.status;
        const statusText = incident.status.charAt(0).toUpperCase() + incident.status.slice(1);
        
        return `
            <div class="incident-card" data-id="${incident.id}">
                <div class="incident-header">
                    <span class="incident-id">${incident.shcad}</span>
                    <span class="incident-status ${statusClass}">${statusText}</span>
                </div>
                <div class="incident-title">${incident.title}</div>
                <div class="incident-type">${incident.type || 'General'}</div>
                ${incident.assignedUsers && incident.assignedUsers.length > 0 ? `
                    <div class="incident-assigned">
                        <span class="material-icons-round" style="font-size: 14px;">person</span>
                        ${incident.assignedUsers.slice(0, 2).join(', ')}${incident.assignedUsers.length > 2 ? ` +${incident.assignedUsers.length - 2}` : ''}
                    </div>
                ` : ''}
                <div class="incident-footer">
                    <span class="incident-time">${formatTime(incident.createdAt)}</span>
                    <span class="incident-location">
                        <span class="material-icons-round">location_on</span>
                        ${incident.postcode || 'No location'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.incident-card').forEach(card => {
        card.addEventListener('click', () => {
            showIncidentDetail(card.dataset.id);
        });
    });
}

// Show Incident Detail
function showIncidentDetail(id) {
    const incident = state.incidents.find(i => i.id === id);
    if (!incident) return;
    
    state.selectedIncidentId = id;
    
    const container = document.getElementById('detail-content');
    container.innerHTML = `
        <div class="detail-header" style="background: #f5f5f5; padding: 16px; margin: -16px -16px 16px -16px; border-bottom: 1px solid #e0e0e0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h2 style="margin: 0; font-size: 20px;">${incident.shcad}</h2>
                <span class="incident-status ${incident.status}" style="padding: 6px 12px; border-radius: 12px; font-size: 13px; font-weight: 600;">
                    ${incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                </span>
            </div>
            <div style="font-size: 14px; color: #666;">
                ${formatDateTime(incident.createdAt)}
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Incident Info</h3>
            <div class="detail-field">
                <span class="detail-label">Title</span>
                <span class="detail-value">${incident.title}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Type</span>
                <span class="detail-value">${incident.type || '-'}</span>
            </div>
            ${incident.grade ? `
            <div class="detail-field">
                <span class="detail-label">Grade</span>
                <span class="detail-value">${incident.grade}</span>
            </div>
            ` : ''}
            <div class="detail-field">
                <span class="detail-label">Created By</span>
                <span class="detail-value">${incident.createdBy}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Description</h3>
            <p style="padding: 12px 0; color: var(--text-medium); font-size: 14px; line-height: 1.6;">
                ${incident.description || 'No description'}
            </p>
        </div>
        
        <div class="detail-section">
            <h3>Location</h3>
            <div class="detail-field">
                <span class="detail-label">Address</span>
                <span class="detail-value">${incident.address || '-'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Post Code</span>
                <span class="detail-value">${incident.postcode || '-'}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>Caller Info</h3>
            <div class="detail-field">
                <span class="detail-label">Name</span>
                <span class="detail-value">${incident.caller.name || '-'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Phone</span>
                <span class="detail-value">${incident.caller.phone || '-'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Is Victim</span>
                <span class="detail-value">${incident.caller.isVictim ? 'Yes' : 'No'}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Is Witness</span>
                <span class="detail-value">${incident.caller.isWitness ? 'Yes' : 'No'}</span>
            </div>
        </div>
        
        ${incident.victims && incident.victims.length > 0 ? `
        <div class="detail-section">
            <h3>Victims (${incident.victims.length})</h3>
            ${incident.victims.map(v => `
                <div class="detail-field">
                    <span class="detail-label">${v.name}</span>
                    <span class="detail-value">${v.phone || v.email || '-'}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${incident.witnesses && incident.witnesses.length > 0 ? `
        <div class="detail-section">
            <h3>Witnesses (${incident.witnesses.length})</h3>
            ${incident.witnesses.map(w => `
                <div class="detail-field">
                    <span class="detail-label">${w.name}</span>
                    <span class="detail-value">${w.phone || w.email || '-'}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${incident.suspects && incident.suspects.length > 0 ? `
        <div class="detail-section">
            <h3>Suspects (${incident.suspects.length})</h3>
            ${incident.suspects.map(s => `
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--bg-light);">
                    <div class="detail-field">
                        <span class="detail-label">Name</span>
                        <span class="detail-value">${s.name}</span>
                    </div>
                    ${s.description ? `
                    <p style="font-size: 13px; color: var(--text-medium); margin-top: 4px;">${s.description}</p>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="detail-section">
            <h3>Assigned Users</h3>
            ${incident.assignedUsers && incident.assignedUsers.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${incident.assignedUsers.map(u => `
                        <span class="user-chip">${u}</span>
                    `).join('')}
                </div>
            ` : '<p style="font-size: 14px; color: var(--text-medium);">No users assigned</p>'}
        </div>
        
        ${incident.invitedUsers && incident.invitedUsers.length > 0 ? `
        <div class="detail-section">
            <h3>Invited Users</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${incident.invitedUsers.map(u => `
                    <span class="user-chip invited">${u}</span>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${incident.policeInfo && (incident.policeInfo.cadRef || incident.policeInfo.crisRef || incident.policeInfo.chsRef) ? `
        <div class="detail-section">
            <h3>Police Information</h3>
            ${incident.policeInfo.cadRef ? `
            <div class="detail-field">
                <span class="detail-label">CAD Reference</span>
                <span class="detail-value">${incident.policeInfo.cadRef}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">CAD Date</span>
                <span class="detail-value">${formatDateTime(incident.policeInfo.cadDate)}</span>
            </div>
            ` : ''}
            ${incident.policeInfo.crisRef ? `
            <div class="detail-field">
                <span class="detail-label">CRIS Reference</span>
                <span class="detail-value">${incident.policeInfo.crisRef}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">CRIS Date</span>
                <span class="detail-value">${formatDateTime(incident.policeInfo.crisDate)}</span>
            </div>
            ` : ''}
            ${incident.policeInfo.chsRef ? `
            <div class="detail-field">
                <span class="detail-label">CHS Reference</span>
                <span class="detail-value">${incident.policeInfo.chsRef}</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">CHS Date</span>
                <span class="detail-value">${formatDateTime(incident.policeInfo.chsDate)}</span>
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        ${incident.arrestInfo && incident.arrestInfo.arrestMade ? `
        <div class="detail-section">
            <h3>Arrest Information</h3>
            <div class="detail-field">
                <span class="detail-label">Arrest Made</span>
                <span class="detail-value">Yes</span>
            </div>
            <div class="detail-field">
                <span class="detail-label">Number of Arrests</span>
                <span class="detail-value">${incident.arrestInfo.arrestCount}</span>
            </div>
            ${incident.arrestInfo.description ? `
            <p style="padding: 12px 0; color: var(--text-medium); font-size: 14px; line-height: 1.6;">
                ${incident.arrestInfo.description}
            </p>
            ` : ''}
        </div>
        ` : ''}
        
        ${incident.followUp ? `
        <div class="detail-section">
            <h3>Follow Up Description</h3>
            <p style="padding: 12px 0; color: var(--text-medium); font-size: 14px; line-height: 1.6;">
                ${incident.followUp}
            </p>
        </div>
        ` : ''}
        
        ${incident.notes && incident.notes.length > 0 ? `
        <div class="detail-section">
            <h3>Notes (${incident.notes.length})</h3>
            ${incident.notes.map(note => `
                <div class="note-item">
                    <div class="note-header">
                        <span class="note-author">${note.createdBy}</span>
                        <span class="note-time">${formatTime(note.createdAt)}</span>
                    </div>
                    <p class="note-text">${note.text}</p>
                </div>
            `).join('')}
            <button class="btn-add-note" onclick="addNoteToIncident('${incident.id}')">
                <span class="material-icons-round">add</span>
                Add Note
            </button>
        </div>
        ` : `
        <div class="detail-section">
            <h3>Notes</h3>
            <p style="font-size: 14px; color: var(--text-medium); margin-bottom: 12px;">No notes yet</p>
            <button class="btn-add-note" onclick="addNoteToIncident('${incident.id}')">
                <span class="material-icons-round">add</span>
                Add Note
            </button>
        </div>
        `}
        
        ${incident.history && incident.history.length > 0 ? `
        <div class="detail-section">
            <h3>Incident History</h3>
            ${incident.history.slice().reverse().map(h => `
                <div class="history-item">
                    <div class="history-icon">
                        <span class="material-icons-round">${getHistoryIcon(h.action)}</span>
                    </div>
                    <div class="history-content">
                        <p class="history-action">${h.action}</p>
                        <p class="history-user">by ${h.user}</p>
                        <span class="history-time">${formatDateTime(h.timestamp)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}
    `;
    
    // Update action buttons based on status
    updateDetailActionButtons(incident);
    
    showScreen('incident-detail-screen');
}

function getHistoryIcon(action) {
    const icons = {
        'Created': 'add_circle',
        'Started': 'play_arrow',
        'Completed': 'check_circle',
        'Cancelled': 'cancel',
        'Reopened': 'replay',
        'Assigned': 'person_add',
        'Request Accepted': 'how_to_reg',
        'Request Declined': 'person_remove',
        'Note Added': 'note_add',
        'Updated': 'update'
    };
    return icons[action] || 'info';
}

function updateDetailActionButtons(incident) {
    const actionsContainer = document.querySelector('.detail-actions');
    
    if (!actionsContainer) return;
    
    let buttons = '';
    
    // Show different buttons based on status
    if (incident.status === 'pending' || incident.status === 'created') {
        buttons = `
            <button class="action-btn btn-start" onclick="handleIncidentAction('start')">
                <span class="material-icons-round">play_arrow</span>
                Start
            </button>
            <button class="action-btn btn-assign" onclick="handleIncidentAction('assign')">
                <span class="material-icons-round">person_add</span>
                Assign
            </button>
            <button class="action-btn btn-cancel" onclick="handleIncidentAction('cancel')">
                <span class="material-icons-round">close</span>
                Cancel
            </button>
        `;
    } else if (incident.status === 'started' || incident.status === 'assigned') {
        buttons = `
            <button class="action-btn btn-complete" onclick="handleIncidentAction('complete')">
                <span class="material-icons-round">check</span>
                Complete
            </button>
            <button class="action-btn btn-assign" onclick="handleIncidentAction('assign')">
                <span class="material-icons-round">person_add</span>
                Assign
            </button>
            <button class="action-btn btn-cancel" onclick="handleIncidentAction('cancel')">
                <span class="material-icons-round">close</span>
                Cancel
            </button>
        `;
    } else if (incident.status === 'completed' || incident.status === 'cancelled') {
        buttons = `
            <button class="action-btn btn-reopen" onclick="handleIncidentAction('reopen')">
                <span class="material-icons-round">replay</span>
                Reopen
            </button>
        `;
    }
    
    // Check if user is invited
    if (incident.invitedUsers && incident.invitedUsers.includes(state.user.name)) {
        buttons = `
            <button class="action-btn btn-accept" onclick="handleIncidentAction('accept')">
                <span class="material-icons-round">check</span>
                Accept
            </button>
            <button class="action-btn btn-decline" onclick="handleIncidentAction('decline')">
                <span class="material-icons-round">close</span>
                Decline
            </button>
        ` + buttons;
    }
    
    actionsContainer.innerHTML = buttons;
}

async function addNoteToIncident(incidentId) {
    const noteText = prompt('Enter your note (minimum 5 characters):');
    if (!noteText || noteText.trim().length < 5) {
        if (noteText !== null) {
            alert('Note must be at least 5 characters long');
        }
        return;
    }
    
    const incident = state.incidents.find(i => i.id === incidentId);
    if (!incident) return;
    
    if (!incident.notes) incident.notes = [];
    
    const note = {
        id: Date.now(),
        text: noteText.trim(),
        createdBy: state.user.name,
        createdAt: new Date().toISOString()
    };
    
    incident.notes.push(note);
    addIncidentHistory(incidentId, 'Note Added');
    incident.updatedAt = new Date().toISOString();
    
    // Update in database
    showLoading('Adding Note...');
    try {
        await updateIncidentInDatabase(incident);
        saveState();
        
        // Refresh the detail view
        showIncidentDetail(incidentId);
        
        alert('✅ Note added successfully!');
    } catch (error) {
        console.error('Failed to save note to database:', error);
        alert('❌ Failed to save note. Please try again.');
        // Remove the note from local state if database save failed
        incident.notes.pop();
    } finally {
        hideLoading();
    }
}

async function showAssignUsersDialog(incidentId) {
    const incident = state.incidents.find(i => i.id === incidentId);
    if (!incident) return;
    
    const availableUsers = state.users.filter(u => u.status === 'available');
    
    if (availableUsers.length === 0) {
        alert('No available users to assign');
        return;
    }
    
    const usersList = availableUsers.map(u => 
        `${u.name} (${u.callsign}) - ${u.role}`
    ).join('\n');
    
    const selected = prompt(`Available Users:\n\n${usersList}\n\nEnter user name to assign (or "cancel" to cancel):`);
    
    if (!selected || selected.toLowerCase() === 'cancel') return;
    
    const user = availableUsers.find(u => 
        u.name.toLowerCase().includes(selected.toLowerCase()) || 
        u.callsign.toLowerCase() === selected.toLowerCase()
    );
    
    if (!user) {
        alert('User not found or not available');
        return;
    }
    
    if (!incident.assignedUsers) incident.assignedUsers = [];
    
    if (incident.assignedUsers.includes(user.name)) {
        alert('User is already assigned to this incident');
        return;
    }
    
    incident.assignedUsers.push(user.name);
    addIncidentHistory(incidentId, `Assigned to ${user.name}`);
    addNotification('user_assigned', 'User Assigned', `${user.name} has been assigned to incident ${incident.shcad}`, incidentId);
    incident.updatedAt = new Date().toISOString();
    
    // Update in database
    showLoading('Assigning User...');
    try {
        await updateIncidentInDatabase(incident);
        saveState();
        showIncidentDetail(incidentId);
        alert(`✅ ${user.name} has been assigned to this incident`);
    } catch (error) {
        console.error('Failed to assign user in database:', error);
        alert('❌ Failed to assign user. Please try again.');
        // Remove the user from local state if database save failed
        incident.assignedUsers.pop();
    } finally {
        hideLoading();
    }
}

// Render Contacts List
function renderContactsList(searchQuery = '') {
    const container = document.getElementById('contacts-list');
    
    let contacts = state.contacts;
    
    // Filter by search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        contacts = contacts.filter(c => 
            c.firstName.toLowerCase().includes(query) ||
            c.lastName.toLowerCase().includes(query) ||
            c.phone.toLowerCase().includes(query) ||
            (c.email && c.email.toLowerCase().includes(query))
        );
    }
    
    // Sort alphabetically
    contacts.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    if (contacts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round">person_off</span>
                <p>No Contact Found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = contacts.map(contact => {
        const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
        return `
            <div class="contact-item" data-id="${contact.id}">
                <div class="contact-avatar">${initials}</div>
                <div class="contact-info">
                    <div class="contact-name">${contact.firstName} ${contact.lastName}</div>
                    <div class="contact-phone">${contact.phone}</div>
                    ${contact.email ? `<div class="contact-email">${contact.email}</div>` : ''}
                </div>
                <button class="contact-action" onclick="viewContactDetail(${contact.id})">
                    <span class="material-icons-round">chevron_right</span>
                </button>
            </div>
        `;
    }).join('');
}

function viewContactDetail(contactId) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    const detailHtml = `
        <div style="padding: 20px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div class="contact-avatar" style="width: 80px; height: 80px; font-size: 32px; margin: 0 auto 16px;">
                    ${contact.firstName[0]}${contact.lastName[0]}
                </div>
                <h2 style="font-size: 24px; font-weight: 600; margin-bottom: 4px;">
                    ${contact.firstName} ${contact.lastName}
                </h2>
                <p style="color: var(--text-medium);">${contact.type || 'Contact'}</p>
            </div>
            
            <div class="detail-section">
                <h3>Contact Information</h3>
                <div class="detail-field">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${contact.phone}</span>
                </div>
                ${contact.email ? `
                <div class="detail-field">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${contact.email}</span>
                </div>
                ` : ''}
                ${contact.dateOfBirth ? `
                <div class="detail-field">
                    <span class="detail-label">Date of Birth</span>
                    <span class="detail-value">${formatDate(contact.dateOfBirth)}</span>
                </div>
                ` : ''}
                ${contact.gender ? `
                <div class="detail-field">
                    <span class="detail-label">Gender</span>
                    <span class="detail-value">${contact.gender}</span>
                </div>
                ` : ''}
            </div>
            
            ${contact.address ? `
            <div class="detail-section">
                <h3>Address</h3>
                <div class="detail-field">
                    <span class="detail-label">Address</span>
                    <span class="detail-value">
                        ${contact.address.line1}<br>
                        ${contact.address.line2 ? contact.address.line2 + '<br>' : ''}
                        ${contact.address.line3 ? contact.address.line3 + '<br>' : ''}
                        ${contact.address.town}<br>
                        ${contact.address.postcode}
                    </span>
                </div>
            </div>
            ` : ''}
            
            ${contact.notes ? `
            <div class="detail-section">
                <h3>Notes</h3>
                <p style="padding: 12px 0; color: var(--text-medium); font-size: 14px; line-height: 1.6;">
                    ${contact.notes}
                </p>
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 12px; margin-top: 24px;">
                <button class="btn-primary" onclick="callContact('${contact.phone}')" style="flex: 1;">
                    <span class="material-icons-round" style="font-size: 20px;">call</span>
                    Call
                </button>
                <button class="btn-outline" onclick="editContact(${contact.id})" style="flex: 1;">
                    <span class="material-icons-round" style="font-size: 20px;">edit</span>
                    Edit
                </button>
                <button class="btn-outline" onclick="deleteContact(${contact.id})" style="flex: 1; border-color: var(--card-cancelled-text); color: var(--card-cancelled-text);">
                    <span class="material-icons-round" style="font-size: 20px; color: var(--card-cancelled-text);">delete</span>
                    Delete
                </button>
            </div>
        </div>
    `;
    
    // Create a modal overlay
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <button class="header-btn" onclick="this.closest('.modal-overlay').remove()">
                    <span class="material-icons-round">close</span>
                </button>
                <h1 class="page-title">Contact Details</h1>
                <div style="width: 44px;"></div>
            </div>
            <div class="modal-body">
                ${detailHtml}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
}

function callContact(phone) {
    alert(`Calling ${phone}...`);
    // In a real app, this would initiate a phone call
}

function editContact(contactId) {
    alert('Edit contact functionality - Coming soon!');
}

function deleteContact(contactId) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    state.contacts = state.contacts.filter(c => c.id !== contactId);
    saveState();
    
    // Close modal and refresh list
    document.querySelector('.modal-overlay')?.remove();
    renderContactsList();
    alert('Contact deleted successfully');
}

// Setup contact search
function setupContactSearch() {
    const searchInput = document.getElementById('contacts-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderContactsList(e.target.value);
        });
    }
}

// Add contact button handler
function setupAddContact() {
    const addBtn = document.getElementById('btn-add-contact');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            alert('Add contact functionality - Coming soon!');
        });
    }
}

// Load Sample Data
function loadSampleData() {
    state.incidents = [
        {
            id: 'CAD1234',
            shcad: 'SH-CAD 1234',
            title: 'Suspicious Activity',
            type: 'Suspicious Activity',
            description: 'Unknown individual seen taking photos of houses on Elm Street.',
            status: 'pending',
            address: '123 Elm Street, Stamford Hill',
            postcode: 'N16 5AA',
            location: { lat: 51.5631, lng: -0.0737 },
            caller: {
                name: 'David Cohen',
                phone: '+44 7911 111111',
                isVictim: false,
                isWitness: true
            },
            victims: [],
            witnesses: [],
            suspects: [],
            assignedUsers: [],
            invitedUsers: ['Sarah Levy'],
            notes: [],
            followUp: '',
            policeInfo: {
                cadRef: '',
                crisRef: '',
                chsRef: '',
                cadDate: null,
                crisDate: null,
                chsDate: null
            },
            arrestInfo: {
                arrestMade: false,
                arrestCount: 0,
                description: ''
            },
            grade: null,
            images: [],
            videos: [],
            history: [
                { action: 'Created', user: 'Yehuda Filip', timestamp: new Date(Date.now() - 3600000).toISOString() }
            ],
            createdBy: 'Yehuda Filip',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
            id: 'CAD1235',
            shcad: 'SH-CAD 1235',
            title: 'Vehicle Break-in',
            type: 'Theft',
            description: 'Car window smashed, items taken from vehicle. Black BMW parked on street.',
            status: 'started',
            address: '45 Oak Lane, Stamford Hill',
            postcode: 'N16 6BB',
            location: { lat: 51.5645, lng: -0.0725 },
            caller: {
                name: 'Sarah Levy',
                phone: '+44 7911 222222',
                isVictim: true,
                isWitness: false
            },
            victims: [
                { name: 'Sarah Levy', phone: '+44 7911 222222', email: 'sarah@example.com' }
            ],
            witnesses: [],
            suspects: [
                { name: 'Unknown Male', description: 'White male, 30s, dark hoodie, seen fleeing scene' }
            ],
            assignedUsers: ['Yehuda Filip', 'Michael Green'],
            invitedUsers: [],
            notes: [
                { id: 1, text: 'Called owner to confirm details', createdBy: 'Yehuda Filip', createdAt: new Date(Date.now() - 7000000).toISOString() }
            ],
            followUp: 'Need to check CCTV footage from nearby properties',
            policeInfo: {
                cadRef: 'CAD12345',
                crisRef: '',
                chsRef: '',
                cadDate: new Date(Date.now() - 7200000).toISOString(),
                crisDate: null,
                chsDate: null
            },
            arrestInfo: {
                arrestMade: false,
                arrestCount: 0,
                description: ''
            },
            grade: 'I',
            images: [],
            videos: [],
            history: [
                { action: 'Created', user: 'Sarah Levy', timestamp: new Date(Date.now() - 7200000).toISOString() },
                { action: 'Started', user: 'Yehuda Filip', timestamp: new Date(Date.now() - 7100000).toISOString() }
            ],
            createdBy: 'Sarah Levy',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            updatedAt: new Date(Date.now() - 7100000).toISOString()
        },
        {
            id: 'CAD1236',
            shcad: 'SH-CAD 1236',
            title: 'Noise Disturbance',
            type: 'Other',
            description: 'Loud music from neighboring property disturbing residents.',
            status: 'started',
            address: '78 Pine Road, Stamford Hill',
            postcode: 'N16 7CC',
            location: { lat: 51.5650, lng: -0.0745 },
            caller: {
                name: 'Michael Green',
                phone: '+44 7911 333333',
                isVictim: false,
                isWitness: true
            },
            victims: [],
            witnesses: [],
            suspects: [],
            assignedUsers: ['Benjamin Wolf'],
            invitedUsers: [],
            notes: [],
            followUp: '',
            policeInfo: {
                cadRef: '',
                crisRef: '',
                chsRef: '',
                cadDate: null,
                crisDate: null,
                chsDate: null
            },
            arrestInfo: {
                arrestMade: false,
                arrestCount: 0,
                description: ''
            },
            grade: null,
            images: [],
            videos: [],
            history: [
                { action: 'Created', user: 'Michael Green', timestamp: new Date(Date.now() - 10800000).toISOString() },
                { action: 'Started', user: 'Benjamin Wolf', timestamp: new Date(Date.now() - 10700000).toISOString() }
            ],
            createdBy: 'Michael Green',
            createdAt: new Date(Date.now() - 10800000).toISOString(),
            updatedAt: new Date(Date.now() - 10700000).toISOString()
        }
    ];
    
    state.contacts = [
        { 
            id: 1, 
            firstName: 'David', 
            lastName: 'Cohen', 
            phone: '+44 7911 111111',
            email: 'david.cohen@example.com',
            address: {
                line1: '10 High Street',
                line2: '',
                line3: '',
                town: 'London',
                postcode: 'N16 5AA',
                country: 'United Kingdom'
            },
            dateOfBirth: '1985-03-15',
            gender: 'Male',
            type: 'Community Member',
            notes: 'Regular volunteer',
            createdAt: new Date(Date.now() - 30000000).toISOString()
        },
        { 
            id: 2, 
            firstName: 'Sarah', 
            lastName: 'Levy', 
            phone: '+44 7911 222222',
            email: 'sarah.levy@example.com',
            address: {
                line1: '45 Oak Lane',
                line2: '',
                line3: '',
                town: 'London',
                postcode: 'N16 6BB',
                country: 'United Kingdom'
            },
            dateOfBirth: '1990-07-22',
            gender: 'Female',
            type: 'Resident',
            notes: '',
            createdAt: new Date(Date.now() - 25000000).toISOString()
        },
        { 
            id: 3, 
            firstName: 'Michael', 
            lastName: 'Green', 
            phone: '+44 7911 333333',
            email: 'michael.green@example.com',
            address: {
                line1: '78 Pine Road',
                line2: '',
                line3: '',
                town: 'London',
                postcode: 'N16 7CC',
                country: 'United Kingdom'
            },
            dateOfBirth: '1982-11-08',
            gender: 'Male',
            type: 'Business Owner',
            notes: 'Owns local shop',
            createdAt: new Date(Date.now() - 20000000).toISOString()
        },
        { 
            id: 4, 
            firstName: 'Rachel', 
            lastName: 'Katz', 
            phone: '+44 7911 444444',
            email: 'rachel.katz@example.com',
            address: {
                line1: '23 Elm Avenue',
                line2: '',
                line3: '',
                town: 'London',
                postcode: 'N16 8DD',
                country: 'United Kingdom'
            },
            dateOfBirth: '1988-05-30',
            gender: 'Female',
            type: 'Community Leader',
            notes: 'Synagogue coordinator',
            createdAt: new Date(Date.now() - 15000000).toISOString()
        },
        { 
            id: 5, 
            firstName: 'Benjamin', 
            lastName: 'Wolf', 
            phone: '+44 7911 555555',
            email: 'benjamin.wolf@example.com',
            address: {
                line1: '67 Maple Street',
                line2: '',
                line3: '',
                town: 'London',
                postcode: 'N16 9EE',
                country: 'United Kingdom'
            },
            dateOfBirth: '1975-12-14',
            gender: 'Male',
            type: 'Security Personnel',
            notes: 'Experienced patrol member',
            createdAt: new Date(Date.now() - 10000000).toISOString()
        }
    ];
    
    state.users = [
        { id: 1, name: 'Yehuda Filip', callsign: 'S36', status: 'available', role: 'Dispatcher' },
        { id: 2, name: 'David Cohen', callsign: 'S12', status: 'available', role: 'User' },
        { id: 3, name: 'Sarah Levy', callsign: 'S24', status: 'busy', role: 'User' },
        { id: 4, name: 'Michael Green', callsign: 'S18', status: 'available', role: 'Supervisor' },
        { id: 5, name: 'Benjamin Wolf', callsign: 'S45', status: 'available', role: 'User' },
        { id: 6, name: 'Rachel Katz', callsign: 'S33', status: 'off-duty', role: 'Supervisor' }
    ];
    
    state.notifications = [
        {
            id: 1,
            type: 'incident_assigned',
            title: 'New Incident Request',
            message: 'You have been assigned to incident #1234',
            incidentId: 'CAD1234',
            read: false,
            createdAt: new Date(Date.now() - 120000).toISOString()
        },
        {
            id: 2,
            type: 'invitation_pending',
            title: 'Invitation Pending',
            message: 'David K. invited you to incident #1235',
            incidentId: 'CAD1235',
            read: false,
            createdAt: new Date(Date.now() - 900000).toISOString()
        },
        {
            id: 3,
            type: 'incident_completed',
            title: 'Incident Completed',
            message: 'Incident #1230 has been marked as completed',
            incidentId: 'CAD1230',
            read: true,
            createdAt: new Date(Date.now() - 3600000).toISOString()
        }
    ];
    
    // Load from localStorage if available
    const savedIncidents = localStorage.getItem('shomrim_incidents');
    const savedContacts = localStorage.getItem('shomrim_contacts');
    const savedNotifications = localStorage.getItem('shomrim_notifications');
    
    if (savedIncidents) {
        try {
            state.incidents = JSON.parse(savedIncidents);
        } catch (e) {
            console.error('Error loading incidents:', e);
        }
    }
    
    if (savedContacts) {
        try {
            state.contacts = JSON.parse(savedContacts);
        } catch (e) {
            console.error('Error loading contacts:', e);
        }
    }
    
    if (savedNotifications) {
        try {
            state.notifications = JSON.parse(savedNotifications);
        } catch (e) {
            console.error('Error loading notifications:', e);
        }
    }
    
    // Update counts based on incidents
    updateCountsFromIncidents();
    
    // Save to localStorage
    saveState();
}

// Utility Functions
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateIncidentId() {
    return `CAD${Date.now().toString().slice(-6)}`;
}

function generateShcad(id) {
    return `SH-CAD ${id.replace('CAD', '')}`;
}

// State Management
function saveState() {
    try {
        localStorage.setItem('shomrim_incidents', JSON.stringify(state.incidents));
        localStorage.setItem('shomrim_contacts', JSON.stringify(state.contacts));
        localStorage.setItem('shomrim_notifications', JSON.stringify(state.notifications));
        localStorage.setItem('shomrim_user', JSON.stringify(state.user));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

function updateCountsFromIncidents() {
    // Reset counts
    state.counts = {
        onair: 0,
        invitation: 0,
        pending: 0,
        started: 0,
        completed: 0,
        cancelled: 0
    };
    
    // Count incidents by status
    state.incidents.forEach(incident => {
        if (incident.status === 'onair') state.counts.onair++;
        else if (incident.status === 'pending' || incident.status === 'created') state.counts.pending++;
        else if (incident.status === 'started' || incident.status === 'assigned') state.counts.started++;
        else if (incident.status === 'completed') state.counts.completed++;
        else if (incident.status === 'cancelled') state.counts.cancelled++;
    });
    
    // Count invitations (incidents where current user is invited but not assigned)
    state.incidents.forEach(incident => {
        if (incident.invitedUsers && incident.invitedUsers.includes(state.user.name)) {
            if (!incident.assignedUsers || !incident.assignedUsers.includes(state.user.name)) {
                state.counts.invitation++;
            }
        }
    });
    
    // Update notification count
    state.notificationCount = state.notifications.filter(n => !n.read).length;
}

function addIncidentHistory(incidentId, action, user = null) {
    const incident = state.incidents.find(i => i.id === incidentId);
    if (!incident) return;
    
    if (!incident.history) incident.history = [];
    
    incident.history.push({
        action,
        user: user || state.user.name,
        timestamp: new Date().toISOString()
    });
    
    incident.updatedAt = new Date().toISOString();
    saveState();
}

function addNotification(type, title, message, incidentId = null) {
    const notification = {
        id: Date.now(),
        type,
        title,
        message,
        incidentId,
        read: false,
        createdAt: new Date().toISOString()
    };
    
    state.notifications.unshift(notification);
    state.notificationCount++;
    updateNotificationBadge();
    renderNotificationsList();
    saveState();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-count');
    if (state.notificationCount > 0) {
        badge.textContent = state.notificationCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotificationsList() {
    const container = document.getElementById('notifications-list');
    
    if (state.notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-icons-round">notifications_off</span>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.notifications.map(notif => `
        <div class="notification-item ${notif.read ? '' : 'unread'}" data-id="${notif.id}">
            <div class="notification-icon">
                <span class="material-icons-round">${getNotificationIcon(notif.type)}</span>
            </div>
            <div class="notification-content">
                <p class="notification-title">${notif.title}</p>
                <p class="notification-message">${notif.message}</p>
                <span class="notification-time">${formatTime(notif.createdAt)}</span>
            </div>
        </div>
    `).join('');
    
    // Add click handlers
    container.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const notif = state.notifications.find(n => n.id === parseInt(item.dataset.id));
            if (notif) {
                notif.read = true;
                if (!item.classList.contains('read')) {
                    state.notificationCount = Math.max(0, state.notificationCount - 1);
                    updateNotificationBadge();
                }
                item.classList.remove('unread');
                
                if (notif.incidentId) {
                    showIncidentDetail(notif.incidentId);
                    toggleNotifications();
                }
                saveState();
            }
        });
    });
}

function getNotificationIcon(type) {
    const icons = {
        'incident_assigned': 'assignment',
        'incident_created': 'add_circle',
        'incident_started': 'play_arrow',
        'incident_completed': 'check_circle',
        'incident_cancelled': 'cancel',
        'invitation_pending': 'person_add',
        'invitation_accepted': 'how_to_reg',
        'invitation_declined': 'person_remove',
        'user_assigned': 'group_add',
        'note_added': 'note_add',
        'update': 'update'
    };
    return icons[type] || 'notifications';
}

// ========== ADMIN FUNCTIONS ==========

function isAdmin() {
    return state.user.role === 'Admin' || state.user.role === 'Dispatcher' || state.user.role === 'Coordinator';
}

function showAdminPanel() {
    if (!isAdmin()) {
        alert('Access denied. Admin privileges required.');
        return;
    }
    
    // Update statistics
    updateAdminStats();
    showScreen('admin-screen');
}

function updateAdminStats() {
    // Total incidents
    document.getElementById('admin-total-incidents').textContent = state.incidents.length;
    
    // Active incidents (pending, started, onair)
    const activeIncidents = state.incidents.filter(i => 
        i.status === 'pending' || i.status === 'started' || i.status === 'onair'
    ).length;
    document.getElementById('admin-active-incidents').textContent = activeIncidents;
    
    // Total contacts
    document.getElementById('admin-total-contacts').textContent = state.contacts.length;
    
    // Total users (placeholder - would need API call for real count)
    document.getElementById('admin-total-users').textContent = state.users.length || 1;
}

function showAllUsers() {
    const userList = `
        <div style="padding: 20px;">
            <h2 style="margin-bottom: 20px;">All Users</h2>
            <div style="background: white; border-radius: 12px; overflow: hidden;">
                ${state.users.length === 0 ? '<p style="padding: 20px; text-align: center; color: #999;">No users found</p>' : 
                    state.users.map((user, idx) => `
                        <div style="padding: 16px; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600;">${user}</div>
                                <div style="font-size: 12px; color: #999;">Member</div>
                            </div>
                            <select onchange="updateUserRole('${user}', this.value)" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px;">
                                <option>Member</option>
                                <option>Dispatcher</option>
                                <option>Coordinator</option>
                                <option>Admin</option>
                            </select>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    document.querySelector('#admin-screen .admin-content').innerHTML = userList;
}

function showUserRoles() {
    alert(`Role Management\n\nRoles and their permissions:\n\n• Admin - Full system access\n• Coordinator - Manage incidents & users\n• Dispatcher - Create & assign incidents\n• Member - View & report incidents`);
}

function showAllIncidents() {
    renderIncidentsList(null);
    showScreen('incidents-screen');
    toggleDrawer();
}

function exportIncidents() {
    if (state.incidents.length === 0) {
        alert('No incidents to export');
        return;
    }
    
    // Create CSV
    const headers = ['ID', 'SH-CAD', 'Title', 'Type', 'Status', 'Address', 'Created At', 'Created By'];
    const rows = state.incidents.map(inc => [
        inc.id,
        inc.shcad,
        inc.title,
        inc.type,
        inc.status,
        inc.address || '',
        new Date(inc.createdAt).toLocaleString(),
        inc.createdBy
    ]);
    
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shomrim-incidents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('✅ Incidents exported successfully!');
}

function viewDatabaseStats() {
    const stats = `Database Statistics\n\n📊 Total Records:\n• Incidents: ${state.incidents.length}\n• Contacts: ${state.contacts.length}\n• Users: ${state.users.length || 1}\n• Notifications: ${state.notifications.length}\n\n📈 Incident Breakdown:\n• On Air: ${state.counts.onair}\n• Started: ${state.counts.started}\n• Pending: ${state.counts.pending}\n• Completed: ${state.counts.completed}\n• Cancelled: ${state.counts.cancelled}\n\n💾 Storage: LocalStorage + SQLite Database`;
    
    alert(stats);
}

function viewActivityLog() {
    const recentHistory = state.incidents
        .flatMap(inc => inc.history || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
    
    const logHtml = `
        <div style="padding: 20px;">
            <h2 style="margin-bottom: 20px;">Recent Activity</h2>
            <div style="background: white; border-radius: 12px; overflow: hidden;">
                ${recentHistory.length === 0 ? '<p style="padding: 20px; text-align: center; color: #999;">No activity found</p>' :
                    recentHistory.map(h => `
                        <div style="padding: 16px; border-bottom: 1px solid #f5f5f5;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${h.action}</div>
                            <div style="font-size: 12px; color: #999;">
                                ${h.user} • ${formatTime(h.timestamp)}
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    document.querySelector('#admin-screen .admin-content').innerHTML = logHtml;
}

function backupDatabase() {
    const backup = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: {
            incidents: state.incidents,
            contacts: state.contacts,
            users: state.users,
            notifications: state.notifications
        }
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shomrim-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('✅ Database backup created successfully!');
}

function updateUserRole(userName, newRole) {
    alert(`Updated ${userName}'s role to ${newRole}`);
    // In production, this would call an API
}
// ===== ON DUTY / ON PATROL FUNCTIONS =====

async function toggleDutyStatus() {
    const toggle = document.getElementById('duty-toggle');
    const statusText = document.getElementById('duty-status-text');
    const phone = state.currentUser.phone;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${phone}/duty-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ on_duty: toggle.checked })
        });
        
        if (response.ok) {
            statusText.textContent = toggle.checked ? 'Currently On Duty' : 'Currently Off Duty';
            state.currentUser.on_duty = toggle.checked;
            await refreshOnDuty();
        }
    } catch (error) {
        console.error('Error updating duty status:', error);
        alert('Failed to update duty status');
        toggle.checked = !toggle.checked;
    }
}

async function togglePatrolStatus() {
    const toggle = document.getElementById('patrol-toggle');
    const statusText = document.getElementById('patrol-status-text');
    const phone = state.currentUser.phone;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/${phone}/patrol-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ on_patrol: toggle.checked })
        });
        
        if (response.ok) {
            statusText.textContent = toggle.checked ? 'Currently On Patrol' : 'Currently Not On Patrol';
            state.currentUser.on_patrol = toggle.checked;
            await refreshOnPatrol();
        }
    } catch (error) {
        console.error('Error updating patrol status:', error);
        alert('Failed to update patrol status');
        toggle.checked = !toggle.checked;
    }
}

async function refreshOnDuty() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/on-duty`);
        const users = await response.json();
        
        const listHtml = users.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No one is currently on duty</div>' :
            users.map(user => `
                <div class="user-item" style="padding: 16px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${user.name || 'Unknown'}</div>
                        <div style="font-size: 13px; color: #666;">
                            ${user.callsign || 'No callsign'} • ${user.role || 'Member'}
                        </div>
                    </div>
                    <span class="material-icons-round" style="color: #4caf50;">check_circle</span>
                </div>
            `).join('');
        
        document.getElementById('on-duty-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading on-duty users:', error);
    }
}

async function refreshOnPatrol() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/on-patrol`);
        const users = await response.json();
        
        const listHtml = users.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No one is currently on patrol</div>' :
            users.map(user => `
                <div class="user-item" style="padding: 16px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${user.name || 'Unknown'}</div>
                        <div style="font-size: 13px; color: #666;">
                            ${user.callsign || 'No callsign'} • ${user.role || 'Member'}
                        </div>
                    </div>
                    <span class="material-icons-round" style="color: #2196F3;">directions_car</span>
                </div>
            `).join('');
        
        document.getElementById('on-patrol-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading on-patrol users:', error);
    }
}

async function refreshDispatchers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/by-role/Dispatcher`);
        const users = await response.json();
        
        const listHtml = users.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No dispatchers found</div>' :
            users.map(user => `
                <div class="user-item" style="padding: 16px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${user.name || 'Unknown'}</div>
                        <div style="font-size: 13px; color: #666;">
                            ${user.callsign || 'No callsign'} • ${user.email || ''}
                        </div>
                        <div style="font-size: 13px; color: #2196F3; margin-top: 4px;">
                            ${user.on_duty ? '🟢 On Duty' : ''} ${user.on_patrol ? '🚗 On Patrol' : ''}
                        </div>
                    </div>
                    <a href="tel:${user.phone}" class="icon-btn">
                        <span class="material-icons-round">phone</span>
                    </a>
                </div>
            `).join('');
        
        document.getElementById('dispatcher-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading dispatchers:', error);
    }
}

async function refreshSupervisors() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/by-role/Coordinator`);
        const users = await response.json();
        
        const listHtml = users.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No supervisors found</div>' :
            users.map(user => `
                <div class="user-item" style="padding: 16px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${user.name || 'Unknown'}</div>
                        <div style="font-size: 13px; color: #666;">
                            ${user.callsign || 'No callsign'} • ${user.email || ''}
                        </div>
                        <div style="font-size: 13px; color: #2196F3; margin-top: 4px;">
                            ${user.on_duty ? '🟢 On Duty' : ''} ${user.on_patrol ? '🚗 On Patrol' : ''}
                        </div>
                    </div>
                    <a href="tel:${user.phone}" class="icon-btn">
                        <span class="material-icons-round">phone</span>
                    </a>
                </div>
            `).join('');
        
        document.getElementById('supervisors-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading supervisors:', error);
    }
}

async function refreshResponders() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/by-role/Member`);
        const users = await response.json();
        
        const listHtml = users.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No responders found</div>' :
            users.map(user => `
                <div class="user-item" style="padding: 16px; border-bottom: 1px solid #f5f5f5; display: flex; align-items: center; gap: 12px;">
                    <div class="avatar" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                        ${user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${user.name || 'Unknown'}</div>
                        <div style="font-size: 13px; color: #666;">
                            ${user.callsign || 'No callsign'} • ${user.email || ''}
                        </div>
                        <div style="font-size: 13px; color: #2196F3; margin-top: 4px;">
                            ${user.on_duty ? '🟢 On Duty' : ''} ${user.on_patrol ? '🚗 On Patrol' : ''}
                        </div>
                    </div>
                    <a href="tel:${user.phone}" class="icon-btn">
                        <span class="material-icons-round">phone</span>
                    </a>
                </div>
            `).join('');
        
        document.getElementById('responders-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading responders:', error);
    }
}

// ===== SUSPECT MANAGEMENT =====

async function loadSuspects() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/suspects`);
        const suspects = await response.json();
        state.suspects = suspects;
        
        const listHtml = suspects.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No suspects in database</div>' :
            suspects.map(suspect => `
                <div class="suspect-item" onclick="viewSuspect(${suspect.id})" style="padding: 16px; border-bottom: 1px solid #f5f5f5; cursor: pointer;">
                    <div style="display: flex; gap: 12px;">
                        <div style="width: 60px; height: 60px; border-radius: 8px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                            ${suspect.photo ? `<img src="${suspect.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` : '👤'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${suspect.name}</div>
                            ${suspect.alias ? `<div style="font-size: 13px; color: #666; margin-bottom: 4px;">aka ${suspect.alias}</div>` : ''}
                            ${suspect.physical_description ? `<div style="font-size: 13px; color: #999;">${suspect.physical_description}</div>` : ''}
                        </div>
                        <span class="material-icons-round" style="color: #999;">chevron_right</span>
                    </div>
                </div>
            `).join('');
        
        document.getElementById('suspect-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading suspects:', error);
    }
}

function showAddSuspect() {
    // In production, this would show a form modal
    const name = prompt('Enter suspect name:');
    if (name) {
        createSuspect({ name, created_by: state.currentUser.phone });
    }
}

async function createSuspect(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/suspects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadSuspects();
            alert('✅ Suspect added successfully');
        }
    } catch (error) {
        console.error('Error creating suspect:', error);
        alert('Failed to create suspect');
    }
}

function viewSuspect(id) {
    const suspect = state.suspects.find(s => s.id === id);
    if (suspect) {
        alert(`Suspect: ${suspect.name}\n${suspect.alias ? 'Alias: ' + suspect.alias + '\n' : ''}${suspect.physical_description || ''}`);
        // In production, this would show a detailed view modal
    }
}

// ===== VEHICLE MANAGEMENT =====

async function loadVehicles() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/vehicles`);
        const vehicles = await response.json();
        state.vehicles = vehicles;
        
        const listHtml = vehicles.length === 0 ? 
            '<div style="padding: 40px; text-align: center; color: #999;">No vehicles in database</div>' :
            vehicles.map(vehicle => `
                <div class="vehicle-item" onclick="viewVehicle(${vehicle.id})" style="padding: 16px; border-bottom: 1px solid #f5f5f5; cursor: pointer;">
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="width: 60px; height: 60px; border-radius: 8px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                            ${vehicle.photo ? `<img src="${vehicle.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` : '🚗'}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">${vehicle.registration}</div>
                            <div style="font-size: 13px; color: #666; margin-bottom: 4px;">
                                ${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year ? '(' + vehicle.year + ')' : ''}
                            </div>
                            ${vehicle.color ? `<div style="font-size: 13px; color: #999;">Color: ${vehicle.color}</div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="padding: 4px 8px; border-radius: 12px; font-size: 11px; background: ${vehicle.status === 'active' ? '#e8f5e9' : '#ffebee'}; color: ${vehicle.status === 'active' ? '#4caf50' : '#f44336'}; font-weight: 600;">
                                ${vehicle.status || 'active'}
                            </div>
                        </div>
                        <span class="material-icons-round" style="color: #999;">chevron_right</span>
                    </div>
                </div>
            `).join('');
        
        document.getElementById('vehicle-list').innerHTML = listHtml;
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

function showAddVehicle() {
    // In production, this would show a form modal
    const registration = prompt('Enter vehicle registration:');
    if (registration) {
        createVehicle({ registration, created_by: state.currentUser.phone });
    }
}

async function createVehicle(data) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/vehicles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            await loadVehicles();
            alert('✅ Vehicle added successfully');
        }
    } catch (error) {
        console.error('Error creating vehicle:', error);
        alert('Failed to create vehicle');
    }
}

function viewVehicle(id) {
    const vehicle = state.vehicles.find(v => v.id === id);
    if (vehicle) {
        alert(`Vehicle: ${vehicle.registration}\n${vehicle.make || ''} ${vehicle.model || ''}\n${vehicle.color ? 'Color: ' + vehicle.color : ''}`);
        // In production, this would show a detailed view modal
    }
}

// ===== INCIDENT FORM HELPERS =====

let tempVictims = [];
let tempWitnesses = [];
let tempSuspects = [];
let tempAssignedUsers = [];

function toggleCallerSection() {
    const section = document.getElementById('caller-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function toggleVehicleSection() {
    const section = document.getElementById('vehicle-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function togglePoliceSection() {
    const section = document.getElementById('police-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function addVictim() {
    const name = prompt('Enter victim name (minimum 2 characters):');
    if (!name || name.trim().length < 2) {
        if (name !== null) {
            alert('Victim name must be at least 2 characters');
        }
        return;
    }
    const phone = prompt('Enter victim phone (optional, or press Cancel to skip):');
    const victim = { 
        name: name.trim(), 
        phone: phone ? phone.trim() : '', 
        address: '', 
        description: '' 
    };
    tempVictims.push(victim);
    renderVictimsList();
    alert('✅ Victim added successfully');
}

function renderVictimsList() {
    const list = document.getElementById('victims-list');
    list.innerHTML = tempVictims.map((v, index) => `
        <div class="participant-item">
            <div class="info">
                <div class="name">${v.name}</div>
                <div class="details">${v.phone || 'No phone'}</div>
            </div>
            <button class="btn-remove" onclick="removeVictim(${index})">Remove</button>
        </div>
    `).join('');
}

function removeVictim(index) {
    tempVictims.splice(index, 1);
    renderVictimsList();
}

function addWitness() {
    const name = prompt('Enter witness name (minimum 2 characters):');
    if (!name || name.trim().length < 2) {
        if (name !== null) {
            alert('Witness name must be at least 2 characters');
        }
        return;
    }
    const phone = prompt('Enter witness phone (optional, or press Cancel to skip):');
    const witness = { 
        name: name.trim(), 
        phone: phone ? phone.trim() : '', 
        address: '', 
        description: '' 
    };
    tempWitnesses.push(witness);
    renderWitnessesList();
    alert('✅ Witness added successfully');
}

function renderWitnessesList() {
    const list = document.getElementById('witnesses-list');
    list.innerHTML = tempWitnesses.map((w, index) => `
        <div class="participant-item">
            <div class="info">
                <div class="name">${w.name}</div>
                <div class="details">${w.phone || 'No phone'}</div>
            </div>
            <button class="btn-remove" onclick="removeWitness(${index})">Remove</button>
        </div>
    `).join('');
}

function removeWitness(index) {
    tempWitnesses.splice(index, 1);
    renderWitnessesList();
}

function addSuspectToIncident() {
    const name = prompt('Enter suspect name (minimum 2 characters):');
    if (!name || name.trim().length < 2) {
        if (name !== null) {
            alert('Suspect name must be at least 2 characters');
        }
        return;
    }
    const description = prompt('Enter suspect description (optional):');
    const suspect = { 
        name: name.trim(), 
        phone: '', 
        address: '', 
        description: description ? description.trim() : '' 
    };
    tempSuspects.push(suspect);
    renderSuspectsList();
    alert('✅ Suspect added successfully');
}

function renderSuspectsList() {
    const list = document.getElementById('suspects-list');
    list.innerHTML = tempSuspects.map((s, index) => `
        <div class="participant-item">
            <div class="info">
                <div class="name">${s.name}</div>
                <div class="details">${s.description || 'No description'}</div>
            </div>
            <button class="btn-remove" onclick="removeSuspect(${index})">Remove</button>
        </div>
    `).join('');
}

function removeSuspect(index) {
    tempSuspects.splice(index, 1);
    renderSuspectsList();
}

function assignUser() {
    const availableUsers = state.users.filter(u => !tempAssignedUsers.includes(u.name));
    if (availableUsers.length === 0) {
        alert('No more users available to assign');
        return;
    }
    
    const usersList = availableUsers.map(u => `${u.name} (${u.callsign})`).join('\n');
    const name = prompt(`Available Users:\n\n${usersList}\n\nEnter user name to assign:`);
    
    if (!name || name.trim().length < 2) {
        if (name !== null) {
            alert('User name must be at least 2 characters');
        }
        return;
    }
    
    const user = availableUsers.find(u => 
        u.name.toLowerCase().includes(name.toLowerCase().trim())
    );
    
    if (!user) {
        alert('User not found. Please enter a valid user name from the list.');
        return;
    }
    
    tempAssignedUsers.push(user.name);
    renderAssignedUsersList();
    alert(`✅ ${user.name} assigned successfully`);
}

function renderAssignedUsersList() {
    const list = document.getElementById('assigned-users-list');
    list.innerHTML = tempAssignedUsers.map((user, index) => `
        <div class="participant-item">
            <div class="info">
                <div class="name">${user}</div>
            </div>
            <button class="btn-remove" onclick="removeAssignedUser(${index})">Remove</button>
        </div>
    `).join('');
}

function removeAssignedUser(index) {
    tempAssignedUsers.splice(index, 1);
    renderAssignedUsersList();
}


// ===== DATABASE SYNC HELPERS =====

async function updateIncidentInDatabase(incident) {
    try {
        const response = await fetch(`{API_BASE_URL}/api/incidents/{incident.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incident)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update incident in database');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Database update error:', error);
        throw error;
    }
}

async function loadIncidentFromDatabase(incidentId) {
    try {
        const response = await fetch(`{API_BASE_URL}/api/incidents/{incidentId}`);
        if (!response.ok) throw new Error('Failed to load incident');
        return await response.json();
    } catch (error) {
        console.error('Error loading incident:', error);
        return null;
    }
}

// Show professional loading indicator
function showLoading(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    overlay.innerHTML = `
        <div style=\""background: white; padding: 30px 40px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);\"">
            <div style=\""width: 40px; height: 40px; border: 4px solid #e3f2fd; border-top-color: #1E88E5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;\""></div>
            <div style=\""font-size: 16px; font-weight: 500; color: #333;\"">{message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Add spin animation if not already added
    if (!document.getElementById('spin-style')) {
        const style = document.createElement('style');
        style.id = 'spin-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}

// Validate phone number format
function isValidPhone(phone) {
    return phone && /^[+\d\s()-]{10,}$/.test(phone.trim());
}

// Validate email format
function isValidEmail(email) {
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Format phone number for display
function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('44')) {
        return '+44 ' + cleaned.substring(2, 6) + ' ' + cleaned.substring(6);
    }
    return phone;
}
