import { useState, useEffect } from 'react'
import { Box, Button, Container, Typography, Paper, Alert, IconButton, Switch, FormControlLabel } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CloseIcon from '@mui/icons-material/Close'
import * as XLSX from 'xlsx'

interface DecryptionMap {
  original: string
  encrypted: string
}

function App() {
  const [decryptionMap, setDecryptionMap] = useState<DecryptionMap[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [isExtensionContext, setIsExtensionContext] = useState<boolean>(false)
  const [globalDecryptEnabled, setGlobalDecryptEnabled] = useState<boolean>(false)

  useEffect(() => {
    // Check if we're in the extension context
    const checkExtensionContext = () => {
      const isExtension = typeof chrome !== 'undefined' &&
        chrome.runtime &&
        chrome.runtime.id !== undefined
      setIsExtensionContext(isExtension)
      return isExtension
    }

    if (checkExtensionContext()) {
      // Listen for messages from the background script
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'DECRYPTION_STATUS') {
          if (message.success) {
            setSuccess(message.message)
          } else {
            setError(message.message)
          }
        }
      })
    }
  }, [])

  const handleClose = () => {
    window.close()
  }

  const handleGlobalDecryptToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setGlobalDecryptEnabled(newValue);

    if (isExtensionContext) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];

        if (activeTab.id) {
          try {
            // Check if we can inject into this tab
            const results = await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              func: () => window.location.protocol,
            });

            // Skip if we're on a chrome-extension page
            if (results[0].result === 'chrome-extension:') {
              setError('Please navigate to a regular webpage to use the decryption feature.');
              return;
            }

            // Try to inject the content script first
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id },
              files: ['content.js']
            });

            // Then send the message
            await chrome.tabs.sendMessage(activeTab.id, {
              type: 'TOGGLE_GLOBAL_DECRYPT',
              payload: newValue
            });
          } catch (error) {
            console.error('Error sending message to tab:', error);
            setError('Could not update the page. Please refresh the page and try again.');
          }
        }
      } catch (error) {
        console.error('Error querying tabs:', error);
        setError('Could not access the current tab. Please refresh the page and try again.');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setError('')
    setSuccess('')

    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        console.log('Raw file data:', data);

        // Read the file with UTF-8 encoding
        const workbook = XLSX.read(data, {
          type: 'binary',
          codepage: 65001 // UTF-8
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with proper encoding
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: '',
          header: ['original', 'encrypted']
        });

        console.log('Raw JSON data:', jsonData);

        // Helper function to normalize text
        const normalizeText = (text: string) => {
          if (!text) return '';

          return String(text)
            .trim()
            .replace(/\u200B/g, '')
            .replace(/\u200C/g, '')
            .replace(/\u200D/g, '')
            .replace(/[\uFFFD\uFFFE\uFFFF]/g, '');
        };

        const map = jsonData
          .map((row: any) => ({
            original: normalizeText(row.original || ''),
            encrypted: normalizeText(row.encrypted || '')
          }))
          .filter(item => item.original && item.encrypted);

        console.log('Final processed map:', map);

        if (map.length === 0) {
          setError('No valid mappings found in the file');
          return;
        }

        setDecryptionMap(map);
        setSuccess(`${map.length} mappings loaded successfully`);

        // Send the decryption map to the background script
        if (isExtensionContext) {
          try {
            await chrome.runtime.sendMessage({
              type: 'SET_DECRYPTION_MAP',
              payload: map
            });
          } catch (error) {
            console.error('Error sending message:', error);
            setError('Error sending decryption map to extension. Please refresh the page and try again.');
          }
        }
      } catch (error) {
        console.error('Error processing file:', error);
        setError('Error processing file. Please make sure it\'s a valid CSV or Excel file with UTF-8 encoding.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  if (!isExtensionContext) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Alert severity="error">
            This application must be run as a Chrome extension.
          </Alert>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4, position: 'relative' }}>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 0,
            top: 0
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Web Page Decryptor
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <input
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<CloudUploadIcon />}
              >
                Upload Mapping File
              </Button>
            </label>

            {fileName && (
              <Typography variant="body2" color="text.secondary">
                File loaded: {fileName}
              </Typography>
            )}

            {decryptionMap.length > 0 && (
              <Box sx={{ width: '100%', mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={globalDecryptEnabled}
                      onChange={handleGlobalDecryptToggle}
                      color="primary"
                    />
                  }
                  label="Show all decrypted text"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Visibility options:
                  <ul style={{ textAlign: 'left', marginTop: '8px' }}>
                    <li>Toggle switch: Show all decrypted text</li>
                    <li>Hover: See decrypted text in tooltip</li>
                    <li>Click: Permanently decrypt individual words</li>
                  </ul>
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ width: '100%' }}>
                {success}
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default App
