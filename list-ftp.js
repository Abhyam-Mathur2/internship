const ftp = require('basic-ftp');

async function listFtp() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: 'ftp.innoventorysolutions.com',
            user: 'payslip@innoventorysolutions.com',
            password: 'Payslip123',
            secure: false
        });
        
        async function scan(dir, depth = 0) {
            if (depth > 2) return;
            const indent = '  '.repeat(depth);
            console.log(`${indent}Scanning ${dir}:`);
            const list = await client.list(dir);
            for (const item of list) {
                if (item.type === 2) {
                    console.log(`${indent}  DIR: ${item.name}`);
                    await scan(dir === '/' ? `/${item.name}` : `${dir}/${item.name}`, depth + 1);
                } else {
                    console.log(`${indent}  FILE: ${item.name} (${item.size} bytes)`);
                }
            }
        }
        
        await scan('/');
    } catch (err) {
        console.error(err);
    } finally {
        client.close();
    }
}
listFtp();
