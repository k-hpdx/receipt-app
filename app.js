// === DOM Elements ===
const els = {
  // Tabs
  tabs: document.querySelectorAll('.tab'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Form inputs
  recipientName: document.getElementById('recipientName'),
  issueDate: document.getElementById('issueDate'),
  description: document.getElementById('description'),
  taxType: document.getElementById('taxType'),
  taxRate: document.getElementById('taxRate'),
  amount: document.getElementById('amount'),

  // Calculation display
  calcExclusive: document.getElementById('calcExclusive'),
  calcTax: document.getElementById('calcTax'),
  calcInclusive: document.getElementById('calcInclusive'),
  calcTaxRateLabel: document.getElementById('calcTaxRateLabel'),

  // Preview
  prevRecipient: document.getElementById('prevRecipient'),
  prevDate: document.getElementById('prevDate'),
  prevAmount: document.getElementById('prevAmount'),
  prevDescription: document.getElementById('prevDescription'),
  prevTaxRate: document.getElementById('prevTaxRate'),
  prevExclusive: document.getElementById('prevExclusive'),
  prevTax: document.getElementById('prevTax'),
  prevCompanyName: document.getElementById('prevCompanyName'),
  prevCompanyAddress: document.getElementById('prevCompanyAddress'),
  prevCompanyPhone: document.getElementById('prevCompanyPhone'),
  prevRegistrationNumber: document.getElementById('prevRegistrationNumber'),

  // Settings
  companyName: document.getElementById('companyName'),
  companyAddress: document.getElementById('companyAddress'),
  companyPhone: document.getElementById('companyPhone'),
  registrationNumber: document.getElementById('registrationNumber'),
  btnSaveSettings: document.getElementById('btnSaveSettings'),
  saveStatus: document.getElementById('saveStatus'),

  // Actions
  btnGenerate: document.getElementById('btnGenerate'),
  receiptPreview: document.getElementById('receiptPreview'),
};

// === Tab Switching ===
els.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    els.tabs.forEach(t => t.classList.remove('active'));
    els.tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// === Date Default ===
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  els.issueDate.value = `${yyyy}-${mm}-${dd}`;
}

// === Tax Calculation ===
function calculate() {
  const inputAmount = parseInt(els.amount.value) || 0;
  const rate = parseFloat(els.taxRate.value);
  const isInclusive = els.taxType.value === 'inclusive';

  let exclusive, tax, inclusive;

  if (isInclusive) {
    inclusive = inputAmount;
    exclusive = Math.floor(inclusive / (1 + rate));
    tax = inclusive - exclusive;
  } else {
    exclusive = inputAmount;
    tax = Math.floor(exclusive * rate);
    inclusive = exclusive + tax;
  }

  return { exclusive, tax, inclusive, rate };
}

// === Number Formatting ===
function formatNumber(num) {
  return num.toLocaleString('ja-JP');
}

// === Update Display ===
function updateDisplay() {
  const { exclusive, tax, inclusive, rate } = calculate();
  const rateLabel = rate === 0.08 ? '8%（軽減）' : '10%';
  const rateShort = rate === 0.08 ? '8%' : '10%';

  // Calculation area
  els.calcExclusive.textContent = `${formatNumber(exclusive)} 円`;
  els.calcTax.textContent = `${formatNumber(tax)} 円`;
  els.calcInclusive.textContent = `${formatNumber(inclusive)} 円`;
  els.calcTaxRateLabel.textContent = rateLabel;

  // Preview - recipient
  const name = els.recipientName.value.trim();
  els.prevRecipient.textContent = name || '（宛名未入力）';

  // Preview - date
  if (els.issueDate.value) {
    const [y, m, d] = els.issueDate.value.split('-');
    els.prevDate.textContent = `${y}年${parseInt(m)}月${parseInt(d)}日`;
  }

  // Preview - amount
  els.prevAmount.textContent = inclusive > 0
    ? `￥ ${formatNumber(inclusive)} -`
    : '￥ 0 -';

  // Preview - description
  els.prevDescription.textContent = els.description.value.trim() || '（但し書き未入力）';

  // Preview - tax detail
  els.prevTaxRate.textContent = rateShort;
  els.prevExclusive.textContent = `${formatNumber(exclusive)} 円`;
  els.prevTax.textContent = `${formatNumber(tax)} 円`;
}

// === Settings: Load ===
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('receiptSettings') || '{}');

  els.companyName.value = settings.companyName || '';
  els.companyAddress.value = settings.companyAddress || '';
  els.companyPhone.value = settings.companyPhone || '';
  els.registrationNumber.value = settings.registrationNumber || '';

  updateIssuerPreview(settings);
}

// === Settings: Save ===
function saveSettings() {
  const settings = {
    companyName: els.companyName.value.trim(),
    companyAddress: els.companyAddress.value.trim(),
    companyPhone: els.companyPhone.value.trim(),
    registrationNumber: els.registrationNumber.value.trim(),
  };

  localStorage.setItem('receiptSettings', JSON.stringify(settings));
  updateIssuerPreview(settings);

  els.saveStatus.textContent = '保存しました';
  setTimeout(() => { els.saveStatus.textContent = ''; }, 2000);
}

// === Update Issuer Preview ===
function updateIssuerPreview(settings) {
  els.prevCompanyName.textContent = settings.companyName || '（会社名未設定）';
  els.prevCompanyAddress.textContent = settings.companyAddress || '';
  els.prevCompanyPhone.textContent = settings.companyPhone ? `TEL: ${settings.companyPhone}` : '';

  if (settings.registrationNumber) {
    els.prevRegistrationNumber.textContent = `登録番号：T${settings.registrationNumber}`;
  } else {
    els.prevRegistrationNumber.textContent = '登録番号：未設定';
  }
}

// === PDF Generation ===
function generatePDF() {
  // Validation
  if (!els.recipientName.value.trim()) {
    alert('宛名を入力してください。');
    return;
  }
  if (!els.amount.value || parseInt(els.amount.value) <= 0) {
    alert('金額を入力してください。');
    return;
  }

  const settings = JSON.parse(localStorage.getItem('receiptSettings') || '{}');
  if (!settings.companyName) {
    alert('設定画面で会社名を登録してください。');
    return;
  }
  if (!settings.registrationNumber) {
    alert('設定画面で登録番号を登録してください。');
    return;
  }

  const receiptEl = els.receiptPreview;
  const [y, m, d] = els.issueDate.value.split('-');
  const filename = `領収書_${els.recipientName.value.trim()}_${y}${m}${d}.pdf`;

  const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  html2pdf().set(opt).from(receiptEl).save();
}

// === Event Listeners ===
els.amount.addEventListener('input', updateDisplay);
els.taxType.addEventListener('change', updateDisplay);
els.taxRate.addEventListener('change', updateDisplay);
els.recipientName.addEventListener('input', updateDisplay);
els.issueDate.addEventListener('change', updateDisplay);
els.description.addEventListener('input', updateDisplay);
els.btnSaveSettings.addEventListener('click', saveSettings);
els.btnGenerate.addEventListener('click', generatePDF);

// === Initialize ===
setDefaultDate();
loadSettings();
updateDisplay();
