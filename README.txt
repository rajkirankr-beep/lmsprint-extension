LMSprint — LMS Bulk Downloader (Chrome Extension)

VERSION 2.0.0

WHAT IT DOES
- Scans the currently open course page on https://lmsug25.iiitkottayam.ac.in/ (or *.iiitkottayam.ac.in).
- Detects PDF and PowerPoint (PPT, PPTX) resources:
  * Direct file links and Moodle pluginfile.php links
  * Resolves Moodle resource-view pages (/mod/resource/view.php) using your existing authenticated session
  * Inspects redirect URLs, Content-Disposition headers, and embedded HTML viewers
- Selective Downloads:
  * Checkbox for each resource, with all items selected by default
  * Select All / Deselect All quick controls
  * Primary download CTA dynamically shows selected file count (e.g., "Download 12 Files")
- Compact File Type Filters:
  * Filter tabs: "All", "PDFs", and "PPTs" with item counts
  * Switching filters updates view without losing selections on hidden items
  * Download button reflects the total selected files to download
- Filename Resolution & Preservation:
  * Resolves actual filenames from pluginfile URLs or Content-Disposition headers
  * Preserves course resource titles when direct filenames are generic (avoids "view(1).pdf")
  * Sanitizes illegal characters and handles duplicates (e.g., "Slides (2).pptx")
  * Skips folders (/mod/folder/) and unsupported files (ZIP, RAR, DOCX, etc.)
- Downloads via Chrome's download manager into Downloads/IIITK_LMS with progress tracking.
- Minimal, high-contrast dark industrial UI with electric lime (#E2FF32) accents.

INSTALL / UPDATE
1. Open Chrome and go to chrome://extensions.
2. Enable "Developer mode" in the top-right corner.
3. Click "Load unpacked" and select the extension directory containing manifest.json.
   (If updating an existing install, click the "Reload" icon on the LMSprint card).
4. Sign in to https://lmsug25.iiitkottayam.ac.in/.
5. Navigate to any course page containing lecture slides or documents.
6. Click the LMSprint extension icon in the Chrome toolbar.
7. Filter by All / PDFs / PPTs, customize selections, and click "Download N Files".
8. If prompted by Chrome, allow multiple downloads for the LMS domain.

SECURITY & PRIVACY
- Runs entirely in your local browser.
- Does not collect, log, or transmit any credentials, tokens, or session cookies.
- All downloads use the browser's active authenticated session.
- Moodle resource pages that cannot be resolved to a PDF/PPT/PPTX are safely skipped.
