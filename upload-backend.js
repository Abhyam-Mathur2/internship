const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const FTP_HOST = 'ftp.innoventorysolutions.com'; 
const FTP_USER = 'payslip@innoventorysolutions.com';
const FTP_PASS = 'Payslip123';

async function uploadDirRecursive(client, localDir, remoteDir) {
    const items = fs.readdirSync(localDir);
    
    // Get list of existing items in the remote directory
    let remoteItemsMap = new Map();
    try {
        const remoteList = await client.list(remoteDir);
        for (const item of remoteList) {
            remoteItemsMap.set(item.name, item);
        }
    } catch (err) {
        // Directory might not exist yet
    }

    for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item === 'storage') {
            continue; // Skip large/system dirs early
        }
        const localPath = path.join(localDir, item);
        let stat;
        try {
            stat = fs.lstatSync(localPath);
            if (stat.isSymbolicLink()) {
                console.log(`Skipping symlink ${localPath}`);
                continue;
            }
        } catch (err) {
            console.warn(`Skipping un-statable file/dir ${localPath}: ${err.message}`);
            continue;
        }
        const remotePath = remoteDir === '/' ? `/${item}` : `${remoteDir}/${item}`;

        if (stat.isDirectory()) {
            await client.ensureDir(remotePath);
            await uploadDirRecursive(client, localPath, remotePath);
            await client.cd(remoteDir);
        } else {
            const remoteItem = remoteItemsMap.get(item);
            if (remoteItem && remoteItem.size === stat.size) {
                // Skip if same size
                continue;
            }
            console.log(`Uploading ${remotePath} (${stat.size} bytes)...`);
            await client.uploadFrom(localPath, item);
        }
    }
}

async function run() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        await client.access({
            host: FTP_HOST,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        console.log("Starting backend upload...");
        await client.ensureDir('/backend');
        await uploadDirRecursive(client, path.join(__dirname, 'backend'), '/backend');
        console.log("Backend upload complete!");
    } catch (err) {
        console.error("Error during upload:", err.stack || err.message);
    } finally {
        client.close();
    }
}

run();
