const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Initializing Shirtify Unified Platform...');

// Function to free up ports on Windows before starting the services
const freePort = (port) => {
    if (process.platform !== 'win32') return;
    try {
        const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = stdout.split('\n');
        const pids = new Set();
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 5) {
                const state = parts[3];
                const pid = parts[4];
                // Only kill if the connection is in LISTENING state or has a valid PID
                if (pid && pid !== '0' && (state === 'LISTENING' || line.includes('LISTENING'))) {
                    pids.add(pid);
                }
            }
        });
        pids.forEach(pid => {
            console.log(`🧹 Freeing port ${port} (Killing conflicting PID: ${pid})...`);
            try {
                execSync(`taskkill /F /PID ${pid}`);
            } catch (err) {}
        });
    } catch (e) {
        // netstat returns exit code 1 if no matches found, which is expected
    }
};

// Clean up ports 5000, 5001, and 5050
freePort(5000);
freePort(5001);
freePort(5050);

const children = [];
const resetColor = '\x1b[0m';

// Function to start MongoDB before starting other services
const startMongoDB = () => {
    return new Promise((resolve) => {
        console.log('📡 Checking if MongoDB is already running on port 27017...');
        let portInUse = false;
        try {
            const stdout = execSync('netstat -ano').toString();
            if (stdout.includes(':27017')) {
                portInUse = true;
                console.log('✅ Port 27017 is in use. Assuming MongoDB is already running.');
                resolve();
                return;
            }
        } catch (err) {
            // netstat failed or no output, assume not in use
        }

        console.log('MongoDB is not running. Preparing to start local mongod...');
        
        const dbOriginalPath = path.resolve(__dirname, 'data', 'db_original');
        const defaultSourcePath = 'C:\\Program Files\\MongoDB\\Server\\8.2\\data';
        
        // Ensure db_original exists and is populated
        if (!fs.existsSync(dbOriginalPath)) {
            console.log(`📁 Local db folder '${dbOriginalPath}' not found.`);
            if (fs.existsSync(defaultSourcePath)) {
                console.log(`📥 Copying database files from system installation: '${defaultSourcePath}'...`);
                try {
                    fs.mkdirSync(dbOriginalPath, { recursive: true });
                    execSync(`powershell -Command "Copy-Item -Path '${defaultSourcePath}\\*' -Destination '${dbOriginalPath}' -Recurse -Force"`);
                    console.log('✅ Copied database files successfully.');
                } catch (copyErr) {
                    console.error('⚠️ Failed to copy database files:', copyErr.message);
                }
            } else {
                console.log('📁 System database path not found. Creating empty data directory...');
                fs.mkdirSync(dbOriginalPath, { recursive: true });
            }
        }

        // Find mongod.exe
        let mongodExe = 'mongod'; // Fallback to PATH
        const possiblePaths = [
            'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
            'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
            'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe'
        ];
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                mongodExe = p;
                break;
            }
        }

        console.log(`🚀 Spawning mongod.exe from: ${mongodExe}`);
        const mongod = spawn(mongodExe, ['--dbpath', dbOriginalPath, '--port', '27017'], {
            shell: false,
            detached: false
        });

        children.push(mongod);

        let resolved = false;
        
        // Handle stdout logs
        mongod.stdout.on('data', (data) => {
            const output = data.toString();
            // Silence verbose MongoDB logs unless they contain startup completion or connections wait
            if (output.includes('Waiting for connections') || output.includes('startup complete')) {
                if (!resolved) {
                    console.log('✅ MongoDB started and waiting for connections.');
                    resolved = true;
                    resolve();
                }
            }
        });

        mongod.stderr.on('data', (data) => {
            console.error(`[MongoDB Error] ${data.toString().trim()}`);
        });

        mongod.on('close', (code) => {
            console.log(`[MongoDB] Exited with code ${code}`);
            if (!resolved) {
                resolved = true;
                resolve();
            }
        });

        // Timeout fallback: resolve after 5 seconds anyway
        setTimeout(() => {
            if (!resolved) {
                console.log('⚠️ MongoDB startup wait timed out. Continuing...');
                resolved = true;
                resolve();
            }
        }, 5000);
    });
};

// Define the three processes to start
const processes = [
    {
        name: 'Node Backend',
        command: 'node',
        args: ['backend/server.js'],
        cwd: path.resolve(__dirname),
        color: '\x1b[36m' // Cyan
    },
    {
        name: 'ML Service  ',
        command: process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python',
        args: ['app.py'],
        cwd: path.resolve(__dirname, 'admin side', 'backend', 'ml_service'),
        color: '\x1b[32m' // Green
    },
    {
        name: 'Try-On Service',
        command: process.platform === 'win32' ? '..\\..\\.venv\\Scripts\\python.exe' : '../../.venv/bin/python',
        args: ['tryon_pipeline.py'],
        cwd: path.resolve(__dirname, 'frontend', 'New folder'),
        color: '\x1b[35m' // Magenta
    }
];

const startServices = () => {
    processes.forEach(proc => {
        console.log(`Starting ${proc.color}${proc.name}${resetColor}...`);
        
        const child = spawn(proc.command, proc.args, {
            cwd: proc.cwd,
            shell: true
        });
        
        children.push(child);
        
        // Pipe stdout with a prefix
        child.stdout.on('data', data => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                const cleaned = line.trim();
                if (cleaned) console.log(`${proc.color}[${proc.name}]${resetColor} ${cleaned}`);
            });
        });
        
        // Pipe stderr with a prefix
        child.stderr.on('data', data => {
            const lines = data.toString().split('\n');
            lines.forEach(line => {
                const cleaned = line.trim();
                if (cleaned) console.error(`${proc.color}[${proc.name} ERROR]${resetColor} ${cleaned}`);
            });
        });
        
        child.on('close', code => {
            console.log(`${proc.color}[${proc.name}]${resetColor} Exited with code ${code}`);
        });
    });

    // Open browser automatically after servers initialize
    setTimeout(() => {
        console.log('\n🌐 Opening Shirtify in your browser...');
        try {
            const url = 'http://localhost:5000/homescreen/homescreen.html';
            const adminUrl = 'http://localhost:5000/admin/login.html';
            if (process.platform === 'win32') {
                spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' });
                spawn('cmd', ['/c', 'start', adminUrl], { detached: true, stdio: 'ignore' });
            } else if (process.platform === 'darwin') {
                spawn('open', [url], { detached: true, stdio: 'ignore' });
                spawn('open', [adminUrl], { detached: true, stdio: 'ignore' });
            } else {
                spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
                spawn('xdg-open', [adminUrl], { detached: true, stdio: 'ignore' });
            }
        } catch (e) {
            console.error('Failed to open browser:', e.message);
        }
    }, 3500);
};

// Start MongoDB first, then other services
startMongoDB().then(startServices);

// Handle termination cleanly
let isCleaningUp = false;
const cleanup = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    console.log('\n🛑 Stopping all services...');
    children.forEach(child => {
        try {
            if (process.platform === 'win32') {
                // On Windows, taskkill with /t kills the process tree cleanly and synchronously
                execSync(`taskkill /pid ${child.pid} /f /t`, { stdio: 'ignore' });
            } else {
                child.kill();
            }
        } catch (e) {}
    });
};

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('SIGHUP', () => { cleanup(); process.exit(0); });
process.on('SIGBREAK', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);
