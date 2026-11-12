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
 *
 * Basic filtering, before anything is written:
 *   - honeypot field and a minimum time on the page (bots fill forms instantly)
 *   - stricter address format and length limits
 *   - common typos of big mail domains get a "did you mean" reply
 *   - throwaway/disposable mail domains are refused
 *   - the domain must exist and accept mail (MX lookup over Google Public DNS)
 *   - a site-wide limit on sign-ups per minute and per 10 minutes
 * Rejected attempts are not stored anywhere; they show up in Executions > Logs.
 */

var SHEET_NAME = 'Signups';
var MIN_MS_ON_PAGE = 1500;        // faster than this from page load to submit = bot
var LIMIT_PER_MIN = 8;            // sign-ups accepted per minute, whole site
var LIMIT_PER_10_MIN = 30;        // sign-ups accepted per 10 minutes, whole site

var EMAIL_RE = /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

// Big providers we know accept mail: skip the DNS lookup for these.
var KNOWN_OK = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'aol.com',
  'qq.com', 'foxmail.com', '163.com', '126.com', 'yeah.net', 'sina.com', 'sohu.com', 'aliyun.com',
  'cornell.edu'];

var TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmali.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com',
  'icloud.co': 'icloud.com', 'qq.co': 'qq.com', 'qq.con': 'qq.com', '163.co': '163.com', '126.co': '126.com'
};

var DISPOSABLE = ['mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'sharklasers.com', 'grr.la', '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'tempr.email', 'throwawaymail.com', 'trashmail.com',
  'trashmail.de', 'yopmail.com', 'yopmail.net', 'yopmail.fr', 'getnada.com', 'nada.email', 'dispostable.com',
  'maildrop.cc', 'mailnesia.com', 'mintemail.com', 'mohmal.com', 'fakeinbox.com', 'fakemail.net',
  'emailondeck.com', 'spamgourmet.com', 'mailcatch.com', 'mytemp.email', 'moakt.com', 'burnermail.io',
  'discard.email', 'inboxkitten.com', 'mail.tm', 'mailpoof.com', 'linshiyouxiang.net', 'bccto.me',
  '1secmail.com', '1secmail.net', 'emailfake.com', 'tmpmail.org', 'tmail.ws', 'byom.de', 'spam4.me'];

var MSG = {
  invalid: 'Please enter a valid email address.',
  disposable: 'Please use your regular email, not a temporary one.',
  noMail: 'That email domain doesn’t seem to accept mail. Please check the address.',
  tooFast: 'Something looked off. Please wait a moment and try again.',
  busy: 'Lots of sign-ups right now. Please try again in a few minutes.',
  server: 'Something went wrong on our side. Please try again.'
};

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Honeypot: real people never fill the hidden "website" field.
    if (data.website) return fake_('honeypot', data.email);

    // Time on page: the form sends how long the page was open before submitting.
    var ms = Number(data.t);
    if (!isFinite(ms) || ms < MIN_MS_ON_PAGE) return reject_('too fast (' + data.t + 'ms)', data.email, MSG.tooFast);

    var email = String(data.email || '').trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email) || email.indexOf('..') !== -1 || /^\.|\.@/.test(email)) {
      return reject_('format', email, MSG.invalid);
    }
    var domain = email.split('@')[1];

    if (TYPOS[domain]) {
      var fixed = email.split('@')[0] + '@' + TYPOS[domain];
      return reject_('typo', email, 'Did you mean ' + fixed + '?');
    }
    if (isDisposable_(domain)) return reject_('disposable', email, MSG.disposable);
    if (!acceptsMail_(domain)) return reject_('no mail server', email, MSG.noMail);

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
      if (!underLimit_()) return reject_('rate limit', email, MSG.busy);
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
    return json_({ ok: false, error: MSG.server });
  }
}

// Open the /exec URL in a browser to check the deployment is live.
function doGet() {
  return json_({ ok: true, service: 'pact-signup', filters: 1 });
}

function isDisposable_(domain) {
  for (var i = 0; i < DISPOSABLE.length; i++) {
    var d = DISPOSABLE[i];
    if (domain === d || domain.slice(-(d.length + 1)) === '.' + d) return true;
  }
  return false;
}

// True if the domain has a mail server. Answers are cached for 6 hours.
// If the DNS lookup itself fails, let the sign-up through rather than block real people.
function acceptsMail_(domain) {
  if (KNOWN_OK.indexOf(domain) !== -1 || /\.edu(\.[a-z]{2})?$/.test(domain)) return true;
  var cache = CacheService.getScriptCache(), key = 'mx:' + domain, hit = cache.get(key);
  if (hit !== null) return hit === '1';
  try {
    var res = UrlFetchApp.fetch('https://dns.google/resolve?type=MX&name=' + encodeURIComponent(domain),
      { muteHttpExceptions: true, headers: { accept: 'application/dns-json' } });
    if (res.getResponseCode() !== 200) return true;
    var dns = JSON.parse(res.getContentText());
    var ok = false;
    if (dns.Status === 0 && dns.Answer) {
      ok = dns.Answer.some(function (a) { return a.type === 15 && !/^0\s+\.?$/.test(String(a.data).trim()); });
    }
    cache.put(key, ok ? '1' : '0', 21600);
    return ok;
  } catch (err) {
    console.warn('MX lookup failed for ' + domain + ': ' + err);
    return true;
  }
}

// Site-wide cap on accepted sign-ups. Called while holding the script lock.
function underLimit_() {
  var cache = CacheService.getScriptCache(), now = Date.now();
  var k1 = 'rl1:' + Math.floor(now / 60000), k10 = 'rl10:' + Math.floor(now / 600000);
  var n1 = Number(cache.get(k1) || 0), n10 = Number(cache.get(k10) || 0);
  if (n1 >= LIMIT_PER_MIN || n10 >= LIMIT_PER_10_MIN) return false;
  cache.put(k1, String(n1 + 1), 120);
  cache.put(k10, String(n10 + 1), 900);
  return true;
}

function reject_(why, email, message) {
  console.log('Rejected sign-up (' + why + '): ' + String(email || '').slice(0, 80));
  return json_({ ok: false, error: message });
}

// Bots get a normal-looking success so they don't learn what tripped them.
function fake_(why, email) {
  console.log('Dropped sign-up (' + why + '): ' + String(email || '').slice(0, 80));
  return json_({ ok: true });
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
