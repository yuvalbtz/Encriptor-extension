import fs from 'fs';
import readline from 'readline';
import CryptoJS from 'crypto-js';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to decrypt and open file
async function decryptAndOpenFile() {
    try {
        // Get file path
        rl.question('Enter the path to the encrypted file: ', (filePath) => {
            if (!fs.existsSync(filePath)) {
                console.error('File not found!');
                rl.close();
                return;
            }

            // Get password
            rl.question('Enter the encryption password: ', (password) => {
                try {
                    // Read encrypted content
                    const encryptedContent = fs.readFileSync(filePath, 'utf8');

                    // Decrypt content
                    const decryptedContent = CryptoJS.AES.decrypt(encryptedContent, password).toString(CryptoJS.enc.Utf8);

                    if (!decryptedContent) {
                        console.error('Decryption failed! Wrong password or corrupted file.');
                        rl.close();
                        return;
                    }

                    // Create temporary file
                    const tempFile = `${filePath}.decrypted`;
                    fs.writeFileSync(tempFile, decryptedContent);

                    // Open file based on extension
                    const extension = filePath.split('.').pop()?.toLowerCase();
                    let command;

                    switch (extension) {
                        case 'csv':
                            command = `libreoffice --calc "${tempFile}"`;
                            break;
                        case 'xlsx':
                        case 'xls':
                            command = `libreoffice --calc "${tempFile}"`;
                            break;
                        default:
                            command = `xdg-open "${tempFile}"`;
                    }

                    exec(command, (error) => {
                        if (error) {
                            console.error('Error opening file:', error);
                        } else {
                            console.log('File opened successfully!');
                        }
                        // Clean up temporary file after 5 seconds
                        setTimeout(() => {
                            fs.unlinkSync(tempFile);
                        }, 5000);
                        rl.close();
                    });
                } catch (err) {
                    console.error('Error processing file:', err);
                    rl.close();
                }
            });
        });
    } catch (err) {
        console.error('Error:', err);
        rl.close();
    }
}

decryptAndOpenFile(); 