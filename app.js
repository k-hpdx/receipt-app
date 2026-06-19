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

  // Receipt number
  prevNumber: document.getElementById('prevNumber'),
  nextNumberHint: document.getElementById('nextNumberHint'),

  // History
  historyBody: document.getElementById('historyBody'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyTable: document.getElementById('historyTable'),
  historyCount: document.getElementById('historyCount'),
  btnExportCsv: document.getElementById('btnExportCsv'),

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
    if (tab.dataset.tab === 'history') {
      renderHistory();
    }
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

  // Preview - 次に発行される領収書番号
  refreshNextNumber();
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

// === Receipt Number ===
// 番号は「年度＋連番」形式（例：2026-0001）。年ごとに連番を管理し、年が変わると0001にリセット。
// 連番カウンターは発行のたびに増加し、履歴を削除しても減らない（番号の重複を防ぐため）。
function getCounters() {
  return JSON.parse(localStorage.getItem('receiptCounters') || '{}');
}

function getReceiptYear() {
  const val = els.issueDate.value;
  const y = val ? val.split('-')[0] : String(new Date().getFullYear());
  return y;
}

function formatReceiptNumber(year, seq) {
  return `${year}-${String(seq).padStart(4, '0')}`;
}

// 次に発行される番号を、カウンターを進めずに確認する
function peekNextNumber() {
  const year = getReceiptYear();
  const counters = getCounters();
  const seq = (counters[year] || 0) + 1;
  return formatReceiptNumber(year, seq);
}

// 番号を確定し、カウンターを進めて保存する
function commitNextNumber() {
  const year = getReceiptYear();
  const counters = getCounters();
  const seq = (counters[year] || 0) + 1;
  counters[year] = seq;
  localStorage.setItem('receiptCounters', JSON.stringify(counters));
  return formatReceiptNumber(year, seq);
}

function refreshNextNumber() {
  const next = peekNextNumber();
  els.nextNumberHint.textContent = next;
  els.prevNumber.textContent = next;
}

// === History ===
function getHistory() {
  return JSON.parse(localStorage.getItem('receiptHistory') || '[]');
}

function addHistory(record) {
  const history = getHistory();
  history.push(record);
  localStorage.setItem('receiptHistory', JSON.stringify(history));
}

function deleteHistory(number) {
  const history = getHistory().filter(r => r.number !== number);
  localStorage.setItem('receiptHistory', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = getHistory().slice().reverse(); // 新しい順
  els.historyBody.innerHTML = '';

  if (history.length === 0) {
    els.historyTable.style.display = 'none';
    els.historyEmpty.style.display = 'block';
    els.historyCount.textContent = '';
    return;
  }

  els.historyTable.style.display = '';
  els.historyEmpty.style.display = 'none';
  els.historyCount.textContent = `全 ${history.length} 件`;

  history.forEach(r => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td');
    tdNum.className = 'col-number';
    tdNum.textContent = r.number;

    const tdDate = document.createElement('td');
    tdDate.textContent = r.date;

    const tdName = document.createElement('td');
    tdName.textContent = `${r.recipient} 様`;

    const tdDesc = document.createElement('td');
    tdDesc.textContent = r.description || '—';

    const tdAmount = document.createElement('td');
    tdAmount.className = 'num';
    tdAmount.textContent = `${formatNumber(r.amount)} 円`;

    const tdAction = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'btn-delete';
    btn.textContent = '削除';
    btn.addEventListener('click', () => {
      if (confirm(`領収書番号 ${r.number}（${r.recipient} 様）を履歴から削除しますか？`)) {
        deleteHistory(r.number);
      }
    });
    tdAction.appendChild(btn);

    tr.append(tdNum, tdDate, tdName, tdDesc, tdAmount, tdAction);
    els.historyBody.appendChild(tr);
  });
}

// === CSV Export ===
function exportCsv() {
  const history = getHistory();
  if (history.length === 0) {
    alert('発行履歴がありません。');
    return;
  }

  const header = ['領収書番号', '発行日', '宛名', '但し書き', '税抜金額', '消費税額', '税込金額'];
  const rows = history.map(r => [
    r.number,
    r.date,
    r.recipient,
    r.description || '',
    r.exclusive,
    r.tax,
    r.amount,
  ]);

  const escape = v => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map(row => row.map(escape).join(',')).join('\r\n');

  // Excelでの文字化け防止にBOMを付与
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `発行先一覧_${getReceiptYear()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

  // 領収書番号を確定（カウンターを進める）し、プレビューに反映
  const number = commitNextNumber();
  els.prevNumber.textContent = number;

  const receiptEl = els.receiptPreview;
  const [y, m, d] = els.issueDate.value.split('-');
  const recipient = els.recipientName.value.trim();
  const { exclusive, tax, inclusive } = calculate();
  const filename = `領収書_${number}_${recipient}.pdf`;

  const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  // PDF生成（html2pdfは非同期）。生成中はプレビューの番号を確定値のまま保持し、
  // PDFのキャプチャが終わってから「次の番号」へ表示を更新する。
  // ここで先にrefreshNextNumber()を呼ぶと、キャプチャ前に番号が次の値へ戻ってしまう。
  html2pdf().set(opt).from(receiptEl).save()
    .then(refreshNextNumber)
    .catch(refreshNextNumber);

  // 発行履歴に記録（DOMには触れないのでキャプチャに影響しない）
  addHistory({
    number,
    date: `${y}-${m}-${d}`,
    recipient,
    description: els.description.value.trim(),
    exclusive,
    tax,
    amount: inclusive,
  });
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
els.btnExportCsv.addEventListener('click', exportCsv);

// === Initialize ===
setDefaultDate();
loadSettings();
updateDisplay();
refreshNextNumber();
