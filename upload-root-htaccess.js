const ftp = require('basic-ftp');
const path = require('path');

async function run() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: 'ftp.innoventorysolutions.com',
            user: 'payslip@innoventorysolutions.com',
            password: 'Payslip123',
            secure: false
        });

        console.log("Uploading root .htaccess...");
        await client.uploadFrom(path.join(__dirname, '.htaccess'), '.htaccess');
        console.log("Upload complete!");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.close();
    }
}

run();
