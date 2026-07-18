const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const FTP_HOST = 'ftp.innoventorysolutions.com'; 
const FTP_USER = 'payslip@innoventorysolutions.com';
const FTP_PASS = 'Payslip123';

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        console.log("Ensuring remote /backend/public exists...");
        await client.ensureDir('/backend/public');

        const publicDir = path.join(__dirname, 'backend', 'public');
        const items = fs.readdirSync(publicDir);
        for (const item of items) {
            const localPath = path.join(publicDir, item);
            try {
                const stat = fs.lstatSync(localPath);
                if (stat.isSymbolicLink() || stat.isDirectory()) {
                    continue;
                }
                console.log(`Uploading backend/public/${item}...`);
                await client.uploadFrom(localPath, item);
            } catch (err) {
                console.warn(`Skipping ${item}: ${err.message}`);
            }
        }
        console.log("Upload of backend/public complete!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

run();
