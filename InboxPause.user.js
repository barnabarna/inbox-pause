// ==UserScript==
// @name         Inbox Pause (Gmail API)
// @namespace    https://barnabarna.github.io/inbox-pause/
// @version      2.0.0
// @description  True server-side inbox pause via Gmail API. Pause/unpause from Gmail on any desktop browser.
// @author       Barna Szász
// @match        https://mail.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      gmail.googleapis.com
// @connect      barnabarna.github.io
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ─── Config ─────────────────────────────────────────────────────────────────
  const CLIENT_ID   = '948980601473-4tpqjeegq5fth015mul0k67ukdpn60pf.apps.googleusercontent.com';
  const REDIRECT    = 'https://barnabarna.github.io/inbox-pause/';
  const SCOPES      = 'https://mail.google.com/ https://www.googleapis.com/auth/gmail.settings.basic';
  const PAUSE_LABEL = 'Inbox Pause';
  const APP_URL     = 'https://barnabarna.github.io/inbox-pause/';

  // ─── State ──────────────────────────────────────────────────────────────────
  let token     = null;
  let paused    = false;
  let labelId   = null;
  let filterId  = null;
  let heldCount = 0;
  let checking  = false;

  // ─── CSS ────────────────────────────────────────────────────────────────────
  GM_addStyle(`
    /* Button */
    #ip-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 0 14px; height: 32px; border-radius: 16px;
      border: none; cursor: pointer;
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: 13px; font-weight: 500;
      transition: background .18s, box-shadow .18s, transform .1s;
      margin: 0 3px; white-space: nowrap;
    }
    #ip-btn.state-active {
      background: #1a73e8; color: #fff;
      box-shadow: 0 1px 3px rgba(26,115,232,.4);
    }
    #ip-btn.state-active:hover {
      background: #1557d4;
      box-shadow: 0 2px 8px rgba(26,115,232,.5);
      transform: translateY(-1px);
    }
    #ip-btn.state-paused {
      background: #d93025; color: #fff;
      box-shadow: 0 1px 3px rgba(217,48,37,.4);
      animation: ip-pulse 2s ease-in-out infinite;
    }
    #ip-btn.state-paused:hover {
      background: #b31412; animation: none;
      transform: translateY(-1px);
    }
    #ip-btn.state-loading {
      background: #e8eaed; color: #5f6368;
      cursor: wait; box-shadow: none;
    }
    @keyframes ip-pulse {
      0%,100% { box-shadow: 0 1px 3px rgba(217,48,37,.4); }
      50%      { box-shadow: 0 0 0 5px rgba(217,48,37,.16); }
    }
    #ip-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
      background: rgba(255,255,255,.28); font-size: 11px; font-weight: 700;
    }
    #ip-settings-btn {
      width: 28px; height: 28px; border-radius: 50%;
      border: none; background: transparent; cursor: pointer;
      color: #5f6368; display: inline-flex;
      align-items: center; justify-content: center;
      transition: background .15s; margin-left: 1px;
    }
    #ip-settings-btn:hover { background: #f1f3f4; }
    #ip-wrap { display: inline-flex; align-items: center; margin: 0 4px; }

    /* Banner */
    #ip-banner {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 10px 18px;
      background: linear-gradient(90deg, #1a73e8, #0d47a1);
      color: #fff; border-radius: 8px; margin: 8px 16px 0;
      box-shadow: 0 2px 8px rgba(26,115,232,.3);
      font-family: 'Google Sans', Roboto, sans-serif; font-size: 13px;
      flex-wrap: wrap;
    }
    #ip-banner.off { display: none !important; }
    #ip-banner-text { flex: 1; line-height: 1.4; }
    #ip-banner-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .ip-bbn {
      padding: 5px 13px; border-radius: 12px;
      border: 1.5px solid rgba(255,255,255,.55);
      background: transparent; color: #fff;
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background .15s;
    }
    .ip-bbn:hover { background: rgba(255,255,255,.2); border-color: #fff; }
    .ip-bbn.primary { background: rgba(255,255,255,.22); border-color: transparent; }
    .ip-bbn.primary:hover { background: rgba(255,255,255,.35); }

    /* Auth modal */
    #ip-auth-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.45); z-index: 99998;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(4px);
      animation: ip-fadein .15s ease;
    }
    #ip-auth-overlay.off { display: none !important; }
    @keyframes ip-fadein { from{opacity:0} to{opacity:1} }
    #ip-auth-box {
      background: #fff; border-radius: 14px;
      width: min(400px, 92vw); padding: 32px 28px;
      box-shadow: 0 8px 40px rgba(0,0,0,.28);
      text-align: center;
      animation: ip-slideup .2s cubic-bezier(.34,1.36,.64,1);
    }
    @keyframes ip-slideup { from{transform:translateY(20px);opacity:0} to{transform:none;opacity:1} }
    #ip-auth-box h2 {
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: 18px; font-weight: 500; color: #202124; margin-bottom: 8px;
    }
    #ip-auth-box p {
      font-family: Roboto, sans-serif; font-size: 13px;
      color: #5f6368; line-height: 1.55; margin-bottom: 22px;
    }
    .ip-auth-btn {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 11px 22px; border-radius: 10px;
      border: 1.5px solid #dadce0; background: #fff;
      font-family: 'Google Sans', Roboto, sans-serif;
      font-size: 14px; font-weight: 500; color: #3c4043;
      cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,.12);
      transition: box-shadow .2s, transform .15s;
    }
    .ip-auth-btn:hover { box-shadow: 0 3px 12px rgba(0,0,0,.2); transform: translateY(-1px); }
    .ip-auth-close {
      display: block; margin-top: 14px;
      font-family: Roboto, sans-serif; font-size: 12px;
      color: #9aa0a6; cursor: pointer; background: none;
      border: none; text-decoration: underline;
    }
    .ip-auth-close:hover { color: #5f6368; }

    /* Toast */
    #ip-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      background: #323232; color: #fff;
      font-family: 'Google Sans', Roboto, sans-serif; font-size: 13px;
      padding: 10px 20px; border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,.3);
      z-index: 99999; transition: opacity .3s, transform .3s;
    }
    #ip-toast.off { opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(8px); }
  `);

  // ─── GM_xmlhttpRequest → Promise ────────────────────────────────────────────
  function xhr(method, url, body) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: body ? JSON.stringify(body) : undefined,
        onload(r) {
          if (r.status === 401) { clearToken(); reject(new Error('auth')); return; }
          if (r.status === 204) { resolve(null); return; }
          try {
            const j = JSON.parse(r.responseText);
            if (r.status >= 400) { reject(new Error(j.error?.message || `API ${r.status}`)); return; }
            resolve(j);
          } catch (e) { reject(e); }
        },
        onerror(e) { reject(new Error('Network error')); },
      });
    });
  }

  function gapi(method, path, body) {
    return xhr(method, `https://gmail.googleapis.com/gmail/v1${path}`, body);
  }

  // ─── Token management ────────────────────────────────────────────────────────
  function loadToken() {
    const t   = GM_getValue('ip2_token', null);
    const exp = GM_getValue('ip2_expiry', 0);
    if (t && Date.now() < exp) { token = t; return true; }
    return false;
  }

  function storeToken(t, expiresIn) {
    token = t;
    GM_setValue('ip2_token', t);
    GM_setValue('ip2_expiry', Date.now() + expiresIn * 1000 - 60000);
  }

  function clearToken() {
    token = null;
    GM_deleteValue('ip2_token');
    GM_deleteValue('ip2_expiry');
  }

  // ─── OAuth popup ─────────────────────────────────────────────────────────────
  function requestAuth() {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT,
        response_type: 'token',
        scope: SCOPES,
        state: 'userscript',
        prompt: 'consent',
      });
      const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

      // Show auth modal
      showAuthModal(() => {
        const popup = window.open(url, 'ip-auth', 'width=500,height=650,left=200,top=100');

        const listener = (e) => {
          if (e.data?.type !== 'inbox-pause-token') return;
          window.removeEventListener('message', listener);
          hideAuthModal();
          storeToken(e.data.token, 3600);
          resolve(e.data.token);
        };
        window.addEventListener('message', listener);

        // Fallback: poll for popup close
        const poll = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(poll);
            window.removeEventListener('message', listener);
            if (!token) reject(new Error('Auth cancelled'));
          }
        }, 800);
      }, reject);
    });
  }

  function showAuthModal(onSignIn, onCancel) {
    let overlay = document.getElementById('ip-auth-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ip-auth-overlay';
      overlay.innerHTML = `
        <div id="ip-auth-box">
          <h2>⏸ Inbox Pause</h2>
          <p>Sign in with Google to enable true server-side inbox pausing. Your emails are controlled via the Gmail API — nothing is stored.</p>
          <button class="ip-auth-btn" id="ip-auth-google">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          <button class="ip-auth-close" id="ip-auth-cancel">Cancel</button>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.classList.remove('off');
    document.getElementById('ip-auth-google').onclick = () => onSignIn();
    document.getElementById('ip-auth-cancel').onclick = () => { hideAuthModal(); onCancel(new Error('Cancelled')); };
  }

  function hideAuthModal() {
    document.getElementById('ip-auth-overlay')?.classList.add('off');
  }

  // ─── Gmail API helpers ───────────────────────────────────────────────────────
  async function ensureToken() {
    if (token) return;
    if (loadToken()) return;
    await requestAuth();
  }

  async function getOrCreateLabel() {
    const d = await gapi('GET', '/users/me/labels');
    const x = d.labels.find(l => l.name === PAUSE_LABEL);
    if (x) return x.id;
    const c = await gapi('POST', '/users/me/labels', {
      name: PAUSE_LABEL,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
      color: { backgroundColor: '#c9daf8', textColor: '#000000' },
    });
    return c.id;
  }

  async function checkPauseState() {
    if (checking) return;
    checking = true;
    try {
      await ensureToken();
      const d   = await gapi('GET', '/users/me/labels');
      const lbl = d.labels.find(l => l.name === PAUSE_LABEL);
      if (!lbl) { paused = false; labelId = null; filterId = null; heldCount = 0; return; }
      labelId = lbl.id;

      const fd = await gapi('GET', '/users/me/settings/filters');
      const pf = (fd.filter || []).find(f =>
        f.action?.removeLabelIds?.includes('INBOX') &&
        f.action?.addLabelIds?.includes(labelId)
      );
      filterId = pf?.id || null;
      paused   = !!pf;
      heldCount = 0;
    } catch (e) {
      if (e.message !== 'auth') console.warn('[InboxPause]', e);
    } finally {
      checking = false;
    }
  }

  // ─── Signal email ─────────────────────────────────────────────────────────────
  const SIGNAL_SUBJECT = '⏸ Your inbox is paused';

  async function createSignalEmail() {
    try {
      const profile = await gapi('GET', '/users/me/profile');
      const addr    = profile.emailAddress;
      const body    = [
        `To: ${addr}`, `From: ${addr}`,
        `Subject: ${SIGNAL_SUBJECT}`,
        `Content-Type: text/html; charset=utf-8`, ``,
        `<div style="font-family:sans-serif;padding:20px;max-width:480px">`,
        `<h2 style="margin:0 0 10px">⏸ Your inbox is paused</h2>`,
        `<p style="color:#555;margin:0 0 16px">New emails are being held.</p>`,
        `<a href="${APP_URL}" style="display:inline-block;padding:10px 20px;background:#1a73e8;`,
        `color:white;border-radius:8px;text-decoration:none;font-weight:600">Unpause &amp; Deliver</a>`,
        `</div>`,
      ].join('\r\n');
      const encoded = btoa(unescape(encodeURIComponent(body)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const msg = await gapi('POST', '/users/me/messages/send', {
        raw: encoded,
      });
      GM_setValue('ip2_signal_id', msg.id);
    } catch (e) { console.warn('[InboxPause] Signal email failed:', e); }
  }

  async function deleteSignalEmail() {
    const id = GM_getValue('ip2_signal_id', null);
    if (!id) return;
    try {
      await gapi('DELETE', `/users/me/messages/${id}`);
      GM_deleteValue('ip2_signal_id');
    } catch (e) { console.warn('[InboxPause] Signal delete failed:', e); }
  }

  // ─── Pause ───────────────────────────────────────────────────────────────────
  async function doPause() {
    setButtonLoading();
    try {
      await ensureToken();
      labelId = await getOrCreateLabel();
      const f = await gapi('POST', '/users/me/settings/filters', {
        criteria: { size: 1, sizeComparison: 'larger' },
        action: { removeLabelIds: ['INBOX'], addLabelIds: [labelId] },
      });
      filterId = f.id; paused = true; heldCount = 0;
      await createSignalEmail();
      updateUI(); toast('Inbox paused ⏸');
    } catch (e) {
      if (e.message !== 'auth' && e.message !== 'Cancelled') toast('Error: ' + e.message);
      await checkPauseState(); updateUI();
    }
  }

  // ─── Unpause ─────────────────────────────────────────────────────────────────
  async function doUnpause() {
    setButtonLoading();
    try {
      await ensureToken();
      if (filterId) await gapi('DELETE', `/users/me/settings/filters/${filterId}`);
      await deleteSignalEmail();
      if (labelId) {
        let pt = null;
        do {
          const url = `/users/me/messages?labelIds=${labelId}&maxResults=100${pt ? `&pageToken=${pt}` : ''}`;
          const md  = await gapi('GET', url);
          const msgs = md.messages || [];
          if (msgs.length) {
            await gapi('POST', '/users/me/messages/batchModify', {
              ids: msgs.map(m => m.id),
              addLabelIds: ['INBOX'],
              removeLabelIds: [labelId],
            });
          }
          pt = md.nextPageToken;
        } while (pt);
      }
      paused = false; filterId = null; heldCount = 0;
      updateUI(); toast('Inbox unpaused — emails delivered ▶');
    } catch (e) {
      if (e.message !== 'auth' && e.message !== 'Cancelled') toast('Error: ' + e.message);
      await checkPauseState(); updateUI();
    }
  }

  async function handleToggle() {
    paused ? doUnpause() : doPause();
  }

  // ─── UI injection ────────────────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('ip-wrap')) return;

    const targets = ['.aic', '.G-atb', '[gh="tm"]', 'div.bkL'];
    let toolbar = null;
    for (const s of targets) { toolbar = document.querySelector(s); if (toolbar) break; }
    if (!toolbar) return;

    const wrap = document.createElement('span');
    wrap.id = 'ip-wrap';

    const btn = document.createElement('button');
    btn.id = 'ip-btn';
    btn.className = 'state-active';
    btn.addEventListener('click', handleToggle);
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2v6l2 2-2 2v6l16-8L6 2z"/></svg> Pause Inbox`;

    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'ip-settings-btn';
    settingsBtn.title = 'Inbox Pause Settings — open web app';
    settingsBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.56-1.62.94L5.24 5.33c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.22-.07.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94L2.86 14.52c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;
    settingsBtn.addEventListener('click', () => window.open(APP_URL, '_blank'));

    wrap.appendChild(btn);
    wrap.appendChild(settingsBtn);
    toolbar.prepend(wrap);
  }

  function injectBanner() {
    if (document.getElementById('ip-banner')) return;
    const main = document.querySelector('.AO, [role="main"], .nH.oy8Mbf');
    if (!main) return;
    const banner = document.createElement('div');
    banner.id = 'ip-banner';
    banner.className = 'off';
    banner.innerHTML = `
      <span id="ip-banner-text">Your inbox is paused. New emails are being held.</span>
      <div id="ip-banner-actions">
        <button class="ip-bbn" id="ip-deliver-btn">Deliver now</button>
        <button class="ip-bbn primary" onclick="window.open('${APP_URL}','_blank')">⚙ Settings</button>
        <button class="ip-bbn primary" id="ip-unpause-btn">Unpause</button>
      </div>`;
    main.prepend(banner);
    banner.querySelector('#ip-deliver-btn').addEventListener('click', doUnpause);
    banner.querySelector('#ip-unpause-btn').addEventListener('click', doUnpause);
  }

  function injectToast() {
    if (document.getElementById('ip-toast')) return;
    const t = document.createElement('div');
    t.id = 'ip-toast'; t.className = 'off';
    document.body.appendChild(t);
  }

  // ─── UI update ───────────────────────────────────────────────────────────────
  function updateUI() {
    updateButton();
    updateBanner();
  }

  function updateButton() {
    const btn = document.getElementById('ip-btn');
    if (!btn) return;
    if (paused) {
      btn.className = 'state-paused';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Paused`;
    } else {
      btn.className = 'state-active';
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2v6l2 2-2 2v6l16-8L6 2z"/></svg> Pause Inbox`;
    }
  }

  function setButtonLoading() {
    const btn = document.getElementById('ip-btn');
    if (btn) { btn.className = 'state-loading'; btn.textContent = '…'; }
  }

  function updateBanner() {
    const banner = document.getElementById('ip-banner');
    if (!banner) return;
    if (paused) {
      banner.classList.remove('off');
      const textEl = document.getElementById('ip-banner-text');
      if (textEl) textEl.textContent = 'Your inbox is paused. New emails are being held.';
    } else {
      banner.classList.add('off');
    }
  }

  let toastT;
  function toast(msg) {
    const t = document.getElementById('ip-toast');
    if (!t) return;
    t.textContent = msg; t.classList.remove('off');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.add('off'), 3000);
  }

  // ─── MutationObserver (SPA navigation) ──────────────────────────────────────
  let observer = null;
  function startObserver() {
    if (observer) observer.disconnect();
    const root = document.querySelector('.AO, [role="main"], .nH') || document.body;
    observer = new MutationObserver(() => {
      if (!document.getElementById('ip-wrap')) { injectButton(); updateButton(); }
      if (!document.getElementById('ip-banner')) { injectBanner(); updateBanner(); }
    });
    observer.observe(root, { childList: true, subtree: true });
  }

  let lastHash = '';
  function watchNav() {
    setInterval(() => {
      if (location.hash !== lastHash) {
        lastHash = location.hash;
        setTimeout(() => {
          injectButton(); injectBanner(); updateUI(); startObserver();
        }, 900);
      }
    }, 500);
  }

  // ─── Keyboard shortcut ───────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') { e.preventDefault(); handleToggle(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'I') { e.preventDefault(); window.open(APP_URL, '_blank'); }
  });

  // ─── Tampermonkey menu ───────────────────────────────────────────────────────
  GM_registerMenuCommand('⏸ Toggle Inbox Pause  (Ctrl+Shift+P)', handleToggle);
  GM_registerMenuCommand('⚙ Open Inbox Pause Settings', () => window.open(APP_URL, '_blank'));
  GM_registerMenuCommand('🔓 Sign out / reset token', () => { clearToken(); toast('Signed out. Reload to re-authenticate.'); });

  // ─── Init ────────────────────────────────────────────────────────────────────
  function waitForGmail(cb, tries = 0) {
    const ready = document.querySelector('.aic, .G-atb, [role="main"], .nH, .bkL');
    if (ready) { cb(); }
    else if (tries < 30) { setTimeout(() => waitForGmail(cb, tries + 1), 600); }
    else { console.warn('[InboxPause] Gmail UI not found'); }
  }

  async function init() {
    injectButton();
    injectBanner();
    injectToast();
    startObserver();
    watchNav();

    // Load token silently, check state
    if (loadToken()) {
      try {
        await checkPauseState();
        updateUI();
      } catch (e) {
        console.warn('[InboxPause] State check failed:', e);
      }
    } else {
      // No token yet — button shows but auth happens on first click
      updateUI();
    }

    // Poll every 5 min to stay in sync with web app changes
    setInterval(async () => {
      if (!token) return;
      await checkPauseState();
      updateUI();
    }, 5 * 60 * 1000);

    console.info('[InboxPause v2] ✅ Ready. Ctrl+Shift+P to toggle.');
  }

  waitForGmail(init);

})();
