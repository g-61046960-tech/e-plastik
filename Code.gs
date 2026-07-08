/**
 * API BRIDGE UNTUK GITHUB / NETLIFY
 * Letakkan kod ini dalam Google Apps Script yang sama dengan fungsi asal:
 * - getInitialData()
 * - submitRecord(form)
 *
 * Penting:
 * 1. Jika sudah ada function doGet(e), gantikan dengan doGet(e) di bawah.
 * 2. Deploy semula sebagai Web App.
 * 3. Execute as: Me
 * 4. Who has access: Anyone
 */

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';

  if (action === 'getInitialData') {
    return jsonOutput_(true, getInitialData());
  }

  return jsonOutput_(true, {
    message: 'Apps Script API aktif. Gunakan action=getInitialData atau submitRecord.'
  });
}

function doPost(e) {
  try {
    var body = {};

    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    var action = body.action || (e && e.parameter ? e.parameter.action : '');

    if (action === 'getInitialData') {
      return jsonOutput_(true, getInitialData());
    }

    if (action === 'submitRecord') {
      var result = submitRecord(body.form || body);
      return jsonOutput_(true, result);
    }

    return jsonOutput_(false, null, 'Action tidak dikenali: ' + action);
  } catch (err) {
    return jsonOutput_(false, null, err.message || String(err));
  }
}

function jsonOutput_(ok, data, message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: ok,
      data: data || null,
      message: message || ''
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
