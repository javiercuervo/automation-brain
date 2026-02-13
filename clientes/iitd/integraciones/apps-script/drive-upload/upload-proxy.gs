/**
 * Drive Upload Proxy — Apps Script Web App
 *
 * Recibe PDFs en base64 via POST y los sube a Google Drive
 * como el usuario propietario (administracion@institutoteologia.org).
 *
 * Soluciona: "Service Accounts do not have storage quota"
 *
 * Deploy:
 *   1. Abrir https://script.google.com → Nuevo proyecto
 *   2. Pegar este código
 *   3. Deploy → New deployment → Web app
 *      - Execute as: Me (administracion@institutoteologia.org)
 *      - Who has access: Anyone (para que la SA pueda llamarlo)
 *   4. Copiar la URL del deployment → .env APPS_SCRIPT_UPLOAD_URL
 *
 * POST body (JSON):
 *   {
 *     "fileName": "recibo_GARCIA_JUAN.pdf",
 *     "base64":   "<base64 del PDF>",
 *     "folderId": "1w7YwgMmv2SKbV1DGH-QnvKVQhU3iDyAw",
 *     "mimeType": "application/pdf"
 *   }
 *
 * Response (JSON):
 *   { "ok": true, "fileId": "...", "url": "https://drive.google.com/file/d/.../view" }
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var fileName = body.fileName;
    var base64   = body.base64;
    var folderId = body.folderId;
    var mimeType = body.mimeType || 'application/pdf';

    if (!fileName || !base64 || !folderId) {
      return jsonResponse({ ok: false, error: 'Missing fileName, base64 or folderId' });
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);

    // Make viewable by anyone with link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      ok: true,
      fileId: file.getId(),
      url: 'https://drive.google.com/file/d/' + file.getId() + '/view?usp=sharing'
    });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ ok: true, service: 'drive-upload-proxy', version: '1.0' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
