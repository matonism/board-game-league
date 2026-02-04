const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const year = 2026;
const week = 2;
const group = 3;
// const fileSuffix = year + '_' + week + '_' + group;
const fileSuffix = '';

/**
 * Reads all files from the 'output' folder and uploads/replaces them on Drive.
 */
async function getAllFilesFromOutputFolder() {
  const outputDir = path.join(process.cwd(), 'output');

  try {

    await fs.access(outputDir);


    // 2. Read all filenames in the directory
    const files = await fs.readdir(outputDir);
    
    // 3. Filter out system files (like .DS_Store) and map to full paths
    const filePaths = files
      .filter(file => !file.startsWith('.')) 
      .map(file => path.join(outputDir, file));

    if (filePaths.length === 0) {
      console.log("No files found in the output folder.");
      return;
    }

    console.log(`Found ${filePaths.length} files. Starting upload...`);

    return filePaths;

  } catch (err) {
    console.error("Error reading directory:", err.message);
  }
}

/**
 * Reads previously authorized credentials from the save file.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to proceed.
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) return client;
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Uploads the CSV and converts it to a Google Sheet using your personal quota.
 */
async function uploadAndConvert(authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  
  const fileMetadata = {
    'name': 'Board Game Season 2026 Results',
    'mimeType': 'application/vnd.google-apps.spreadsheet',
    // Optional: Add your folder ID here if you want it in a specific spot
    'parents': ['1BcqE7TO46c5oGLTSRp8hPX-bjO7NB1-M']
  };

  const media = {
    mimeType: 'text/csv',
    body: require('fs').createReadStream('./output/BoardGameInsights_HomeLogic.csv'),
  };

  try {
    const res = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log('Success! File uploaded to your personal Drive.');
    console.log('View it here: https://docs.google.com/spreadsheets/d/' + res.data.id);
  } catch (err) {
    console.error('Upload Error:', err);
  }
}

/**
 * Uploads multiple files (CSV or TXT) to your personal Drive.
 * @param {google.auth.OAuth2} authClient 
 * @param {string[]} filePaths Array of file paths to upload
 */
async function uploadFiles(authClient, filePaths) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();

    // Configuration for different file types
    let driveMimeType = ''; // Leave blank for standard upload
    let sourceMimeType = 'text/plain';

    if (extension === '.csv') {
      // Convert CSV to Google Sheet
      driveMimeType = 'application/vnd.google-apps.spreadsheet';
      sourceMimeType = 'text/csv';
    } else if (extension === '.txt') {
      // Keep as plain text file (default behavior)
      sourceMimeType = 'text/plain';
    }

    const fileMetadata = {
      'name': fileName,
      'mimeType': driveMimeType || undefined,
      'parents': ['1BcqE7TO46c5oGLTSRp8hPX-bjO7NB1-M']
    };

    const media = {
      mimeType: sourceMimeType,
      body: require('fs').createReadStream(filePath),
    };

    try {
      const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name',
      });
      console.log(`Success! Uploaded ${res.data.name} (ID: ${res.data.id})`);
    } catch (err) {
      console.error(`Upload Error for ${fileName}:`, err.message);
    }
  }
}

/**
 * Uploads files to Drive. If a file with the same name exists, it replaces it.
 * @param {google.auth.OAuth2} authClient 
 * @param {string[]} filePaths Array of local file paths
 */
async function uploadOrReplaceFiles(authClient, filePaths) {
  const drive = google.drive({ version: 'v3', auth: authClient });

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();

    // 1. Search for existing file with this name (ignoring trashed files)
    const existingFiles = await drive.files.list({
      q: `name = '${fileName.split('.')[0]}' and trashed = false and '1BcqE7TO46c5oGLTSRp8hPX-bjO7NB1-M' in parents`,
      fields: 'files(id, name)'
    });

    const existingFileId = existingFiles.data.files.length > 0 
      ? existingFiles.data.files[0].id 
      : null;

    // 2. Determine MIME types
    let driveMimeType = (extension === '.csv') ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document';
    let sourceMimeType = (extension === '.csv') ? 'text/csv' : 'text/plain';

    const media = {
      mimeType: sourceMimeType,
      body: require('fs').createReadStream(filePath),
    };

    try {
      if (existingFileId) {
        // REPLACE: Update existing file content and metadata
        const res = await drive.files.update({
          fileId: existingFileId,
          media: media,
          // If it's a spreadsheet, we don't need to re-set the name/mimeType
          // unless you want to change them.
        });
        console.log(`Updated existing file: ${fileName} (ID: ${existingFileId})`);
      } else {
        // CREATE: Standard upload
        const res = await drive.files.create({
          requestBody: {
            name: fileName,
            mimeType: driveMimeType,
            'parents': ['1BcqE7TO46c5oGLTSRp8hPX-bjO7NB1-M']
          },
          media: media,
          fields: 'id',
        });
        console.log(`Created new file: ${fileName} (ID: ${res.data.id})`);
      }
    } catch (err) {
      console.error(`Error processing ${fileName}:`, err.message);
    }
  }
}

async function uploadOutput(){

    let files = await getAllFilesFromOutputFolder();

    // Call with an array of your files
    authorize()
    .then(auth => uploadOrReplaceFiles(auth, files))
    .catch(console.error);

}

uploadOutput();


// Run the flow
// authorize().then(uploadAndConvert).catch(console.error);