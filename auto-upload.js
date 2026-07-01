const chokidar = require('chokidar');
const ftp = require('basic-ftp');
const path = require('path');

const FTP_HOST = 'ftp.innoventorysolutions.com'; // Adjust if host differs
const FTP_USER = 'payslip@innoventorysolutions.com';
const FTP_PASS = 'Payslip123';

const watchDir = __dirname;
// Files/directories to ignore
const ignoredPaths = [
    /(^|[\/\\])\../, // hidden files
    '**/node_modules/**',
    '**/.git/**',
    '**/auto-upload.js',
    '**/package.json',
    '**/package-lock.json',
    '**/docker-compose.yml',
    '**/Dockerfile'
];

async function uploadFile(localPath) {
    const client = new ftp.Client();
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        const relativePath = path.relative(watchDir, localPath).replace(/\\/g, '/');
        const remoteDir = path.dirname(relativePath);
        
        if (remoteDir !== '.') {
            await client.ensureDir(remoteDir);
        } else {
            await client.cd('/');
        }
        
        console.log(`[FTP] Uploading ${relativePath}...`);
        await client.uploadFrom(localPath, path.basename(localPath));
        console.log(`[FTP] Upload complete: ${relativePath}`);
    } catch (err) {
        console.error(`[FTP] Error uploading ${localPath}:`, err.message);
    } finally {
        client.close();
    }
}

async function removeFile(localPath) {
    const client = new ftp.Client();
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });
        const relativePath = path.relative(watchDir, localPath).replace(/\\/g, '/');
        console.log(`[FTP] Removing ${relativePath} from server...`);
        await client.remove(relativePath);
        console.log(`[FTP] Removed: ${relativePath}`);
    } catch (err) {
        console.error(`[FTP] Error removing ${localPath}:`, err.message);
    } finally {
        client.close();
    }
}

console.log(`Watching for file changes in ${watchDir}...`);
const watcher = chokidar.watch(watchDir, {
    ignored: ignoredPaths,
    persistent: true,
    ignoreInitial: true
});

watcher.on('add', path => uploadFile(path));
watcher.on('change', path => uploadFile(path));
watcher.on('unlink', path => removeFile(path));
