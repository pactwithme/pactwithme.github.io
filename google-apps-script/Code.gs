/**
 * Pact early-access sign-ups -> Google Sheet.
 *
 * Paste this into the Apps Script editor of the Google Sheet your team shares
 * (Extensions > Apps Script), then Deploy > New deployment > Web app:
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the web app URL (ends in /exec) into assets/config.js.
 *
 * Each sign-up becomes one row on the "Signups" tab: Time | Email | Source | Page.
 * Repeat emails are not added twice.
 */

var SHEET_NAME = 'Signups';
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot: real people never fill the hidden "website" field.
    if (data.website) return json_({ ok: true });

    var email = String(data.email || '').trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return json_({ ok: false, error: 'Please enter a valid email address.' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getSheet_();
      var last = sheet.getLastRow();
      if (last > 1) {
        var found = sheet.getRange(2, 2, last - 1, 1)
          .createTextFinder(safe_(email)).matchEntireCell(true).findNext();
        if (found) return json_({ ok: true, duplicate: true });
      }
      sheet.appendRow([
        new Date(),
        safe_(email),
        safe_(String(data.source || 'direct').slice(0, 200)),
        safe_(String(data.page || '').slice(0, 200))
      ]);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Something went wrong on our side. Please try again.' });
  }
}

// Open the /exec URL in a browser to check the deployment is live.
function doGet() {
  return json_({ ok: true, service: 'pact-signup' });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Time', 'Email', 'Source', 'Page']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Stop values like "=HYPERLINK(...)" from running as formulas in the sheet.
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
