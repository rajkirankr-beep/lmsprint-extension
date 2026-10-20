const scanButton = document.getElementById('scan');
const downloadButton = document.getElementById('download');
const rescanButton = document.getElementById('rescan');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('list');
let foundLinks = [];

function setStatus(message) { statusEl.textContent = message; }

function scanCurrentPage() {
  return new Promise(async (resolve, reject) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url?.startsWith('https://lmsug25.iiitkottayam.ac.in/')) {
        reject(new Error('Open a page on lmsug25.iiitkottayam.ac.in first.'));
        return;
      }
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          const host = location.hostname;
          const anchors = [...document.querySelectorAll('a[href]')];
          const candidates = anchors.map(a => {
            const url = new URL(a.href, location.href);
            const label = (a.innerText || a.getAttribute('aria-label') || a.title || '').trim().replace(/\s+/g, ' ');
            const pathName = decodeURIComponent(url.pathname.split('/').pop() || '');
            return { url: url.href, label: label || pathName || url.href, pathName, hostMatch: url.hostname === host };
          }).filter(x => x.hostMatch);

          const isPdfName = value => /\.pdf$/i.test((value || '').split(/[?#]/)[0]);
          const isOfficeFile = value => /\.(?:ppt|pptx|odp|doc|docx|xls|xlsx|zip|rar)$/i.test((value || '').split(/[?#]/)[0]);
          const output = [];
          const seen = new Set();

          function add(url, label, filename) {
            if (!url || seen.has(url) || isOfficeFile(filename) || isOfficeFile(url)) return;
            seen.add(url);
            output.push({ url, label: label || filename || 'PDF document', filename: filename || '' });
          }

          for (const item of candidates) {
            // Direct PDF URLs (including Moodle pluginfile.php links) are the most reliable.
            if (isOfficeFile(item.pathName) || isOfficeFile(item.url)) continue;
            if (isPdfName(item.pathName) || isPdfName(item.url)) {
              add(item.url, item.label, item.pathName);
              continue;
            }

            // Only inspect Moodle resource links. Folder links and other activities are ignored.
            let parsed;
            try { parsed = new URL(item.url); } catch { continue; }
            if (!/\/mod\/resource\/view\.php$/i.test(parsed.pathname)) continue;

            // Resolve resource-view pages to the actual PDF while using the current logged-in session.
            try {
              const response = await fetch(item.url, { credentials: 'include', redirect: 'follow' });
              const finalUrl = response.url || item.url;
              const contentType = (response.headers.get('content-type') || '').toLowerCase();
              const finalPath = decodeURIComponent(new URL(finalUrl).pathname.split('/').pop() || '');

              if (contentType.includes('application/pdf') || isPdfName(finalPath) || isPdfName(finalUrl)) {
                add(finalUrl, item.label, isPdfName(finalPath) ? finalPath : '');
                continue;
              }

              if (contentType.includes('text/html')) {
                const html = await response.text();
                const parsedDoc = new DOMParser().parseFromString(html, 'text/html');
                const embedded = [
                  ...parsedDoc.querySelectorAll('iframe[src], embed[src], object[data], a[href]')
                ].map(el => {
                  const raw = el.getAttribute('src') || el.getAttribute('data') || el.getAttribute('href');
                  if (!raw) return null;
                  try {
                    const u = new URL(raw, finalUrl);
                    const name = decodeURIComponent(u.pathname.split('/').pop() || '');
                    return { url: u.href, name, sameHost: u.hostname === host };
                  } catch { return null; }
                }).filter(x => x && x.sameHost && isPdfName(x.name));

                const match = embedded.find(x => !isOfficeFile(x.name));
                if (match) add(match.url, item.label, match.name);
              }
            } catch {
              // Ignore resource pages that cannot be resolved; never try downloading folders or PPTs.
            }
          }
          return output;
        }
      });
      resolve({ tab, links: results?.[0]?.result || [] });
    } catch (e) { reject(e); }
  });
}

scanButton.addEventListener('click', async () => {
  scanButton.disabled = true;
  downloadButton.disabled = true;
  listEl.replaceChildren();
  foundLinks = [];
  setStatus('Scanning page and resolving Moodle resource links…');
  try {
    const { links } = await scanCurrentPage();
    foundLinks = links;
    if (!links.length) {
      setStatus('No PDFs found on this page. PPTs, folders, and non-PDF resources are skipped. Make sure the page is loaded and try again.');
    } else {
      setStatus(`Found ${links.length} PDF(s). PPTs and folder links are skipped. Check the list, then download.`);
      links.forEach(link => {
        const li = document.createElement('li');
        li.textContent = makeFilename(link);
        li.title = link.url;
        listEl.appendChild(li);
      });
      downloadButton.disabled = false;
      rescanButton.hidden = false;
    }
  } catch (e) {
    setStatus(e.message || 'Could not scan this tab.');
  } finally { scanButton.disabled = false; }
});

rescanButton.addEventListener('click', () => scanButton.click());

downloadButton.addEventListener('click', async () => {
  if (!foundLinks.length) return;
  downloadButton.disabled = true;
  scanButton.disabled = true;
  let started = 0;
  const failures = [];
  setStatus(`Starting ${foundLinks.length} download(s)… Keep Chrome open.`);
  for (const link of foundLinks) {
    try {
      const filename = makeFilename(link);
      await chrome.downloads.download({
        url: link.url,
        filename: `IIITK_LMS/${filename}`,
        conflictAction: 'uniquify',
        saveAs: false
      });
      started++;
      setStatus(`Started ${started}/${foundLinks.length} download(s)…`);
      await new Promise(resolve => setTimeout(resolve, 350));
    } catch (e) {
      failures.push(`${makeFilename(link)}: ${e.message || 'download failed'}`);
    }
  }
  const summary = `Started ${started} of ${foundLinks.length} PDF download(s).`;
  setStatus(failures.length ? `${summary}\nSome links could not be started:\n${failures.slice(0, 5).join('\n')}` : `${summary}\nFiles are saved in Chrome's Downloads/IIITK_LMS folder. If a file fails, check Chrome's Downloads page and confirm you're signed in to the LMS.`);
  scanButton.disabled = false;
  downloadButton.disabled = false;
});

function makeFilename(link) {
  let name = (link.filename || '').trim();
  if (!name || /^(?:view|download)(?:\.php)?(?:\s*\(\d+\))?$/i.test(name)) {
    name = (link.label || '').trim();
  }
  // If the label includes a filename, use that rather than a generic resource-view name.
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
  name = name.replace(/\.pdf\.pdf$/i, '.pdf');
  if (!/\.pdf$/i.test(name)) name += '.pdf';
  if (!name || name === '.pdf') name = 'lms-document.pdf';
  return name.slice(0, 160);
}
