const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const FTP_HOST = 'ftp.innoventorysolutions.com'; 
const FTP_USER = 'payslip@innoventorysolutions.com';
const FTP_PASS = 'Payslip123';

const watchDir = __dirname;
const ignoredPatterns = [
    /^\./, // hidden files/folders like .git, .env
    /node_modules/,
    /auto-upload\.js/,
    /upload-all\.js/,
    /package\.json/,
    /package-lock\.json/,
    /docker-compose\.yml/,
    /Dockerfile/
];

function shouldIgnore(localPath) {
    const relativePath = path.relative(watchDir, localPath).replace(/\\/g, '/');
    return ignoredPatterns.some(pattern => pattern.test(relativePath));
}

async function uploadDirectory(client, localDir, remoteDir) {
    let items = [];
    try {
        items = fs.readdirSync(localDir);
    } catch (err) {
        console.warn(`[FTP] Skipping directory ${localDir}: ${err.message}`);
        return;
    }

    for (const item of items) {
        const localPath = path.join(localDir, item);
        
        if (shouldIgnore(localPath)) continue;

        try {
            const stat = fs.statSync(localPath);
            const itemRemotePath = remoteDir === '/' ? `/${item}` : `${remoteDir}/${item}`;

            if (stat.isDirectory()) {
                await client.ensureDir(itemRemotePath);
                await uploadDirectory(client, localPath, itemRemotePath);
                await client.cd(remoteDir); // go back
            } else {
                console.log(`[FTP] Uploading ${itemRemotePath}...`);
                await client.uploadFrom(localPath, item);
            }
        } catch (err) {
            console.warn(`[FTP] Skipping file/dir ${localPath}: ${err.message}`);
        }
    }
}

async function uploadAll() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });
        
        console.log("Starting full upload...");
        await uploadDirectory(client, watchDir, '/');
        console.log("Full upload complete!");
    } catch (err) {
        console.error("Error uploading:", err.message);
    } finally {
        client.close();
    }
}

uploadAll();
