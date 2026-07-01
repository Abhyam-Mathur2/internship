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

        console.log("Downloading /backend/storage/logs/laravel.log...");
        const localPath = path.join(__dirname, 'laravel-remote.log');
        await client.downloadTo(localPath, '/backend/storage/logs/laravel.log');
        
        console.log("Download complete!");
        const logs = fs.readFileSync(localPath, 'utf8');
        console.log("Last 2000 characters of logs:");
        console.log(logs.slice(-2000));
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

run();
