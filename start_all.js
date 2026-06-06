const { spawn, execSync } = require('child_process');
const path = require('path');

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

const children = [];
const resetColor = '\x1b[0m';

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

// Handle termination cleanly
let isCleaningUp = false;
const cleanup = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    console.log('\n🛑 Stopping all services...');
    children.forEach(child => {
        try {
            if (process.platform === 'win32') {
                // On Windows, taskkill with /t kills the process tree cleanly
                spawn('taskkill', ['/pid', child.pid, '/f', '/t'], { stdio: 'ignore' });
            } else {
                child.kill();
            }
        } catch (e) {}
    });
    setTimeout(() => {
        process.exit();
    }, 500);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGHUP', cleanup);
