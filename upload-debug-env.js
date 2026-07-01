const ftp = require('basic-ftp');
const path = require('path');

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

        console.log("Uploading backend/.env...");
        await client.ensureDir('/backend');
        await client.uploadFrom(path.join(__dirname, 'backend', '.env'), '.env');
        console.log("Upload complete!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

run();
