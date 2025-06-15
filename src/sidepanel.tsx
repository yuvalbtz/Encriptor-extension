import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, Container, Button, Alert, Typography, Stack } from '@mui/material';
import { normalizeText } from './utils';

function SidePanel() {
    const [fileName, setFileName] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setError('');
        setSuccess('');

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) {
                    setError('Error reading file');
                    return;
                }

                let jsonData: any[] = [];
                if (file.name.endsWith('.csv')) {
                    const text = new TextDecoder().decode(data as ArrayBuffer);
                    const rows = text.split('\n').map(row => {
                        const [original, encrypted] = row.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                        return { original, encrypted };
                    });
                    jsonData = rows.filter(row => row.original && row.encrypted);
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    setError('Excel file support coming soon');
                    return;
                }

                console.log('Parsed data:', jsonData);

                const map = jsonData
                    .map((row: any, index: number) => {
                        console.log(`Raw row ${index + 1}:`, row);

                        const original = normalizeText(row.original || '');
                        const encrypted = normalizeText(row.encrypted || '');

                        console.log(`Row ${index + 1}:`, {
                            rawOriginal: row.original,
                            rawEncrypted: row.encrypted,
                            normalizedOriginal: original,
                            normalizedEncrypted: encrypted,
                            isEmpty: !original || !encrypted,
                            hasHebrew: /[\u0590-\u05FF]/.test(original) || /[\u0590-\u05FF]/.test(encrypted),
                            originalCharCodes: Array.from(original).map(char => char.charCodeAt(0).toString(16)),
                            encryptedCharCodes: Array.from(encrypted).map(char => char.charCodeAt(0).toString(16))
                        });

                        return { original, encrypted };
                    })
                    .filter((item, index) => {
                        const isValid = item.original && item.encrypted;
                        if (!isValid) {
                            console.log(`Filtered out row ${index + 1}:`, item);
                        }
                        return isValid;
                    });

                console.log('Final processed map:', map);

                if (map.length === 0) {
                    setError('No valid mappings found in the file');
                    return;
                }

                const hasHebrew = map.some(item =>
                    /[\u0590-\u05FF]/.test(item.original) ||
                    /[\u0590-\u05FF]/.test(item.encrypted)
                );

                console.log('First few mappings:', map.slice(0, 3));
                console.log('Contains Hebrew:', hasHebrew);
                console.log('Total mappings:', map.length);

                setSuccess(`${map.length} mappings loaded successfully (${hasHebrew ? 'including Hebrew' : 'non-Hebrew only'})`);

                // Send the decryption map to the background script
                chrome.runtime.sendMessage({
                    type: 'DECRYPT_PAGE',
                    mappings: map.reduce((acc, { original, encrypted }) => {
                        acc[original] = encrypted;
                        return acc;
                    }, {} as Record<string, string>)
                }).catch((err) => {
                    console.error('Error sending message:', err);
                    setError('Error sending decryption map to extension');
                });
            } catch (error) {
                console.error('Error processing file:', error);
                setError('Error processing file. Please make sure it\'s a valid CSV or Excel file with UTF-8 encoding.');
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleUnDecrypt = () => {
        setError('');
        setSuccess('');

        chrome.runtime.sendMessage({ type: 'UN_DECRYPT_PAGE' })
            .then(() => {
                setSuccess('Page un-decrypted successfully');
            })
            .catch((err) => {
                console.error('Error sending un-decrypt message:', err);
                setError('Error un-decrypting page');
            });
    };

    return (
        <Container maxWidth="sm" sx={{ width: '100%', p: 2 }}>
            <Box sx={{ my: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Web !! Page Decryptor
                </Typography>
                <Stack spacing={2}>
                    <input
                        accept=".csv,.xlsx,.xls"
                        style={{ display: 'none' }}
                        id="file-upload"
                        type="file"
                        onChange={handleFileSelect}
                    />
                    <label htmlFor="file-upload">
                        <Button variant="contained" component="span" fullWidth>
                            Upload Mapping File
                        </Button>
                    </label>
                    <Button
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        onClick={handleUnDecrypt}
                    >
                        Un-decrypt Page
                    </Button>
                </Stack>
                {fileName && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Selected file: {fileName}
                    </Typography>
                )}
                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        {success}
                    </Alert>
                )}
            </Box>
        </Container>
    );
}

const root = createRoot(document.getElementById('root')!);
root.render(<SidePanel />); 