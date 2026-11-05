/*
 * Sabbtical — editable scrapbook homepage
 * Static-site friendly: no build tools or credentials required.
 * The first version saves only to this browser, by design.
 * Future shared authentication and persistence belong in a separate, permissioned backend.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'sabbtical-homepage-v1';
  const defaults = () => ({
    version: 1,
    title: ['Connor &', 'Victoria'],
    titleSize: 100,
    background: '',
    photos: Array.from({ length: 3 }, () => ({
      src: '', label: '', url: '', showLabel: false,
      zoom: 100, x: 50, y: 50
    }))
  });

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const limit = (n, min, max, fallback) => {
    const num = Number(n);
    return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback;
  };
  const safeImage = (s) => typeof s === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(s) && s.length < 4_400_000 ? s : '';
  const safeText = (s, max = 60) => typeof s === 'string' ? s.slice(0, max) : '';
  function safeLink(s) {
    const text = safeText(s, 600).trim();
    if (!text) return '';
    if (/^#[a-zA-Z][\w-]*$/.test(text)) return text;
    if (/^\/(?!\/)[a-zA-Z0-9/_?#.&=%-]*$/.test(text)) return text;
    try {
      const parsed = new URL(text);
      return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : '';
    } catch { return ''; }
  }
  function sanitize(data) {
    const d = defaults();
    if (!data || typeof data !== 'object') return d;
    if (Array.isArray(data.title)) {
      d.title[0] = safeText(data.title[0] || '', 45);
      d.title[1] = safeText(data.title[1] || '', 45);
    }
    d.titleSize = limit(data.titleSize, 75, 120, 100);
    d.background = safeImage(data.background);
    if (Array.isArray(data.photos)) {
      d.photos = d.photos.map((empty, i) => {
        const p = data.photos[i] || {};
        return {
          src: safeImage(p.src),
          label: safeText(p.label, 50),
          url: safeLink(p.url),
          showLabel: p.showLabel === true,
          zoom: limit(p.zoom, 100, 220, 100),
          x: limit(p.x, 0, 100, 50),
          y: limit(p.y, 0, 100, 50)
        };
      });
    }
    return d;
  }

  let state = defaults();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = sanitize(JSON.parse(saved));
  } catch (err) { console.warn('Local design edits could not be loaded.', err); }

  let isEditing = false;
  let selected = 0;
  let toastTimer = null;
  const title1 = $('#titleLine1');
  const title2 = $('#titleLine2');
  const frameEls = $$('.photo-frame');
  const paperFabricFallback = 'linear-gradient(90deg,rgba(21,5,5,.13),transparent 21%,rgba(14,4,4,.06) 72%,rgba(17,4,4,.10))';
  const inputMap = {
    line1: $('#line1Input'), line2: $('#line2Input'),
    navLabel: $('#navLabelInput'), navUrl: $('#navUrlInput'),
    showLabel: $('#showLabelInput'), zoom: $('#zoomInput'),
    x: $('#positionXInput'), y: $('#positionYInput'), typeSize: $('#typeSize')
  };

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      $('#saveStatusText').textContent = 'Saved in this browser';
      return true;
    } catch (err) {
      console.warn('Unable to save homepage; browser storage may be full.', err);
      const blocked = err && err.name === 'SecurityError';
      $('#saveStatusText').textContent = blocked ? 'Preview storage restricted — export to save' : 'Could not save — export your edits';
      showToast(blocked ? 'This preview cannot save changes locally. Use Download my edits.' : 'Browser storage is full. Download your edits as a backup.');
      return false;
    }
  }
  const apply = (save = true) => {
    title1.textContent = state.title[0] || ' ';
    title2.textContent = state.title[1] || ' ';
    $('.invitation-contents').style.setProperty('--lettering-scale', String(state.titleSize / 100));

    $$('.fabric').forEach(el => {
      if (state.background) {
        el.style.backgroundImage = `${paperFabricFallback}, url("${state.background}")`;
        el.style.backgroundSize = '100% 100%, auto 980px';
      } else {
        el.style.backgroundImage = '';
        el.style.backgroundSize = '';
      }
    });

    state.photos.forEach((photo, i) => {
      const el = frameEls[i];
      const image = el.querySelector('.frame-upload');
      const label = el.querySelector('.frame-label');
      image.hidden = !photo.src;
      if (photo.src) image.src = photo.src;
      else image.removeAttribute('src');
      image.style.objectPosition = `${photo.x}% ${photo.y}%`;
      image.style.transform = `scale(${photo.zoom / 100})`;
      label.textContent = photo.label;
      label.hidden = !photo.showLabel || !photo.label;
      if (photo.url) {
        el.setAttribute('href', photo.url);
        if (/^https?:\/\//i.test(photo.url)) {
          el.target = '_blank'; el.rel = 'noopener noreferrer';
        } else {
          el.removeAttribute('target'); el.removeAttribute('rel');
        }
      } else {
        el.removeAttribute('href'); el.removeAttribute('target'); el.removeAttribute('rel');
      }
      el.setAttribute('aria-label', photo.label ? `Photo frame ${i + 1}: ${photo.label}${photo.url ? '' : ', destination not set'}` : `Photo frame ${i + 1}, destination not set`);
      el.classList.toggle('active-edit', isEditing && selected === i);
    });
    document.title = `${[...state.title].filter(Boolean).join(' ')} — Sabbtical`;
    if (save) persist();
  };

  function refreshEditor() {
    inputMap.line1.value = state.title[0];
    inputMap.line2.value = state.title[1];
    inputMap.typeSize.value = String(state.titleSize);
    const photo = state.photos[selected];
    inputMap.navLabel.value = photo.label;
    inputMap.navUrl.value = photo.url;
    inputMap.showLabel.checked = photo.showLabel;
    inputMap.zoom.value = String(photo.zoom);
    inputMap.x.value = String(photo.x);
    inputMap.y.value = String(photo.y);
    $('#selectedFrameText').textContent = `Editing photo ${selected + 1}`;
    $$('.frame-select').forEach(button => {
      const active = Number(button.dataset.select) === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#removePhoto').disabled = !photo.src;
    $('#removePhoto').style.opacity = photo.src ? '1' : '.45';
  }

  function setEdit(next) {
    isEditing = Boolean(next);
    document.body.classList.toggle('editing', isEditing);
    const panel = $('#editorPanel');
    panel.classList.toggle('open', isEditing);
    panel.setAttribute('aria-hidden', String(!isEditing));
    $('#editToggle').setAttribute('aria-expanded', String(isEditing));
    $('#panelOverlay').hidden = !isEditing;
    if (isEditing) {
      refreshEditor();
      setTimeout(() => $('#line1Input').focus(), 130);
    } else {
      $('#editToggle').focus();
    }
    apply(false);
  }

  $('#editToggle').addEventListener('click', () => setEdit(!isEditing));
  $('#closeEditor').addEventListener('click', () => setEdit(false));
  $('#doneEditing').addEventListener('click', () => setEdit(false));
  $('#panelOverlay').addEventListener('click', () => setEdit(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isEditing) setEdit(false);
  });

  frameEls.forEach((el, i) => {
    el.addEventListener('click', event => {
      if (isEditing) {
        event.preventDefault();
        selected = i;
        refreshEditor();
        apply(false);
        return;
      }
      if (!state.photos[i].url) {
        event.preventDefault();
        showToast('This photo doesn\'t have a destination yet.');
      }
    });
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !state.photos[i].url) {
        event.preventDefault();
        if (isEditing) { selected = i; refreshEditor(); apply(false); }
      }
    });
  });
  $$('.frame-select').forEach(button => button.addEventListener('click', () => {
    selected = Number(button.dataset.select);
    refreshEditor();
    apply(false);
  }));

  inputMap.line1.addEventListener('input', event => { state.title[0] = safeText(event.target.value, 45); apply(); });
  inputMap.line2.addEventListener('input', event => { state.title[1] = safeText(event.target.value, 45); apply(); });
  inputMap.typeSize.addEventListener('input', event => { state.titleSize = limit(event.target.value, 75, 120, 100); apply(); });
  inputMap.navLabel.addEventListener('input', event => { state.photos[selected].label = safeText(event.target.value, 50); apply(); });
  inputMap.navUrl.addEventListener('change', event => {
    const parsed = safeLink(event.target.value);
    if (event.target.value.trim() && !parsed) showToast('Please use an http(s) link or a #section link.');
    state.photos[selected].url = parsed;
    inputMap.navUrl.value = parsed;
    apply();
  });
  inputMap.showLabel.addEventListener('change', event => { state.photos[selected].showLabel = event.target.checked; apply(); });
  ['zoom', 'x', 'y'].forEach(key => inputMap[key].addEventListener('input', event => {
    state.photos[selected][key] = Number(event.target.value);
    apply();
  }));

  async function imageAsDataUrl(file, maxWidth = 1450, maxHeight = 1900, quality = .84) {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Please choose a PNG, JPG, or WebP image.');
    if (file.size > 20 * 1024 * 1024) throw new Error('This file is too large. Choose an image under 20 MB.');
    const objectURL = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectURL;
      await image.decode();
      const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser cannot process this photo.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', quality);
    } finally { URL.revokeObjectURL(objectURL); }
  }

  $('#photoInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const forIndex = selected;
    try {
      const image = await imageAsDataUrl(file);
      state.photos[forIndex].src = image;
      apply();
      refreshEditor();
      showToast(`Photo ${forIndex + 1} updated`);
    } catch (err) { showToast(err.message || 'Could not read the image.'); }
    event.target.value = '';
  });
  $('#removePhoto').addEventListener('click', () => {
    state.photos[selected].src = '';
    apply(); refreshEditor(); showToast(`Photo ${selected + 1} removed`);
  });
  $('#backgroundInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      state.background = await imageAsDataUrl(file, 1200, 1400, .76);
      apply(); showToast('Background changed');
    } catch (err) { showToast(err.message || 'Could not load background.'); }
    event.target.value = '';
  });
  $('#resetBackground').addEventListener('click', () => {
    state.background = '';
    apply(); showToast('Original fabric restored');
  });
  $('#exportBackup').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `sabbtical-homepage-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3500);
    showToast('Your edits have been downloaded');
  });
  $('#importBackup').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Backup file is too large.');
      const parsed = JSON.parse(await file.text());
      if (parsed.version !== 1 || !Array.isArray(parsed.photos)) throw new Error('This is not a Sabbtical homepage backup.');
      state = sanitize(parsed); selected = 0;
      apply(); refreshEditor(); showToast('Saved edits imported');
    } catch (err) { showToast(err.message || 'Could not import this backup.'); }
    event.target.value = '';
  });
  $('#resetAll').addEventListener('click', () => {
    if (!window.confirm('Restore the original homepage in this browser? Your uploaded pictures and saved edits will be removed unless you exported a backup.')) return;
    state = defaults(); selected = 0;
    apply(); refreshEditor(); showToast('Original design restored');
  });

  apply(false);
  refreshEditor();
  if (new URLSearchParams(location.search).get('edit') === '1') setEdit(true);
})();