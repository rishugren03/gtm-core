import dotenv from 'dotenv';
dotenv.config();

import app from './app';

const PORT = 3000;
console.log('Starting repro dotenv server...');
app.listen(PORT, () => {
    console.log(`Repro dotenv server running on ${PORT}`);
});
console.log('Listen called');

process.on('exit', code => console.log('Exit code:', code));
