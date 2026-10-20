IIITK LMS PDF Bulk Downloader (Chrome extension)

VERSION 1.1

WHAT IT DOES
- Scans the currently open page on https://lmsug25.iiitkottayam.ac.in/.
- Finds direct PDF links, including Moodle pluginfile.php links.
- Resolves Moodle resource-view pages to the actual PDF URL where possible, using your existing logged-in browser session.
- Uses the actual PDF filename from the URL when available; otherwise uses the Moodle resource title and adds .pdf.
- Skips PowerPoint, Office, archive, and Moodle folder links.
- Starts downloads using Chrome's built-in download manager and saves under Downloads/IIITK_LMS.

INSTALL / UPDATE
1. Extract iiitk_lms_pdf_downloader.zip.
2. In Chrome, open chrome://extensions.
3. Turn on Developer mode.
4. If updating an existing installation, remove the old extension or load the newly extracted folder using Load unpacked. If the old extension was already loaded from the same folder, replace its files and click Reload on the extension card.
5. Click Load unpacked and select the extracted folder containing manifest.json.
6. Sign in to https://lmsug25.iiitkottayam.ac.in/ as usual.
7. Open the LMS page containing the links.
8. Click the extension icon, then Scan this page.
9. Review the detected PDF filenames and click Download all PDFs.
10. If Chrome asks permission for multiple downloads, allow it for the LMS.

IMPORTANT LIMITATIONS
- Scans the current page only, not all courses automatically.
- Only scans normal links present on the page and resource-view pages that can be resolved by a same-origin request. Resources loaded only by custom scripts or unusual Moodle configurations may need extra handling.
- A resource-view page that cannot be resolved to a PDF is skipped rather than downloaded under a misleading name.
- The extension does not ask for or transmit your password or session cookies to an external server.
- If a download fails, confirm you're signed in and check Chrome's Downloads page for the error.
