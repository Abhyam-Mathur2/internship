const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const FTP_HOST = 'ftp.innoventorysolutions.com'; 
const FTP_USER = 'payslip@innoventorysolutions.com';
const FTP_PASS = 'Payslip123';

async function uploadDir(client, localDir, remoteDir) {
    const items = fs.readdirSync(localDir);
    for (const item of items) {
        const localPath = path.join(localDir, item);
        const stat = fs.statSync(localPath);
        const itemRemotePath = remoteDir === '/' ? `/${item}` : `${remoteDir}/${item}`;

        if (stat.isDirectory()) {
            await client.ensureDir(itemRemotePath);
            await uploadDir(client, localPath, itemRemotePath);
            await client.cd(remoteDir);
        } else {
            console.log(`[FTP] Uploading ${itemRemotePath}...`);
            await client.uploadFrom(localPath, item);
        }
    }
}

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        // 1. Upload Backend .env
        console.log("Uploading backend/.env...");
        await client.ensureDir('/backend');
        await client.uploadFrom(path.join(__dirname, 'backend', '.env'), '.env');

        // 2. Upload Frontend Dist files to root
        console.log("Uploading built frontend to root...");
        await uploadDir(client, path.join(__dirname, 'frontend', 'dist'), '/');
        
        console.log("Upload complete!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

run();
