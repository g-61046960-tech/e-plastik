// Masukkan URL Google Apps Script Web App cikgu di sini jika mahu hantar terus ke Google Sheet.
// Contoh: const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxxx/exec';
const SCRIPT_URL = '';

const $ = (id) => document.getElementById(id);
const hariBM = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];

function fillSelect(selectEl, items, getValue, getText) {
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = getValue(item);
    opt.textContent = getText(item);
    selectEl.appendChild(opt);
  });
}

function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  $('tarikh').value = `${yyyy}-${mm}-${dd}`;
  updateDay();
}

function updateDay() {
  const value = $('tarikh').value;
  if (!value) return;
  const date = new Date(value + 'T00:00:00');
  $('hari').value = hariBM[date.getDay()];
}

function initDropdowns() {
  fillSelect($('kodSubjek'), SUBJECTS, x => x.kod, x => x.kod);
  fillSelect($('kodPusat'), CENTERS, x => x.kod, x => `${x.kod} - ${x.nama}`);
  fillSelect($('penyelia'), SUPERVISORS, x => x, x => x);
  $('subjectCount').textContent = SUBJECTS.length;
  $('centerCount').textContent = CENTERS.length;
  $('supervisorCount').textContent = SUPERVISORS.length;
}

function bindEvents() {
  $('tarikh').addEventListener('change', updateDay);
  $('kodSubjek').addEventListener('change', () => {
    const found = SUBJECTS.find(x => x.kod === $('kodSubjek').value);
    $('namaSubjek').value = found ? found.nama : '';
  });
  $('kodPusat').addEventListener('change', () => {
    const found = CENTERS.find(x => x.kod === $('kodPusat').value);
    $('namaPusat').value = found ? found.nama : '';
  });
  $('spmForm').addEventListener('submit', submitForm);
  $('clearLocal').addEventListener('click', () => {
    localStorage.removeItem('ePlastikRecords');
    renderRecords();
  });
}

function getRecords() {
  try { return JSON.parse(localStorage.getItem('ePlastikRecords') || '[]'); }
  catch { return []; }
}

function saveLocal(record) {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem('ePlastikRecords', JSON.stringify(records.slice(0, 50)));
}

function renderRecords() {
  const body = $('recordsBody');
  const records = getRecords();
  body.innerHTML = records.length ? records.map(r => `
    <tr>
      <td>${r.tarikh}</td><td>${r.hari}</td><td>${r.kodSubjek}</td><td>${r.namaSubjek}</td>
      <td>${r.kodPusat}</td><td>${r.namaPusat}</td><td>${r.penyelia}</td><td>${r.bilPlastik}</td>
    </tr>
  `).join('') : '<tr><td colspan="8">Belum ada rekod.</td></tr>';
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const record = Object.fromEntries(new FormData(form).entries());
  record.masaHantar = new Date().toLocaleString('ms-MY');
  const msg = $('statusMsg');
  msg.className = 'status';
  msg.textContent = 'Sedang menghantar...';

  saveLocal(record);
  renderRecords();

  if (!SCRIPT_URL) {
    msg.className = 'status ok';
    msg.textContent = 'Rekod disimpan pada peranti ini. Masukkan SCRIPT_URL untuk hantar terus ke Google Sheet.';
    form.reset();
    setToday();
    return;
  }

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    msg.className = 'status ok';
    msg.textContent = 'Rekod berjaya dihantar.';
    form.reset();
    setToday();
  } catch (err) {
    msg.className = 'status bad';
    msg.textContent = 'Rekod disimpan pada peranti, tetapi gagal dihantar ke Google Sheet.';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  setToday();
  bindEvents();
  renderRecords();
});
