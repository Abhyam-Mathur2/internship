const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const FTP_HOST = 'ftp.innoventorysolutions.com'; 
const FTP_USER = 'payslip@innoventorysolutions.com';
const FTP_PASS = 'Payslip123';

async function uploadDir(client, localDir, remoteDir) {
    if (!fs.existsSync(localDir)) {
        console.error("Local directory does not exist:", localDir);
        return;
    }
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

        const distPath = path.join(__dirname, 'frontend', 'dist');
        console.log(`Uploading ${distPath} to FTP root...`);
        await uploadDir(client, distPath, '/');
        
        console.log("Upload complete!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

run();
