/* ==========================================================================
   SpendSmart - Personal Finance Dashboard
   JavaScript Application Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- LocalStorage Storage Keys ---
  const USERS_STORAGE_KEY = 'spendsmart_registered_users';
  const ACTIVE_USER_STORAGE_KEY = 'spendsmart_active_session';

  // Active App State & User Session
  let currentUser = loadActiveUserSession();
  let appState = loadUserLedger(currentUser ? currentUser.id : null);

  // Chart Instances
  let incomeExpenseChartInstance = null;
  let categoryChartInstance = null;

  // Temporary container for SMS Parsed result
  let currentParsedSMSData = null;

  // --- Auth & User Session Functions ---
  function getRegisteredUsers() {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveRegisteredUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  function loadActiveUserSession() {
    try {
      const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function setActiveUserSession(user) {
    currentUser = user;
    if (user) {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    }
  }

  // --- User-Isolated Clean Financial Ledger ---
  function loadUserLedger(userId) {
    const emptyCleanLedger = {
      currency: '₹',
      monthlyBudget: 0,
      transactions: [],
      savingsGoals: []
    };

    if (!userId) return emptyCleanLedger;

    try {
      const key = `spendsmart_ledger_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load user ledger', e);
    }

    saveUserLedger(userId, emptyCleanLedger);
    return JSON.parse(JSON.stringify(emptyCleanLedger));
  }

  function saveUserLedger(userId = currentUser?.id, stateToSave = appState) {
    if (!userId) return;
    try {
      const key = `spendsmart_ledger_${userId}`;
      localStorage.setItem(key, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save user ledger', e);
    }
  }

  // --- Auth UI Management ---
  const authOverlay = document.getElementById('auth-overlay');
  const authTabLogin = document.getElementById('auth-tab-login');
  const authTabSignup = document.getElementById('auth-tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (authTabLogin && authTabSignup) {
    authTabLogin.addEventListener('click', () => {
      authTabLogin.classList.add('active');
      authTabSignup.classList.remove('active');
      loginForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
    });

    authTabSignup.addEventListener('click', () => {
      authTabSignup.classList.add('active');
      authTabLogin.classList.remove('active');
      signupForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    });
  }

  // --- Eye Icon Password Visibility Toggles ---
  setupPasswordToggle('toggle-login-password', 'login-password');
  setupPasswordToggle('toggle-signup-password', 'signup-password');

  function setupPasswordToggle(buttonId, inputId) {
    const toggleBtn = document.getElementById(buttonId);
    const passwordInput = document.getElementById(inputId);

    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        const iconName = isPassword ? 'eye-off' : 'eye';
        toggleBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;

        if (window.lucide) {
          window.lucide.createIcons({ el: toggleBtn });
        }
      });
    }
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      const users = getRegisteredUsers();
      const match = users.find(u => u.email === email && u.password === password);

      if (match) {
        setActiveUserSession(match);
        appState = loadUserLedger(match.id);
        authOverlay.classList.remove('active');
        updateUserProfileUI();
        updateAllUI();
        showToast(`Welcome back, ${match.name}!`, 'success');
      } else {
        if (users.length === 0) {
          const demoName = email.split('@')[0];
          const newUser = { id: 'usr_' + Date.now(), name: capitalize(demoName), email, password };
          users.push(newUser);
          saveRegisteredUsers(users);
          setActiveUserSession(newUser);
          appState = loadUserLedger(newUser.id);
          authOverlay.classList.remove('active');
          updateUserProfileUI();
          updateAllUI();
          showToast(`Account created & logged in as ${newUser.name}!`, 'success');
        } else {
          showToast('Invalid email or password. Please check your credentials or click Sign Up.', 'error');
        }
      }
    });
  }

  // Handle Sign Up Submission
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim().toLowerCase();
      const password = document.getElementById('signup-password').value;

      if (!name || !email || !password) {
        showToast('Please fill in all fields.', 'error');
        return;
      }

      const users = getRegisteredUsers();
      if (users.some(u => u.email === email)) {
        showToast('An account with this email already exists. Please log in.', 'error');
        return;
      }

      const newUser = {
        id: 'usr_' + Date.now(),
        name,
        email,
        password
      };

      users.push(newUser);
      saveRegisteredUsers(users);

      setActiveUserSession(newUser);
      appState = loadUserLedger(newUser.id);

      authOverlay.classList.remove('active');
      updateUserProfileUI();
      updateAllUI();
      showToast(`Welcome to SpendSmart, ${newUser.name}!`, 'success');
    });
  }

  // Handle Log Out
  const logoutBtn = document.getElementById('logout-btn');
  const logoutHeaderBtn = document.getElementById('logout-header-btn');

  if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
  if (logoutHeaderBtn) logoutHeaderBtn.addEventListener('click', performLogout);

  function performLogout() {
    if (confirm('Are you sure you want to log out?')) {
      setActiveUserSession(null);
      appState = loadUserLedger(null);
      authOverlay.classList.add('active');
      showToast('Logged out successfully.', 'info');
    }
  }

  function updateUserProfileUI() {
    if (currentUser) {
      const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'US';
      document.getElementById('user-avatar-initials').textContent = initials;
      document.getElementById('user-display-name').textContent = currentUser.name;
      document.getElementById('user-display-email').textContent = currentUser.email;
    } else {
      document.getElementById('user-avatar-initials').textContent = '--';
      document.getElementById('user-display-name').textContent = 'Guest User';
      document.getElementById('user-display-email').textContent = 'Personal Account';
    }
  }

  // --- Check Auth Status on Page Load ---
  if (!currentUser) {
    authOverlay.classList.add('active');
  } else {
    authOverlay.classList.remove('active');
    updateUserProfileUI();
  }

  // --- Currency Formatting Helper ---
  function formatMoney(amount) {
    const symbol = appState.currency || '₹';
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  }

  // --- App View Navigation ---
  const navButtons = document.querySelectorAll('.nav-item, .mobile-nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  const pageTitleEl = document.getElementById('page-title');
  const pageSubtitleEl = document.getElementById('page-subtitle');
  const sidebarEl = document.getElementById('sidebar');
  const sidebarOverlayEl = document.getElementById('sidebar-overlay');
  const mobileToggleBtn = document.getElementById('mobile-toggle');

  const pageMeta = {
    'dashboard': {
      title: 'Dashboard',
      subtitle: 'Overview of your financial activity & analytics'
    },
    'transactions': {
      title: 'Transactions',
      subtitle: 'Filter, search, and manage all income & expenses'
    },
    'sms-import': {
      title: 'SMS Transaction Import',
      subtitle: 'Paste SMS notifications to auto-extract transaction details'
    },
    'budget': {
      title: 'Monthly Budget',
      subtitle: 'Monitor budget limits and track category spending'
    },
    'savings': {
      title: 'Savings Goals',
      subtitle: 'Track progress towards your target savings milestones'
    }
  };

  function switchView(targetViewId) {
    navButtons.forEach(btn => {
      if (btn.dataset.target === targetViewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    viewSections.forEach(section => {
      if (section.id === `view-${targetViewId}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    if (pageMeta[targetViewId]) {
      pageTitleEl.textContent = pageMeta[targetViewId].title;
      pageSubtitleEl.textContent = pageMeta[targetViewId].subtitle;
    }

    closeMobileSidebar();

    if (targetViewId === 'dashboard') {
      setTimeout(() => {
        renderCharts();
      }, 50);
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      switchView(target);
    });
  });

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('active');
      sidebarOverlayEl.classList.toggle('active');
    });
  }

  if (sidebarOverlayEl) {
    sidebarOverlayEl.addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    sidebarEl.classList.remove('active');
    sidebarOverlayEl.classList.remove('active');
  }

  // Currency Switcher Handler
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.value = appState.currency || '₹';
    currencySelect.addEventListener('change', (e) => {
      appState.currency = e.target.value;
      saveUserLedger();
      updateAllUI();
      showToast(`Currency updated to ${appState.currency}`, 'info');
    });
  }

  // --- Calculation Engine ---
  function getCalculatedMetrics() {
    let totalBalance = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    (appState.transactions || []).forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'credit') {
        totalBalance += amt;
        if (tx.date.startsWith(currentMonthKey) || isCurrentMonth(tx.date)) {
          monthlyIncome += amt;
        }
      } else if (tx.type === 'debit') {
        totalBalance -= amt;
        if (tx.date.startsWith(currentMonthKey) || isCurrentMonth(tx.date)) {
          monthlyExpense += amt;
        }
      }
    });

    const budget = Number(appState.monthlyBudget) || 0;
    const remainingBudget = budget > 0 ? budget - monthlyExpense : 0;
    const budgetPercent = budget > 0 ? Math.min(Math.round((monthlyExpense / budget) * 100), 100) : 0;
    const isWarning80 = budget > 0 && (monthlyExpense / budget) >= 0.80;

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      budget,
      remainingBudget,
      budgetPercent,
      isWarning80
    };
  }

  function isCurrentMonth(dateStr) {
    if (!dateStr) return false;
    const txDate = new Date(dateStr);
    const now = new Date();
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  }

  // --- Update All UI Widgets ---
  function updateAllUI() {
    const metrics = getCalculatedMetrics();

    // 1. Dashboard Metric Cards
    document.getElementById('dash-total-balance').textContent = formatMoney(metrics.totalBalance);
    document.getElementById('dash-monthly-income').textContent = formatMoney(metrics.monthlyIncome);
    document.getElementById('dash-monthly-expense').textContent = formatMoney(metrics.monthlyExpense);
    document.getElementById('dash-remaining-budget').textContent = formatMoney(metrics.remainingBudget);
    
    const budgetProgressFill = document.getElementById('dash-budget-progress-fill');
    if (budgetProgressFill) {
      budgetProgressFill.style.width = `${metrics.budgetPercent}%`;
      if (metrics.isWarning80) {
        budgetProgressFill.className = 'mini-progress-fill warning';
      } else {
        budgetProgressFill.className = 'mini-progress-fill';
      }
    }

    const budgetPercentText = metrics.budget > 0 ? `${metrics.budgetPercent}% of limit used` : 'No budget set';
    document.getElementById('dash-budget-percent').textContent = budgetPercentText;

    const incomeCount = (appState.transactions || []).filter(t => t.type === 'credit').length;
    const expenseCount = (appState.transactions || []).filter(t => t.type === 'debit').length;
    document.getElementById('dash-income-count').textContent = `${incomeCount} income entries`;
    document.getElementById('dash-expense-count').textContent = `${expenseCount} expense entries`;

    // 80% Warning Banner on Dashboard
    const dashWarningBanner = document.getElementById('dash-budget-warning');
    const dashWarningText = document.getElementById('dash-warning-text');
    if (metrics.isWarning80) {
      dashWarningBanner.classList.remove('hidden');
      dashWarningText.textContent = `Warning: You have spent ${metrics.budgetPercent}% of your monthly budget (${formatMoney(metrics.monthlyExpense)} spent out of ${formatMoney(metrics.budget)}).`;
    } else {
      dashWarningBanner.classList.add('hidden');
    }

    // 2. Recent Transactions Table (Dashboard)
    renderRecentDashboardTransactions();

    // 3. Transactions View Table
    renderTransactionsTable();

    // 4. Monthly Budget View
    renderMonthlyBudgetView(metrics);

    // 5. Savings Goals View
    renderSavingsGoals();

    // 6. Charts
    renderCharts();

    // Re-initialize Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- Dashboard Card Quick Action Shortcuts ---
  const cardAddIncome = document.getElementById('card-add-income');
  const cardAddExpense = document.getElementById('card-add-expense');
  const cardSetBudget = document.getElementById('card-set-budget');

  if (cardAddIncome) {
    cardAddIncome.addEventListener('click', () => openAddEditTxModal(null, 'credit'));
  }

  if (cardAddExpense) {
    cardAddExpense.addEventListener('click', () => openAddEditTxModal(null, 'debit'));
  }

  if (cardSetBudget) {
    cardSetBudget.addEventListener('click', () => {
      inputMonthlyBudget.value = appState.monthlyBudget || '';
      budgetModal.classList.add('active');
    });
  }

  // --- 1. Dashboard Recent Transactions ---
  function renderRecentDashboardTransactions() {
    const tbody = document.getElementById('dash-recent-tx-tbody');
    if (!tbody) return;

    const txs = appState.transactions || [];
    const sorted = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-4">No transactions recorded yet. Click "+ Add Transaction" to begin.</td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(tx => {
      const isDebit = tx.type === 'debit';
      const badgeClass = isDebit ? 'badge-debit' : 'badge-credit';
      const amountClass = isDebit ? 'text-danger' : 'text-success';
      const amountPrefix = isDebit ? '-' : '+';

      return `
        <tr>
          <td>
            <div class="font-semibold">${escapeHTML(tx.merchant)}</div>
            ${tx.notes ? `<div class="text-xs text-muted">${escapeHTML(tx.notes)}</div>` : ''}
          </td>
          <td><span class="category-badge">${escapeHTML(tx.category)}</span></td>
          <td><span class="text-xs text-muted">${tx.date}</span></td>
          <td><span class="${badgeClass}">${tx.type.toUpperCase()}</span></td>
          <td class="text-right font-bold ${amountClass}">
            ${amountPrefix}${formatMoney(tx.amount)}
          </td>
        </tr>
      `;
    }).join('');
  }

  const dashViewAllBtn = document.getElementById('dash-view-all-tx');
  const warningViewBudgetBtn = document.getElementById('warning-view-budget-btn');

  if (dashViewAllBtn) {
    dashViewAllBtn.addEventListener('click', () => switchView('transactions'));
  }
  if (warningViewBudgetBtn) {
    warningViewBudgetBtn.addEventListener('click', () => switchView('budget'));
  }

  // --- 2. Transactions Table & Filtering ---
  const txSearchInput = document.getElementById('tx-search');
  const txFilterType = document.getElementById('tx-filter-type');
  const txFilterCategory = document.getElementById('tx-filter-category');

  if (txSearchInput) txSearchInput.addEventListener('input', renderTransactionsTable);
  if (txFilterType) txFilterType.addEventListener('change', renderTransactionsTable);
  if (txFilterCategory) txFilterCategory.addEventListener('change', renderTransactionsTable);

  function renderTransactionsTable() {
    const tbody = document.getElementById('tx-table-tbody');
    const emptyState = document.getElementById('tx-empty-state');
    if (!tbody) return;

    const searchTerm = (txSearchInput?.value || '').toLowerCase().trim();
    const typeFilter = txFilterType?.value || 'all';
    const categoryFilter = txFilterCategory?.value || 'all';

    const txs = appState.transactions || [];
    let filtered = txs.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      if (searchTerm) {
        const merchantMatch = tx.merchant.toLowerCase().includes(searchTerm);
        const notesMatch = (tx.notes || '').toLowerCase().includes(searchTerm);
        const categoryMatch = tx.category.toLowerCase().includes(searchTerm);
        const amountMatch = tx.amount.toString().includes(searchTerm);
        if (!merchantMatch && !notesMatch && !categoryMatch && !amountMatch) return false;
      }
      return true;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    let fTotal = 0;
    let fIncome = 0;
    let fExpense = 0;

    filtered.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'credit') {
        fIncome += amt;
        fTotal += amt;
      } else {
        fExpense += amt;
        fTotal -= amt;
      }
    });

    document.getElementById('tx-summary-total').textContent = formatMoney(fTotal);
    document.getElementById('tx-summary-income').textContent = formatMoney(fIncome);
    document.getElementById('tx-summary-expense').textContent = formatMoney(fExpense);

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    tbody.innerHTML = filtered.map(tx => {
      const isDebit = tx.type === 'debit';
      const badgeClass = isDebit ? 'badge-debit' : 'badge-credit';
      const amountClass = isDebit ? 'text-danger' : 'text-success';
      const amountPrefix = isDebit ? '-' : '+';

      return `
        <tr>
          <td>
            <div class="font-semibold">${escapeHTML(tx.merchant)}</div>
            ${tx.notes ? `<div class="text-xs text-muted">${escapeHTML(tx.notes)}</div>` : ''}
          </td>
          <td><span class="category-badge">${escapeHTML(tx.category)}</span></td>
          <td><span class="text-xs text-muted">${tx.date}</span></td>
          <td><span class="${badgeClass}">${tx.type.toUpperCase()}</span></td>
          <td class="text-right font-bold ${amountClass}">
            ${amountPrefix}${formatMoney(tx.amount)}
          </td>
          <td class="text-center">
            <button class="action-btn edit-tx-btn" data-id="${tx.id}" title="Edit Transaction">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="action-btn action-btn-danger delete-tx-btn" data-id="${tx.id}" title="Delete Transaction">
              <i data-lucide="trash-2"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.edit-tx-btn').forEach(btn => {
      btn.addEventListener('click', () => openAddEditTxModal(btn.dataset.id));
    });

    tbody.querySelectorAll('.delete-tx-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
    });
  }

  // Transaction Modal Logic
  const txModal = document.getElementById('tx-modal');
  const openAddTxBtn = document.getElementById('open-add-tx-btn');
  const sidebarAddBtn = document.getElementById('sidebar-add-btn');
  const txModalClose = document.getElementById('tx-modal-close');
  const txModalCancel = document.getElementById('tx-modal-cancel');
  const txForm = document.getElementById('tx-form');

  if (openAddTxBtn) openAddTxBtn.addEventListener('click', () => openAddEditTxModal());
  if (sidebarAddBtn) sidebarAddBtn.addEventListener('click', () => openAddEditTxModal());
  if (txModalClose) txModalClose.addEventListener('click', closeTxModal);
  if (txModalCancel) txModalCancel.addEventListener('click', closeTxModal);

  function openAddEditTxModal(txId = null, defaultType = 'debit') {
    if (!currentUser) {
      showToast('Please log in to add transactions.', 'error');
      authOverlay.classList.add('active');
      return;
    }

    const modalTitle = document.getElementById('tx-modal-title');
    const inputId = document.getElementById('tx-id');
    const inputMerchant = document.getElementById('tx-merchant');
    const inputAmount = document.getElementById('tx-amount');
    const inputType = document.getElementById('tx-type');
    const inputCategory = document.getElementById('tx-category');
    const inputDate = document.getElementById('tx-date');
    const inputNotes = document.getElementById('tx-notes');

    if (txId) {
      const existing = (appState.transactions || []).find(t => t.id === txId);
      if (!existing) return;
      modalTitle.textContent = 'Edit Transaction';
      inputId.value = existing.id;
      inputMerchant.value = existing.merchant;
      inputAmount.value = existing.amount;
      inputType.value = existing.type;
      inputCategory.value = existing.category;
      inputDate.value = existing.date;
      inputNotes.value = existing.notes || '';
    } else {
      modalTitle.textContent = defaultType === 'credit' ? 'Add Income Entry' : 'Add Expense Entry';
      txForm.reset();
      inputId.value = '';
      inputType.value = defaultType;
      inputDate.value = new Date().toISOString().split('T')[0];
    }

    txModal.classList.add('active');
  }

  function closeTxModal() {
    txModal.classList.remove('active');
  }

  if (txForm) {
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('tx-id').value;
      const merchant = document.getElementById('tx-merchant').value.trim();
      const amount = parseFloat(document.getElementById('tx-amount').value);
      const type = document.getElementById('tx-type').value;
      const category = document.getElementById('tx-category').value;
      const date = document.getElementById('tx-date').value;
      const notes = document.getElementById('tx-notes').value.trim();

      if (!merchant || isNaN(amount) || amount <= 0 || !date) {
        showToast('Please fill in all required fields with valid values.', 'error');
        return;
      }

      if (!appState.transactions) appState.transactions = [];

      if (id) {
        const index = appState.transactions.findIndex(t => t.id === id);
        if (index !== -1) {
          appState.transactions[index] = { id, merchant, amount, type, category, date, notes };
          showToast('Transaction updated successfully!', 'success');
        }
      } else {
        const newTx = {
          id: 'tx_' + Date.now(),
          merchant,
          amount,
          type,
          category,
          date,
          notes
        };
        appState.transactions.unshift(newTx);
        showToast('Transaction added successfully!', 'success');
      }

      saveUserLedger();
      updateAllUI();
      closeTxModal();
    });
  }

  function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      appState.transactions = (appState.transactions || []).filter(t => t.id !== id);
      saveUserLedger();
      updateAllUI();
      showToast('Transaction deleted.', 'info');
    }
  }

  // --- 3. SMS Transaction Import Parser ---
  const smsInputText = document.getElementById('sms-input-text');
  const smsParseBtn = document.getElementById('sms-parse-btn');
  const smsSample1 = document.getElementById('sms-sample-1');
  const smsSample2 = document.getElementById('sms-sample-2');
  const smsSample3 = document.getElementById('sms-sample-3');

  const smsPreviewPlaceholder = document.getElementById('sms-preview-placeholder');
  const smsConfirmForm = document.getElementById('sms-confirm-form');
  const smsCancelBtn = document.getElementById('sms-cancel-btn');

  if (smsSample1) {
    smsSample1.addEventListener('click', () => {
      smsInputText.value = "Rs. 250 debited from A/c XX1234 at ABC Store on 02-Oct-2026.";
    });
  }

  if (smsSample2) {
    smsSample2.addEventListener('click', () => {
      smsInputText.value = "Rs 45,000.00 credited to A/c XX9876 on 01-Oct-2026 by Salary - TechCorp payout.";
    });
  }

  if (smsSample3) {
    smsSample3.addEventListener('click', () => {
      smsInputText.value = "INR 845.00 spent on your ICICI card at Swiggy Food Delivery on 02-Oct-2026.";
    });
  }

  if (smsParseBtn) {
    smsParseBtn.addEventListener('click', parsePastedSMS);
  }

  if (smsCancelBtn) {
    smsCancelBtn.addEventListener('click', resetSMSPreview);
  }

  function parsePastedSMS() {
    const rawText = smsInputText?.value || '';
    if (!rawText.trim()) {
      showToast('Please paste a sample SMS message first.', 'error');
      return;
    }

    const parsed = parseBankSMSMessage(rawText);

    if (!parsed.amount) {
      showToast('Could not automatically detect transaction amount. Please check SMS format.', 'error');
      return;
    }

    currentParsedSMSData = parsed;

    document.getElementById('sms-parsed-merchant').value = parsed.merchant;
    document.getElementById('sms-parsed-amount').value = parsed.amount;
    document.getElementById('sms-parsed-type').value = parsed.type;
    document.getElementById('sms-parsed-category').value = parsed.category;
    document.getElementById('sms-parsed-date').value = parsed.date;
    document.getElementById('sms-parsed-raw').value = rawText.trim();

    smsPreviewPlaceholder.classList.add('hidden');
    smsConfirmForm.classList.remove('hidden');

    showToast('SMS parsed successfully! Review and confirm details.', 'success');
  }

  function resetSMSPreview() {
    currentParsedSMSData = null;
    smsConfirmForm.classList.add('hidden');
    smsPreviewPlaceholder.classList.remove('hidden');
  }

  if (smsConfirmForm) {
    smsConfirmForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const merchant = document.getElementById('sms-parsed-merchant').value.trim();
      const amount = parseFloat(document.getElementById('sms-parsed-amount').value);
      const type = document.getElementById('sms-parsed-type').value;
      const category = document.getElementById('sms-parsed-category').value;
      const date = document.getElementById('sms-parsed-date').value;
      const rawNotes = 'Imported via SMS parser';

      if (!merchant || isNaN(amount) || amount <= 0 || !date) {
        showToast('Please ensure all preview fields are valid.', 'error');
        return;
      }

      if (!appState.transactions) appState.transactions = [];

      const newTx = {
        id: 'tx_sms_' + Date.now(),
        merchant,
        amount,
        type,
        category,
        date,
        notes: rawNotes
      };

      appState.transactions.unshift(newTx);
      saveUserLedger();
      updateAllUI();

      smsInputText.value = '';
      resetSMSPreview();

      showToast('Imported transaction saved successfully!', 'success');
      switchView('transactions');
    });
  }

  // --- Robust Regex SMS Extractor Engine ---
  function parseBankSMSMessage(text) {
    const cleanText = text.trim();

    let amount = 0;
    const amountRegexes = [
      /(?:Rs\.?|INR|\$|USD)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:debited|credited|spent|paid|received)/i
    ];

    for (let re of amountRegexes) {
      const match = cleanText.match(re);
      if (match && match[1]) {
        const cleanNum = match[1].replace(/,/g, '');
        const parsedNum = parseFloat(cleanNum);
        if (!isNaN(parsedNum) && parsedNum > 0) {
          amount = parsedNum;
          break;
        }
      }
    }

    let type = 'debit';
    const debitKeywords = ['debited', 'spent', 'paid', 'withdrawn', 'sent', 'charged', 'purchase', 'card ending'];
    const creditKeywords = ['credited', 'received', 'added', 'deposited', 'refunded', 'salary', 'payout'];

    const lowerText = cleanText.toLowerCase();
    const isCredit = creditKeywords.some(kw => lowerText.includes(kw));
    const isDebit = debitKeywords.some(kw => lowerText.includes(kw));

    if (isCredit && !isDebit) {
      type = 'credit';
    } else {
      type = 'debit';
    }

    let merchant = 'Unknown Merchant';
    const merchantPatterns = [
      /(?:at|to|info:|vpa|for)\s+([A-Za-z0-9\s&.\-]+?)(?:\s+on|\s+ref|\s+date|\s+via|\.|$)/i,
      /(?:by|from)\s+([A-Za-z0-9\s&.\-]+?)(?:\s+on|\s+ref|\s+date|\s+via|\.|$)/i
    ];

    for (let re of merchantPatterns) {
      const match = cleanText.match(re);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length > 2 && !candidate.match(/^A\/c|^card/i)) {
          merchant = candidate;
          break;
        }
      }
    }

    let date = new Date().toISOString().split('T')[0];
    const dateMatch = cleanText.match(/(?:on|date)\s+([0-9]{1,2}[\/\-\.][A-Za-z0-9]{2,3}[\/\-\.][0-9]{2,4})/i);
    if (dateMatch && dateMatch[1]) {
      const parsedD = parseSMSDate(dateMatch[1]);
      if (parsedD) date = parsedD;
    }

    const category = autoDetectCategory(merchant, cleanText);

    return { amount, type, merchant, date, category };
  }

  function parseSMSDate(dateStr) {
    try {
      const monthNames = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' };
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].toLowerCase();
        let year = parts[2];
        if (year.length === 2) year = '20' + year;

        if (monthNames[month]) {
          month = monthNames[month];
        } else {
          month = month.padStart(2, '0');
        }

        return `${year}-${month}-${day}`;
      }
    } catch (e) {}
    return null;
  }

  function autoDetectCategory(merchant, fullText) {
    const text = (merchant + ' ' + fullText).toLowerCase();
    
    if (text.match(/swiggy|zomato|restaurant|cafe|food|mcdonalds|starbucks|supermarket|grocery|store|dine|bakery/)) {
      return 'Food';
    }
    if (text.match(/amazon|flipkart|myntra|zara|mall|retail|mart|clothing|fashion|shopping|electronics/)) {
      return 'Shopping';
    }
    if (text.match(/uber|ola|cab|petrol|fuel|shell|metro|train|flight|irctc|transport|parking|auto/)) {
      return 'Transport';
    }
    if (text.match(/bill|electricity|bescom|recharge|rent|wifi|broadband|airtel|jio|water|power|utility/)) {
      return 'Bills';
    }
    if (text.match(/udemy|coursera|school|college|tuition|book|course|academy|learning|education/)) {
      return 'Education';
    }
    return 'Other';
  }

  // --- 4. Monthly Budget View Engine ---
  const budgetModal = document.getElementById('budget-modal');
  const openEditBudgetBtn = document.getElementById('open-edit-budget-btn');
  const budgetModalClose = document.getElementById('budget-modal-close');
  const budgetModalCancel = document.getElementById('budget-modal-cancel');
  const budgetForm = document.getElementById('budget-form');
  const inputMonthlyBudget = document.getElementById('input-monthly-budget');

  if (openEditBudgetBtn) {
    openEditBudgetBtn.addEventListener('click', () => {
      inputMonthlyBudget.value = appState.monthlyBudget || '';
      budgetModal.classList.add('active');
    });
  }

  if (budgetModalClose) budgetModalClose.addEventListener('click', () => budgetModal.classList.remove('active'));
  if (budgetModalCancel) budgetModalCancel.addEventListener('click', () => budgetModal.classList.remove('active'));

  if (budgetForm) {
    budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(inputMonthlyBudget.value);
      if (isNaN(val) || val <= 0) {
        showToast('Please enter a valid target budget.', 'error');
        return;
      }
      appState.monthlyBudget = val;
      saveUserLedger();
      updateAllUI();
      budgetModal.classList.remove('active');
      showToast('Monthly budget target updated!', 'success');
    });
  }

  function renderMonthlyBudgetView(metrics) {
    document.getElementById('budget-val-target').textContent = formatMoney(metrics.budget);
    document.getElementById('budget-val-spent').textContent = formatMoney(metrics.monthlyExpense);
    document.getElementById('budget-val-remaining').textContent = formatMoney(metrics.remainingBudget);
    
    document.getElementById('budget-percent-label').textContent = `${metrics.budgetPercent}%`;
    const progressFill = document.getElementById('budget-progress-fill');
    if (progressFill) {
      progressFill.style.width = `${metrics.budgetPercent}%`;
      if (metrics.isWarning80) {
        progressFill.className = 'progress-fill warning';
      } else {
        progressFill.className = 'progress-fill';
      }
    }

    const warningBanner = document.getElementById('budget-warning-banner');
    const warningMsg = document.getElementById('budget-warning-message');
    if (metrics.isWarning80) {
      warningBanner.classList.remove('hidden');
      warningMsg.textContent = `Warning: You have reached ${metrics.budgetPercent}% of your monthly budget limit. Remaining balance: ${formatMoney(metrics.remainingBudget)}.`;
    } else {
      warningBanner.classList.add('hidden');
    }

    const catContainer = document.getElementById('category-budgets-container');
    if (!catContainer) return;

    const catTotals = { Food: 0, Shopping: 0, Transport: 0, Bills: 0, Education: 0, Other: 0 };
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    (appState.transactions || []).forEach(tx => {
      if (tx.type === 'debit' && (tx.date.startsWith(currentMonthKey) || isCurrentMonth(tx.date))) {
        if (catTotals[tx.category] !== undefined) {
          catTotals[tx.category] += Number(tx.amount) || 0;
        } else {
          catTotals.Other += Number(tx.amount) || 0;
        }
      }
    });

    const catAllocations = { Food: 0.30, Bills: 0.30, Shopping: 0.20, Transport: 0.10, Education: 0.10, Other: 0.10 };

    catContainer.innerHTML = Object.keys(catTotals).map(cat => {
      const spent = catTotals[cat];
      const categoryBudget = metrics.budget > 0 ? metrics.budget * catAllocations[cat] : 0;
      const catPercent = categoryBudget > 0 ? Math.min(Math.round((spent / categoryBudget) * 100), 100) : 0;
      const isCatOver = categoryBudget > 0 && spent > categoryBudget;

      return `
        <div class="cat-budget-card">
          <div class="cat-budget-header">
            <span class="cat-budget-name">
              <span class="category-badge">${cat}</span>
            </span>
            <span class="text-xs font-semibold ${isCatOver ? 'text-danger' : 'text-muted'}">
              ${categoryBudget > 0 ? catPercent + '% spent' : 'Spent: ' + formatMoney(spent)}
            </span>
          </div>
          <div class="flex-between mb-2">
            <span class="text-xs text-muted">Spent: ${formatMoney(spent)}</span>
            <span class="text-xs font-semibold">Limit: ${formatMoney(categoryBudget)}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isCatOver ? 'danger' : (catPercent >= 80 ? 'warning' : '')}" style="width: ${catPercent}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 5. Savings Goals Engine ---
  const goalModal = document.getElementById('goal-modal');
  const openAddGoalBtn = document.getElementById('open-add-goal-btn');
  const goalModalClose = document.getElementById('goal-modal-close');
  const goalModalCancel = document.getElementById('goal-modal-cancel');
  const goalForm = document.getElementById('goal-form');

  const depositModal = document.getElementById('deposit-modal');
  const depositModalClose = document.getElementById('deposit-modal-close');
  const depositModalCancel = document.getElementById('deposit-modal-cancel');
  const depositForm = document.getElementById('deposit-form');

  if (openAddGoalBtn) openAddGoalBtn.addEventListener('click', () => openAddEditGoalModal());
  if (goalModalClose) goalModalClose.addEventListener('click', () => goalModal.classList.remove('active'));
  if (goalModalCancel) goalModalCancel.addEventListener('click', () => goalModal.classList.remove('active'));

  if (depositModalClose) depositModalClose.addEventListener('click', () => depositModal.classList.remove('active'));
  if (depositModalCancel) depositModalCancel.addEventListener('click', () => depositModal.classList.remove('active'));

  function openAddEditGoalModal(goalId = null) {
    const modalTitle = document.getElementById('goal-modal-title');
    const inputId = document.getElementById('goal-id');
    const inputName = document.getElementById('goal-name');
    const inputTarget = document.getElementById('goal-target');
    const inputSaved = document.getElementById('goal-saved');
    const inputIcon = document.getElementById('goal-icon');

    if (goalId) {
      const g = (appState.savingsGoals || []).find(item => item.id === goalId);
      if (!g) return;
      modalTitle.textContent = 'Edit Savings Goal';
      inputId.value = g.id;
      inputName.value = g.name;
      inputTarget.value = g.target;
      inputSaved.value = g.saved;
      inputIcon.value = g.icon || 'shield';
    } else {
      modalTitle.textContent = 'Create Savings Goal';
      goalForm.reset();
      inputId.value = '';
    }

    goalModal.classList.add('active');
  }

  if (goalForm) {
    goalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('goal-id').value;
      const name = document.getElementById('goal-name').value.trim();
      const target = parseFloat(document.getElementById('goal-target').value);
      const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
      const icon = document.getElementById('goal-icon').value;

      if (!name || isNaN(target) || target <= 0) {
        showToast('Please enter a valid goal name and target amount.', 'error');
        return;
      }

      if (!appState.savingsGoals) appState.savingsGoals = [];

      if (id) {
        const index = appState.savingsGoals.findIndex(g => g.id === id);
        if (index !== -1) {
          appState.savingsGoals[index] = { id, name, target, saved, icon };
          showToast('Goal updated!', 'success');
        }
      } else {
        const newGoal = {
          id: 'goal_' + Date.now(),
          name,
          target,
          saved,
          icon
        };
        appState.savingsGoals.push(newGoal);
        showToast('Savings goal created successfully!', 'success');
      }

      saveUserLedger();
      updateAllUI();
      goalModal.classList.remove('active');
    });
  }

  function renderSavingsGoals() {
    const container = document.getElementById('savings-goals-container');
    const emptyState = document.getElementById('savings-empty-state');
    if (!container) return;

    const goals = appState.savingsGoals || [];

    if (goals.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    container.innerHTML = goals.map(g => {
      const pct = g.target > 0 ? Math.min(Math.round((g.saved / g.target) * 100), 100) : 0;

      return `
        <div class="goal-card">
          <div>
            <div class="goal-header">
              <div class="goal-icon-wrapper">
                <i data-lucide="${g.icon || 'shield'}"></i>
              </div>
              <div class="flex-actions">
                <button class="action-btn edit-goal-btn" data-id="${g.id}" title="Edit Goal">
                  <i data-lucide="edit-2"></i>
                </button>
                <button class="action-btn action-btn-danger delete-goal-btn" data-id="${g.id}" title="Delete Goal">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </div>

            <div class="goal-name">${escapeHTML(g.name)}</div>
            <div class="goal-amounts text-success">${formatMoney(g.saved)} <span class="text-muted text-xs font-medium">of ${formatMoney(g.target)}</span></div>

            <div class="main-progress-container mt-2">
              <div class="progress-bar-label-row">
                <span class="text-xs text-muted font-medium">Progress</span>
                <span class="text-xs font-bold">${pct}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t">
            <button class="btn btn-outline btn-full deposit-btn" data-id="${g.id}">
              <i data-lucide="plus"></i> Add Deposit
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.edit-goal-btn').forEach(btn => {
      btn.addEventListener('click', () => openAddEditGoalModal(btn.dataset.id));
    });

    container.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteGoal(btn.dataset.id));
    });

    container.querySelectorAll('.deposit-btn').forEach(btn => {
      btn.addEventListener('click', () => openDepositModal(btn.dataset.id));
    });
  }

  function deleteGoal(id) {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      appState.savingsGoals = (appState.savingsGoals || []).filter(g => g.id !== id);
      saveUserLedger();
      updateAllUI();
      showToast('Savings goal deleted.', 'info');
    }
  }

  function openDepositModal(goalId) {
    const goal = (appState.savingsGoals || []).find(g => g.id === goalId);
    if (!goal) return;

    document.getElementById('deposit-goal-id').value = goal.id;
    document.getElementById('deposit-goal-title').textContent = goal.name;
    document.getElementById('deposit-amount').value = '';

    depositModal.classList.add('active');
  }

  if (depositForm) {
    depositForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const goalId = document.getElementById('deposit-goal-id').value;
      const amt = parseFloat(document.getElementById('deposit-amount').value);

      if (isNaN(amt) || amt <= 0) {
        showToast('Please enter a valid deposit amount.', 'error');
        return;
      }

      const goal = (appState.savingsGoals || []).find(g => g.id === goalId);
      if (goal) {
        goal.saved += amt;
        saveUserLedger();
        updateAllUI();
        depositModal.classList.remove('active');
        showToast(`Added ${formatMoney(amt)} to ${goal.name}!`, 'success');
      }
    });
  }

  // --- 6. Chart.js Management ---
  function renderCharts() {
    if (typeof Chart === 'undefined') return;

    renderIncomeExpenseChart();
    renderCategoryChart();
  }

  function renderIncomeExpenseChart() {
    const ctx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    if (!ctx) return;

    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const now = new Date();
    const curYear = now.getFullYear();

    const monthKeys = ['05', '06', '07', '08', '09', '10'].map(m => `${curYear}-${m}`);

    const incomeData = [0, 0, 0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0, 0, 0];

    (appState.transactions || []).forEach(t => {
      monthKeys.forEach((key, index) => {
        if (t.date.startsWith(key)) {
          if (t.type === 'credit') incomeData[index] += Number(t.amount) || 0;
          if (t.type === 'debit') expenseData[index] += Number(t.amount) || 0;
        }
      });
    });

    if (incomeExpenseChartInstance) {
      incomeExpenseChartInstance.destroy();
    }

    incomeExpenseChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${appState.currency}${context.raw.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (value) => `${appState.currency}${value >= 1000 ? (value/1000) + 'k' : value}`
            }
          }
        }
      }
    });
  }

  function renderCategoryChart() {
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) return;

    const categories = ['Food', 'Shopping', 'Transport', 'Bills', 'Education', 'Other'];
    const catColors = ['#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4', '#64748b'];

    const totals = categories.map(cat => {
      return (appState.transactions || [])
        .filter(t => t.type === 'debit' && t.category === cat)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    const hasExpenses = totals.some(val => val > 0);

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [{
          data: hasExpenses ? totals : [1, 1, 1, 1, 1, 1],
          backgroundColor: hasExpenses ? catColors : ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true, boxWidth: 8 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (!hasExpenses) return ' No expense data recorded';
                return ` ${context.label}: ${appState.currency}${context.raw.toLocaleString('en-IN')}`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }

  // --- 7. Toast Notification System ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    if (window.lucide) {
      window.lucide.createIcons({ el: toast });
    }

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Initial Launch Setup
  updateAllUI();

});
