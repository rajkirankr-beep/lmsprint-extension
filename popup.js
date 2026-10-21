// LMSprint - LMS Resource Bulk Downloader
// Popup Controller & Page Scanner

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const statusBadge = document.getElementById('status-badge');
  const badgeText = document.getElementById('badge-text');
  const pageTitleEl = document.getElementById('page-title');
  const rescanBtn = document.getElementById('rescan-btn');
  const countsSummaryEl = document.getElementById('counts-summary');
  const resourceListEl = document.getElementById('resource-list');
  const downloadBtn = document.getElementById('download-btn');
  const downloadBtnText = document.getElementById('download-btn-text');
  const progressBox = document.getElementById('progress-box');
  const progressFill = document.getElementById('progress-fill');
  const statusMsgEl = document.getElementById('status-msg');

  // Tabs
  const tabAll = document.getElementById('tab-all');
  const tabPdf = document.getElementById('tab-pdf');
  const tabPpt = document.getElementById('tab-ppt');
  const countAllEl = document.getElementById('count-all');
  const countPdfEl = document.getElementById('count-pdf');
  const countPptEl = document.getElementById('count-ppt');

  // Select / Deselect All
  const selectAllBtn = document.getElementById('select-all-btn');
  const deselectAllBtn = document.getElementById('deselect-all-btn');

  // State
  let allResources = [];
  let currentFilter = 'all'; // 'all' | 'pdf' | 'ppt'
  let isScanning = false;
  let isDownloading = false;

  // Status message helper
  function setStatusMsg(msg, type = '') {
    statusMsgEl.textContent = msg;
    statusMsgEl.className = `status-msg ${type}`.trim();
  }

  // URL check for supported LMS
  function isSupportedLmsUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.hostname === 'lmsug25.iiitkottayam.ac.in' ||
        u.hostname.endsWith('.iiitkottayam.ac.in') ||
        u.hostname === 'iiitkottayam.ac.in';
    } catch {
      return false;
    }
  }

  // Sanitize and generate clean filenames
  function makeCleanFilename(item) {
    let name = (item.rawFilename || '').trim();

    // If rawFilename is generic, use label
    if (!name || /^(?:view|download|index)(?:\.php)?(?:\s*\(\d+\))?$/i.test(name)) {
      name = (item.label || '').trim();
    }

    // Strip Moodle accessibility artifacts
    name = name.replace(/\s+(?:File|Document|Resource)\s*$/i, '');

    // Strip illegal characters for Windows and POSIX
    name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();

    // Extension normalized based on resolved type
    const ext = item.type.toLowerCase();
    name = name.replace(/(?:\.(?:pdf|pptx|ppt))+$/i, '');

    if (!name || name === '_') {
      name = 'lms-resource';
    }

    name = `${name}.${ext}`;

    // Truncate overly long names safely preserving extension
    if (name.length > 160) {
      const extLen = ext.length + 1;
      name = name.slice(0, 160 - extLen) + `.${ext}`;
    }

    return name;
  }

  // Deduplicate filenames across the scan batch
  function uniquifyBatch(items) {
    const counts = new Map();
    return items.map((item, index) => {
      const cleanName = makeCleanFilename(item);
      const ext = `.${item.type.toLowerCase()}`;
      const base = cleanName.slice(0, -ext.length);

      let finalName = cleanName;
      if (!counts.has(cleanName)) {
        counts.set(cleanName, 1);
      } else {
        const nextNum = counts.get(cleanName) + 1;
        counts.set(cleanName, nextNum);
        finalName = `${base} (${nextNum})${ext}`;
      }

      return {
        id: `res_${index}_${Date.now()}`,
        url: item.url,
        label: item.label,
        type: item.type,
        filename: finalName,
        selected: true // Selected by default
      };
    });
  }

  // Filtered resources based on active tab
  function getFilteredResources() {
    if (currentFilter === 'pdf') {
      return allResources.filter(r => r.type === 'pdf');
    }
    if (currentFilter === 'ppt') {
      return allResources.filter(r => r.type === 'ppt' || r.type === 'pptx');
    }
    return allResources;
  }

  // Update CTA button label and disabled state
  function updateCtaButton() {
    const totalSelected = allResources.filter(r => r.selected).length;
    downloadBtnText.textContent = `Download ${totalSelected} File${totalSelected === 1 ? '' : 's'}`;
    downloadBtn.disabled = totalSelected === 0 || isDownloading || isScanning;
  }

  // Update tab counters & summary text
  function updateSummaryAndTabs() {
    const pdfCount = allResources.filter(r => r.type === 'pdf').length;
    const pptCount = allResources.filter(r => r.type === 'ppt' || r.type === 'pptx').length;
    const allCount = allResources.length;

    countAllEl.textContent = `(${allCount})`;
    countPdfEl.textContent = `(${pdfCount})`;
    countPptEl.textContent = `(${pptCount})`;

    if (allCount === 0) {
      countsSummaryEl.innerHTML = `No downloadable resources found`;
    } else {
      countsSummaryEl.innerHTML = `<span class="count-highlight">${pdfCount}</span> PDFs · <span class="count-highlight">${pptCount}</span> PPTs`;
    }
  }

  // Render resource list DOM
  function renderList() {
    resourceListEl.replaceChildren();
    const visibleItems = getFilteredResources();

    if (!allResources.length) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = `
        <div class="empty-state-title">No resources found</div>
        <div class="empty-state-desc">No PDF or PPT files detected on this page. Folders and other activities are skipped.</div>
      `;
      resourceListEl.appendChild(emptyDiv);
      return;
    }

    if (!visibleItems.length) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = `
        <div class="empty-state-title">No ${currentFilter.toUpperCase()} files</div>
        <div class="empty-state-desc">None of the detected resources match this filter.</div>
      `;
      resourceListEl.appendChild(emptyDiv);
      return;
    }

    visibleItems.forEach(item => {
      const row = document.createElement('div');
      row.className = `resource-item${item.selected ? ' selected' : ''}`;
      row.setAttribute('role', 'listitem');
      row.title = `${item.filename}\n${item.url}`;

      const checkWrap = document.createElement('div');
      checkWrap.className = 'checkbox-wrap';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.selected;
      checkbox.setAttribute('aria-label', `Select ${item.filename}`);

      // Checkbox click
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        item.selected = checkbox.checked;
        row.classList.toggle('selected', item.selected);
        updateCtaButton();
      });

      // Row click toggles
      row.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        item.selected = checkbox.checked;
        row.classList.toggle('selected', item.selected);
        updateCtaButton();
      });

      const badge = document.createElement('span');
      badge.className = `type-badge ${item.type}`;
      badge.textContent = item.type.toUpperCase();

      const nameEl = document.createElement('span');
      nameEl.className = 'filename';
      nameEl.textContent = item.filename;

      checkWrap.appendChild(checkbox);
      row.appendChild(checkWrap);
      row.appendChild(badge);
      row.appendChild(nameEl);

      resourceListEl.appendChild(row);
    });
  }

  // Filter tab selection
  function setFilter(filter) {
    currentFilter = filter;
    tabAll.classList.toggle('active', filter === 'all');
    tabPdf.classList.toggle('active', filter === 'pdf');
    tabPpt.classList.toggle('active', filter === 'ppt');
    // Note: Selection on hidden items is intentionally preserved!
    renderList();
    updateCtaButton();
  }

  tabAll.addEventListener('click', () => setFilter('all'));
  tabPdf.addEventListener('click', () => setFilter('pdf'));
  tabPpt.addEventListener('click', () => setFilter('ppt'));

  // Select / Deselect visible items in current filter
  selectAllBtn.addEventListener('click', () => {
    const visible = getFilteredResources();
    visible.forEach(r => { r.selected = true; });
    renderList();
    updateCtaButton();
  });

  deselectAllBtn.addEventListener('click', () => {
    const visible = getFilteredResources();
    visible.forEach(r => { r.selected = false; });
    renderList();
    updateCtaButton();
  });

  // Page scanning in active tab
  async function scanCurrentPage() {
    if (isScanning || isDownloading) return;
    isScanning = true;
    rescanBtn.disabled = true;
    downloadBtn.disabled = true;
    progressBox.classList.remove('active');
    setStatusMsg('Scanning page and resolving Moodle resource links…');

    try {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        statusBadge.className = 'status-badge connected';
        badgeText.textContent = 'Preview Mode';
        pageTitleEl.textContent = 'CS201: Data Structures & Algorithms';
        pageTitleEl.title = 'CS201: Data Structures & Algorithms';
        allResources = uniquifyBatch([
          { url: 'https://lmsug25.iiitkottayam.ac.in/pluginfile.php/1/Lecture_01_Intro.pdf', label: 'Lecture 01 - Introduction', rawFilename: 'Lecture_01_Intro.pdf', type: 'pdf' },
          { url: 'https://lmsug25.iiitkottayam.ac.in/pluginfile.php/2/Lecture_02_Trees.pptx', label: 'Lecture 02 - Binary Trees', rawFilename: 'Lecture_02_Trees.pptx', type: 'pptx' },
          { url: 'https://lmsug25.iiitkottayam.ac.in/pluginfile.php/3/Lecture_03_Graphs.ppt', label: 'Lecture 03 - Graph Algorithms', rawFilename: 'Lecture_03_Graphs.ppt', type: 'ppt' },
          { url: 'https://lmsug25.iiitkottayam.ac.in/pluginfile.php/4/Syllabus_2026.pdf', label: 'Course Syllabus', rawFilename: 'Syllabus_2026.pdf', type: 'pdf' }
        ]);
        updateSummaryAndTabs();
        renderList();
        updateCtaButton();
        setStatusMsg('Scan complete (Preview Mode). 4 resources detected.', 'success');
        return;
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        throw new Error('No active browser tab found.');
      }

      const isLms = isSupportedLmsUrl(tab.url);
      if (isLms) {
        statusBadge.className = 'status-badge connected';
        badgeText.textContent = 'LMS Ready';
      } else {
        statusBadge.className = 'status-badge';
        badgeText.textContent = 'Not on LMS';
        pageTitleEl.textContent = tab.title || 'Unsupported Page';
        pageTitleEl.title = tab.url;
        countsSummaryEl.textContent = 'Please open an IIITK LMS page first.';
        allResources = [];
        updateSummaryAndTabs();
        renderList();
        setStatusMsg('Open a page on lmsug25.iiitkottayam.ac.in and click Rescan.', 'warning');
        return;
      }

      // Execute in-page extraction
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const host = location.hostname;
          const h1 = document.querySelector('.page-header-headings h1, #page-header h1, h1');
          let pageTitle = (h1?.innerText || document.title || 'LMS Page').trim();
          pageTitle = pageTitle.replace(/\s*\|\s*.*$/, '').trim();
          pageTitle = pageTitle.replace(/^course\s*:\s*/i, '').trim();

          const isPdf = (v) => /\.pdf$/i.test((v || '').split(/[?#]/)[0]);
          const isPptx = (v) => /\.pptx$/i.test((v || '').split(/[?#]/)[0]);
          const isPpt = (v) => /\.ppt$/i.test((v || '').split(/[?#]/)[0]);
          const isUnsupported = (v) => /\.(?:odp|doc|docx|xls|xlsx|zip|rar|7z|tar|gz|mp4|mkv|avi|mov|mp3|wav|jpg|jpeg|png|gif|webp|svg)$/i.test((v || '').split(/[?#]/)[0]);

          function classifyType(filename, url = '', contentType = '') {
            const cleanName = (filename || '').split(/[?#]/)[0].toLowerCase();
            const cleanUrl = (url || '').split(/[?#]/)[0].toLowerCase();
            const ct = (contentType || '').toLowerCase();

            if (isPdf(cleanName) || isPdf(cleanUrl) || ct.includes('application/pdf')) return 'pdf';
            if (isPptx(cleanName) || isPptx(cleanUrl) || ct.includes('presentationml.presentation')) return 'pptx';
            if (isPpt(cleanName) || isPpt(cleanUrl) || ct.includes('powerpoint') || ct.includes('ms-powerpoint')) return 'ppt';
            return null;
          }

          const anchors = [...document.querySelectorAll('a[href]')];
          const rawCandidates = [];
          const seenCandidateHrefs = new Set();

          for (const a of anchors) {
            let u;
            try { u = new URL(a.href, location.href); } catch { continue; }
            if (u.hostname !== host && !u.hostname.includes('iiitkottayam.ac.in')) continue;

            const cleanHref = u.origin + u.pathname + u.search;
            if (seenCandidateHrefs.has(cleanHref)) continue;
            seenCandidateHrefs.add(cleanHref);

            // Clean title / label
            let label = '';
            const instEl = a.querySelector('.instancename');
            if (instEl) {
              const clone = instEl.cloneNode(true);
              clone.querySelectorAll('.accesshide').forEach(el => el.remove());
              label = clone.innerText.trim();
            }
            if (!label) {
              label = (a.innerText || a.getAttribute('aria-label') || a.title || '').trim().replace(/\s+/g, ' ');
            }
            label = label.replace(/\s+(?:File|Document|Resource)\s*$/i, '').trim();

            const segs = u.pathname.split('/').filter(Boolean);
            const pathName = decodeURIComponent(segs[segs.length - 1] || '');

            rawCandidates.push({
              url: cleanHref,
              label,
              pathName,
              pathname: u.pathname
            });
          }

          const discovered = [];
          const seenFinalUrls = new Set();

          function addDiscovered(url, label, rawFilename, type) {
            if (!url || seenFinalUrls.has(url) || !type) return;
            seenFinalUrls.add(url);
            discovered.push({
              url,
              label: label || rawFilename || 'LMS Resource',
              rawFilename: rawFilename || '',
              type
            });
          }

          for (const item of rawCandidates) {
            // Direct matches (including pluginfile.php links ending with supported extension)
            if (isUnsupported(item.pathName) || isUnsupported(item.url)) continue;

            const directType = classifyType(item.pathName, item.url);
            if (directType) {
              addDiscovered(item.url, item.label, item.pathName, directType);
              continue;
            }

            // Inspect Moodle resource view links (/mod/resource/view.php)
            // Explicitly ignore /mod/folder/, /mod/assign/, /mod/quiz/, etc.
            if (!/\/mod\/resource\/view\.php$/i.test(item.pathname)) continue;

            try {
              const response = await fetch(item.url, { credentials: 'include', redirect: 'follow' });
              const finalUrl = response.url || item.url;
              const contentType = (response.headers.get('content-type') || '').toLowerCase();
              const contentDisp = response.headers.get('content-disposition') || '';

              let dispFilename = '';
              if (contentDisp) {
                const cdMatch = contentDisp.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i);
                if (cdMatch && cdMatch[1]) {
                  dispFilename = decodeURIComponent(cdMatch[1].trim());
                }
              }

              const finalUrlObj = new URL(finalUrl);
              const finalSegs = finalUrlObj.pathname.split('/').filter(Boolean);
              const finalPath = decodeURIComponent(finalSegs[finalSegs.length - 1] || '');

              if (isUnsupported(dispFilename) || isUnsupported(finalPath) || isUnsupported(finalUrl)) {
                continue;
              }

              // Resolved to direct file or content-disposition
              const resolvedType = classifyType(dispFilename, finalUrl, contentType) || classifyType(finalPath);
              if (resolvedType) {
                addDiscovered(finalUrl, item.label, dispFilename || finalPath, resolvedType);
                continue;
              }

              // If HTML page returned, parse embedded media
              if (contentType.includes('text/html')) {
                const html = await response.text();
                const parsedDoc = new DOMParser().parseFromString(html, 'text/html');

                const embedElements = [
                  ...parsedDoc.querySelectorAll('iframe[src], embed[src], object[data], div.resourceworkaround a[href], div.resourcecontent a[href], a[href*="pluginfile.php"]')
                ];

                for (const el of embedElements) {
                  const rawSrc = el.getAttribute('src') || el.getAttribute('data') || el.getAttribute('href');
                  if (!rawSrc) continue;
                  try {
                    const u = new URL(rawSrc, finalUrl);
                    if (u.hostname !== host && !u.hostname.includes('iiitkottayam.ac.in')) continue;

                    const eSegs = u.pathname.split('/').filter(Boolean);
                    const eName = decodeURIComponent(eSegs[eSegs.length - 1] || '');
                    if (isUnsupported(eName) || isUnsupported(u.href)) continue;

                    const eType = classifyType(eName, u.href);
                    if (eType) {
                      addDiscovered(u.href, item.label, eName, eType);
                      break;
                    }
                  } catch { }
                }
              }
            } catch {
              // Ignore fetch failure
            }
          }

          return { pageTitle, items: discovered };
        }
      });

      const extracted = results?.[0]?.result;
      const rawItems = extracted?.items || [];
      const title = extracted?.pageTitle || tab.title || 'LMS Page';

      pageTitleEl.textContent = title;
      pageTitleEl.title = title;

      allResources = uniquifyBatch(rawItems);
      updateSummaryAndTabs();
      renderList();
      updateCtaButton();

      if (allResources.length > 0) {
        setStatusMsg(`Scan complete. ${allResources.length} downloadable resource(s) found.`, 'success');
      } else {
        setStatusMsg('Scan complete. No PDF, PPT, or PPTX resources found on this page.', 'warning');
      }
    } catch (err) {
      pageTitleEl.textContent = 'Scan Error';
      setStatusMsg(err.message || 'Could not scan current page.', 'error');
    } finally {
      isScanning = false;
      rescanBtn.disabled = false;
      updateCtaButton();
    }
  }

  // Rescan button
  rescanBtn.addEventListener('click', () => scanCurrentPage());

  // Download action
  downloadBtn.addEventListener('click', async () => {
    const selectedList = allResources.filter(r => r.selected);
    if (!selectedList.length || isDownloading) return;

    isDownloading = true;
    downloadBtn.disabled = true;
    rescanBtn.disabled = true;
    progressBox.classList.add('active');
    progressFill.style.width = '0%';

    let startedCount = 0;
    const rawTitle = pageTitleEl.textContent || 'LMS';
    const safeTitle = rawTitle.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_').trim().slice(0, 60);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const folderName = `${safeTitle}_${dateStr}_lms`;

    const failures = [];

    setStatusMsg(`Starting ${selectedList.length} download(s)… Keep Chrome open.`);

    if (typeof chrome === 'undefined' || !chrome.downloads) {
      for (let i = 0; i < selectedList.length; i++) {
        const item = selectedList[i];
        const pct = Math.round(((i + 1) / selectedList.length) * 100);
        progressFill.style.width = `${pct}%`;
        setStatusMsg(`Downloading ${i + 1} of ${selectedList.length}…\n${item.filename}`);
        await new Promise(res => setTimeout(res, 200));
      }
      progressFill.style.width = '100%';
      isDownloading = false;
      rescanBtn.disabled = false;
      updateCtaButton();
      setStatusMsg(`✓ Downloaded all ${selectedList.length} file(s) (Preview Mode).`, 'success');
      return;
    }

    for (let i = 0; i < selectedList.length; i++) {
      const item = selectedList[i];
      const pct = Math.round(((i) / selectedList.length) * 100);
      progressFill.style.width = `${pct}%`;
      setStatusMsg(`Downloading ${i + 1} of ${selectedList.length}…\n${item.filename}`);

      try {
        await chrome.downloads.download({
          url: item.url,
          filename: `${folderName}/${item.filename}`,
          conflictAction: 'uniquify',
          saveAs: false
        });
        startedCount++;
        // Small pause between downloads to avoid browser throttling
        await new Promise(res => setTimeout(res, 260));
      } catch (err) {
        failures.push(`${item.filename}: ${err.message || 'Failed'}`);
      }
    }

    progressFill.style.width = '100%';
    isDownloading = false;
    rescanBtn.disabled = false;
    updateCtaButton();

    if (failures.length === 0) {
      setStatusMsg(`✓ Started all ${startedCount} download(s).\nSaved to Chrome Downloads / IIITK_LMS`, 'success');
    } else {
      const summary = `Started ${startedCount} of ${selectedList.length} download(s). ${failures.length} failed:\n`;
      const errDetails = failures.slice(0, 3).join('\n') + (failures.length > 3 ? `\n…and ${failures.length - 3} more` : '');
      setStatusMsg(summary + errDetails, 'error');
    }
  });

  // Initial scan on load
  scanCurrentPage();
});
