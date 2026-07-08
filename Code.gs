
/******************************************************
 APLIKASI PREMIUM PENGISIAN PENGGUNAAN PLASTIK KESELAMATAN SPM
 SPP JABATAN PENDIDIKAN NEGERI JOHOR
 Google Apps Script + Google Sheet
******************************************************/

const CONFIG = {
  SPREADSHEET_ID: '', // Jika Apps Script bound pada Google Sheet, biarkan kosong. Jika standalone, masukkan ID Google Sheet.
  SHEET_REKOD: 'REKOD_PENGGUNAAN',
  SHEET_SUBJEK: 'DATA_SUBJEK',
  SHEET_PUSAT: 'DATA_PUSAT',
  SHEET_PENYELIA: 'DATA_PENYELIA',
  TIMEZONE: 'Asia/Kuala_Lumpur'
};

function doGet() {
  setupSheets_();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Aplikasi Plastik Keselamatan SPM')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSS_() {
  if (CONFIG.SPREADSHEET_ID) return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function setupSheets_() {
  const ss = getSS_();
  const rekod = getOrCreateSheet_(ss, CONFIG.SHEET_REKOD);
  const subjek = getOrCreateSheet_(ss, CONFIG.SHEET_SUBJEK);
  const pusat = getOrCreateSheet_(ss, CONFIG.SHEET_PUSAT);
  const penyelia = getOrCreateSheet_(ss, CONFIG.SHEET_PENYELIA);

  setHeader_(rekod, [
    'Timestamp','Tarikh','Hari','Kod Subjek SPM','Subjek SPM','Kod Pusat Peperiksaan',
    'Nama Pusat Peperiksaan','Bilangan Plastik Keselamatan Digunakan','Bilangan Plastik Rosak',
    'Jumlah Keseluruhan','Nama Penyelia Kawasan','Catatan Sistem'
  ]);
  setHeader_(subjek, ['Kod Subjek SPM','Subjek SPM']);
  setHeader_(pusat, ['Kod Pusat Peperiksaan','Nama Pusat Peperiksaan']);
  setHeader_(penyelia, ['Nama Penyelia Kawasan']);

  forcePlainText_(subjek, 1);
  forcePlainText_(pusat, 1);

  if (subjek.getLastRow() < 2) subjek.getRange(2,1,6,2).setValues([
    ['1103','BAHASA MELAYU'], ['1119','BAHASA INGGERIS'], ['1223','PENDIDIKAN ISLAM'],
    ['1249','SEJARAH'], ['1449','MATHEMATICS'], ['3472','MATEMATIK TAMBAHAN']
  ]);
  if (pusat.getLastRow() < 2) pusat.getRange(2,1,3,2).setValues([
    ['JEA0001','CONTOH PUSAT PEPERIKSAAN 1'], ['JEA0002','CONTOH PUSAT PEPERIKSAAN 2'], ['JEA0003','CONTOH PUSAT PEPERIKSAAN 3']
  ]);
  if (penyelia.getLastRow() < 2) penyelia.getRange(2,1,3,1).setValues([
    ['PENYELIA KAWASAN 1'], ['PENYELIA KAWASAN 2'], ['PENYELIA KAWASAN 3']
  ]);

  autoResize_(rekod); autoResize_(subjek); autoResize_(pusat); autoResize_(penyelia);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function setHeader_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  if (range.getDisplayValues()[0].join('').trim() === '') range.setValues([headers]);
  range.setFontWeight('bold').setBackground('#083b86').setFontColor('#ffffff').setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function forcePlainText_(sheet, col) {
  const maxRows = Math.max(sheet.getMaxRows(), 1000);
  sheet.getRange(1, col, maxRows, 1).setNumberFormat('@');
}

function autoResize_(sheet) {
  try { sheet.autoResizeColumns(1, Math.max(1, sheet.getLastColumn())); } catch(e) {}
}

function cleanCode_(value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE, 'yyyy');
  }
  let s = String(value).trim();
  // Buang paparan Date JavaScript seperti: Sun Jan 01 1223 00:00:00 GMT+0655 (...)
  const m = s.match(/^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+\w{3}\s+\d{2}\s+(\d{3,5})\s+/i);
  if (m) return m[1];
  s = s.replace(/^'+/, '').trim();
  return s;
}

function getKeyValue_(sheetName) {
  const sh = getSS_().getSheetByName(sheetName);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const raw = sh.getRange(2, 1, last - 1, 2).getValues();
  const display = sh.getRange(2, 1, last - 1, 2).getDisplayValues();
  const seen = {};
  return raw.map((r, i) => {
    const code = cleanCode_(display[i][0] || r[0]);
    const name = String(display[i][1] || r[1] || '').trim();
    return { code, name };
  }).filter(item => item.code && item.name && !seen[item.code] && (seen[item.code] = true));
}

function getList_(sheetName) {
  const sh = getSS_().getSheetByName(sheetName);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getDisplayValues()
    .flat().map(v => String(v).trim()).filter(Boolean);
}

function getInitialData() {
  setupSheets_();
  return {
    subjects: getKeyValue_(CONFIG.SHEET_SUBJEK),
    centres: getKeyValue_(CONFIG.SHEET_PUSAT),
    supervisors: getList_(CONFIG.SHEET_PENYELIA),
    dashboard: getDashboardData()
  };
}

function submitRecord(form) {
  setupSheets_();
  const required = ['tarikh','hari','kodSubjek','subjek','kodPusat','namaPusat','penyelia'];
  required.forEach(k => { if (!form[k]) throw new Error('Sila lengkapkan semua maklumat wajib.'); });

  const digunakan = Number(form.digunakan || 0);
  const rosak = Number(form.rosak || 0);
  if (isNaN(digunakan) || isNaN(rosak) || digunakan < 0 || rosak < 0) {
    throw new Error('Bilangan plastik mestilah nombor 0 atau lebih.');
  }

  const kodSubjek = cleanCode_(form.kodSubjek);
  const kodPusat = cleanCode_(form.kodPusat);
  const jumlah = digunakan + rosak;

  getSS_().getSheetByName(CONFIG.SHEET_REKOD).appendRow([
    new Date(), form.tarikh, form.hari, kodSubjek, form.subjek, kodPusat,
    form.namaPusat, digunakan, rosak, jumlah, form.penyelia, 'Dihantar melalui aplikasi premium'
  ]);

  return { success: true, message: 'Rekod berjaya dihantar ke Google Sheet.', dashboard: getDashboardData() };
}

function getDashboardData() {
  const sh = getSS_().getSheetByName(CONFIG.SHEET_REKOD);
  const last = sh.getLastRow();
  if (last < 2) return { digunakan: 0, rosak: 0, keseluruhan: 0, rekod: 0 };
  const values = sh.getRange(2, 8, last - 1, 3).getValues();
  let digunakan = 0, rosak = 0, keseluruhan = 0;
  values.forEach(r => {
    digunakan += Number(r[0] || 0);
    rosak += Number(r[1] || 0);
    keseluruhan += Number(r[2] || 0);
  });
  return { digunakan, rosak, keseluruhan, rekod: values.length };
}

function getRecentRecords(limit) {
  const sh = getSS_().getSheetByName(CONFIG.SHEET_REKOD);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const n = Math.min(Number(limit || 10), last - 1);
  const start = last - n + 1;
  const rows = sh.getRange(start, 1, n, 11).getDisplayValues().reverse();
  return rows.map(r => ({
    timestamp: r[0], tarikh: r[1], hari: r[2], kodSubjek: cleanCode_(r[3]), subjek: r[4],
    kodPusat: cleanCode_(r[5]), namaPusat: r[6], digunakan: r[7], rosak: r[8], jumlah: r[9], penyelia: r[10]
  }));
}
