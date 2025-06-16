import AddIcon from '@mui/icons-material/Add'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import SaveIcon from '@mui/icons-material/Save'
import { Alert, Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import type { GridColDef, GridRenderCellParams, GridRowModel } from '@mui/x-data-grid'
import { DataGrid } from '@mui/x-data-grid'
import CryptoJS from 'crypto-js'
import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'

interface MappingRow {
  id: number;
  encrypted: string;
  original: string;
}

function App() {
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<MappingRow[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [newRow, setNewRow] = useState<{ encrypted: string; original: string }>({ encrypted: '', original: '' })
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportFormat, setExportFormat] = useState<XLSX.BookType>('csv')
  const [uploadPassword, setUploadPassword] = useState('')
  const [showUploadPasswordDialog, setShowUploadPasswordDialog] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const columns: GridColDef[] = [
    { field: 'encrypted', headerName: 'Encrypted', width: 200, editable: true },
    { field: 'original', headerName: 'Original', width: 200, editable: true },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          color="error"
          onClick={() => handleDeleteRow(params.row.id)}
        >
          Delete
        </Button>
      ),
    },
  ]

  // Function to update both rows and mappings
  const updateMappingsAndRows = (newMappings: Record<string, string>) => {
    console.log('Updating mappings and rows with:', newMappings);
    setMappings(newMappings);
    const newRows = Object.entries(newMappings).map(([encrypted, original], index) => ({
      id: index,
      encrypted,
      original
    }));
    console.log('New rows:', newRows);
    setRows(newRows);
  };

  const handleSaveNewRow = () => {
    console.log('Saving new row:', newRow);
    if (!newRow.encrypted || !newRow.original) {
      setError('Both encrypted and original values are required');
      return;
    }

    if (mappings[newRow.encrypted]) {
      setError('This encrypted value already exists');
      return;
    }

    // Create new mappings object with the new row
    const updatedMappings = {
      ...mappings,
      [newRow.encrypted]: newRow.original
    };
    console.log('Updated mappings:', updatedMappings);

    // Update both rows and mappings
    updateMappingsAndRows(updatedMappings);

    // Send message to background script to update the page
    chrome.runtime.sendMessage({ type: 'DECRYPT_PAGE', mappings: updatedMappings })
      .then((response) => {
        console.log('Background response:', response);
        if (response && response.success) {
          setSuccess('New mapping added and page updated successfully');
        } else {
          setError('Failed to update page with new mapping');
        }
      })
      .catch((err) => {
        console.error('Error updating page with new mapping:', err);
        setError('Error updating page with new mapping');
      });

    handleCloseDialog();
  };

  const handleDeleteRow = (id: number) => {
    console.log('Starting row deletion for id:', id);

    const rowToDelete = rows.find(row => row.id === id);
    if (!rowToDelete) {
      console.error('Could not find row to delete');
      return;
    }

    console.log('Found row to delete:', rowToDelete);

    // Create new mappings object without the deleted row
    const updatedMappings = { ...mappings };
    delete updatedMappings[rowToDelete.encrypted];

    console.log('Updated mappings after delete:', updatedMappings);

    // Update rows state
    const updatedRows = rows.filter(row => row.id !== id);
    console.log('Updated rows after delete:', updatedRows);

    // Update states in sequence
    setRows(updatedRows);
    setTimeout(() => {
      setMappings(updatedMappings);
      console.log('Mappings state updated to:', updatedMappings);

      // First un-decrypt the page to remove all highlights
      const reverseMappings: Record<string, string> = {};
      Object.entries(updatedMappings).forEach(([encrypted, original]) => {
        reverseMappings[original] = encrypted;
      });

      // Send message to un-decrypt first
      chrome.runtime.sendMessage({
        type: 'UN_DECRYPT_PAGE',
        mappings: reverseMappings
      })
        .then(() => {
          // Then re-encrypt with updated mappings
          return chrome.runtime.sendMessage({
            type: 'DECRYPT_PAGE',
            mappings: updatedMappings
          });
        })
        .then((response) => {
          console.log('Background response:', response);
          if (response && response.success) {
            setSuccess('Mapping deleted and page refreshed successfully');
          } else {
            setError('Failed to update page after deletion');
          }
        })
        .catch((err) => {
          console.error('Error updating page after deletion:', err);
          setError('Error updating page after deletion');
        });
    }, 0);
  };

  // chrome.runtime.onConnect.addListener(function (port) {
  //   if (port.name === 'mySidepanel') {
  //     port.onDisconnect.addListener(async () => {
  //       console.log('Sidepanel closed.');
  //     });
  //   }
  // });


  const handleRowEdit = (newRow: GridRowModel) => {
    console.log('Starting row edit with:', newRow);

    // Find the old row to get the original encrypted value
    const oldRow = rows.find(row => row.id === newRow.id);
    if (!oldRow) {
      console.error('Could not find old row');
      return newRow;
    }

    console.log('Found old row:', oldRow);

    // Create new mappings object
    const updatedMappings = { ...mappings };

    // If the encrypted value changed, we need to remove the old mapping
    if (oldRow.encrypted !== newRow.encrypted) {
      console.log('Encrypted value changed from', oldRow.encrypted, 'to', newRow.encrypted);
      delete updatedMappings[oldRow.encrypted];
    }

    // Add the new mapping
    updatedMappings[newRow.encrypted] = newRow.original;

    console.log('Updated mappings:', updatedMappings);

    // Update rows state
    const updatedRows = rows.map(row =>
      row.id === newRow.id ? { ...row, ...newRow } : row
    );

    console.log('Updated rows:', updatedRows);

    // Update states in sequence
    setRows(updatedRows);
    setTimeout(() => {
      setMappings(updatedMappings);
      console.log('Mappings state updated to:', updatedMappings);

      // Send message to background script to update the page
      chrome.runtime.sendMessage({ type: 'DECRYPT_PAGE', mappings: updatedMappings })
        .then((response) => {
          console.log('Background response:', response);
          if (response && response.success) {
            setSuccess('Mapping updated and page refreshed successfully');
          } else {
            setError('Failed to update page after edit');
          }
        })
        .catch((err) => {
          console.error('Error updating page after edit:', err);
          setError('Error updating page after edit');
        });
    }, 0);

    return newRow;
  };

  // Add useEffect to monitor state changes
  useEffect(() => {
    console.log('State changed - Current mappings:', mappings);
    console.log('State changed - Current rows:', rows);
  }, [mappings, rows]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccess('');

    const file = event.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    console.log('File selected:', file.name);

    // First try to read the file content to check if it's encrypted
    try {
      const content = await file.text();
      console.log('File content preview:', content.substring(0, 100));

      // Check if the content looks like encrypted data (base64-like string)
      const isEncrypted = /^[A-Za-z0-9+/=]+$/.test(content.trim());
      console.log('Is file encrypted?', isEncrypted);

      if (isEncrypted) {
        console.log('Encrypted file detected, showing password dialog');
        setPendingFile(file);
        setShowUploadPasswordDialog(true);
        return;
      }

      console.log('Processing regular file');
      await processFile(file);
    } catch (err) {
      console.error('Error reading file:', err);
      setError('Error reading file');
    }
  };

  const processFile = async (file: File, password?: string) => {
    try {
      console.log('Processing file:', file.name, 'with password:', password ? 'provided' : 'none');
      let content: string;
      const fileContent = await file.text();

      // If password is provided, try to decrypt
      if (password) {
        console.log('Attempting to decrypt file');
        try {
          const decrypted = CryptoJS.AES.decrypt(fileContent, password).toString(CryptoJS.enc.Utf8);
          if (!decrypted) {
            console.error('Decryption failed - empty result');
            throw new Error('Decryption failed');
          }
          console.log('File decrypted successfully');
          content = decrypted;
        } catch (err) {
          console.error('Decryption error:', err);
          setError('Failed to decrypt file. Wrong password or corrupted file.');
          return;
        }
      } else {
        content = fileContent;
      }

      const newMappings: Record<string, string> = {};
      const newRows: MappingRow[] = [];
      let id = 1;

      // Try to detect file type from content
      const isCSV = content.includes(',') && content.split('\n')[0].split(',').length === 2;
      const isExcel = content.startsWith('PK') || content.includes('<?xml');

      if (isCSV) {
        console.log('Processing CSV file');
        // Process CSV
        const lines = content.split('\n');
        for (const line of lines) {
          const [encrypted, original] = line.split(',').map(s => s.trim());
          if (encrypted && original) {
            newMappings[encrypted] = original;
            newRows.push({ id: id++, encrypted, original });
          }
        }
      } else if (isExcel) {
        console.log('Processing Excel file');
        // Process Excel
        const workbook = XLSX.read(content, { type: 'string' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<{ encrypted: string; original: string }>(firstSheet);

        for (const row of data) {
          if (row.encrypted && row.original) {
            newMappings[row.encrypted] = row.original;
            newRows.push({ id: id++, encrypted: row.encrypted, original: row.original });
          }
        }
      } else {
        console.error('Unsupported file format:', file.name);
        setError('Unsupported file format');
        return;
      }

      console.log('File processed successfully. Mappings:', newMappings);
      setMappings(newMappings);
      setRows(newRows);
      setSuccess('File uploaded successfully');

      // Send mappings to background script
      console.log('Sending mappings to background:', newMappings);
      chrome.runtime.sendMessage({ type: 'DECRYPT_PAGE', mappings: newMappings })
        .then((response) => {
          console.log('Received response from background:', response);
          if (response && response.success) {
            setSuccess('File uploaded and page decrypted successfully');
          } else {
            setError('Failed to decrypt page');
          }
        })
        .catch((err) => {
          console.error('Error sending decryption map:', err);
          setError('Error sending decryption map to extension');
        });

    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error processing file');
    }
  };

  const handleUploadPasswordSubmit = async () => {
    if (!pendingFile || !uploadPassword) {
      setError('Please enter a password');
      return;
    }

    console.log('Submitting password for file:', pendingFile.name);
    await processFile(pendingFile, uploadPassword);
    setShowUploadPasswordDialog(false);
    setUploadPassword('');
    setPendingFile(null);
  };

  const handleAddRow = () => {
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setNewRow({ encrypted: '', original: '' })
  }

  const handleEncrypt = () => {
    setError('');
    setSuccess('');

    if (Object.keys(mappings).length === 0) {
      setError('No mappings available. Please add mappings first.');
      return;
    }

    console.log('Encrypting with mappings:', mappings);
    chrome.runtime.sendMessage({ type: 'DECRYPT_PAGE', mappings })
      .then((response) => {
        console.log('Encrypt response:', response);
        if (response && response.success) {
          setSuccess('Page encrypted successfully');
        } else {
          setError('Failed to encrypt page');
        }
      })
      .catch((err) => {
        console.error('Error encrypting page:', err);
        setError('Error encrypting page');
      });
  };

  const handleDecrypt = () => {
    setError('');
    setSuccess('');

    if (Object.keys(mappings).length === 0) {
      setError('No mappings available. Please add mappings first.');
      return;
    }

    // Create reverse mappings
    const reverseMappings: Record<string, string> = {};
    Object.entries(mappings).forEach(([encrypted, original]) => {
      reverseMappings[original] = encrypted;
    });

    console.log('Decrypting with reverse mappings:', reverseMappings);
    chrome.runtime.sendMessage({
      type: 'UN_DECRYPT_PAGE',
      mappings: reverseMappings
    })
      .then((response) => {
        console.log('Decrypt response:', response);
        if (response && response.success) {
          setSuccess('Page decrypted successfully');
        } else {
          setError('Failed to decrypt page');
        }
      })
      .catch((err) => {
        console.error('Error decrypting page:', err);
        setError('Error decrypting page');
      });
  };

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleExportClose = () => {
    setExportDialogOpen(false);
    setExportPassword('');
  };

  const handleExportSubmit = () => {
    if (!exportPassword) {
      setError('Please enter a password');
      return;
    }

    try {
      // Convert mappings to array format
      const data = Object.entries(mappings).map(([encrypted, original]) => ({
        encrypted,
        original
      }));

      if (exportFormat === 'csv') {
        // Create CSV content
        const csvContent = data.map(row => `${row.encrypted},${row.original}`).join('\n');
        const encryptedCsv = CryptoJS.AES.encrypt(csvContent, exportPassword).toString();

        // Create and download file
        const blob = new Blob([encryptedCsv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'encrypted_mappings.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Mappings');

        // Convert to binary string
        const wbout = XLSX.write(wb, { bookType: exportFormat, type: 'binary' });

        // Convert to Blob
        const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `encrypted_mappings.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      setSuccess('File exported successfully');
      handleExportClose();
    } catch (err) {
      console.error('Error exporting file:', err);
      setError('Error exporting file');
    }
  };

  // Helper function to convert string to ArrayBuffer
  const s2ab = (s: string) => {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  };

  const handleEncriptWithTooltip = () => {
    chrome.runtime.sendMessage({ type: 'ENC_WITH_TOOLTIP', mappings })
  }





  return (
    <Container maxWidth="md" sx={{ width: '100%', p: 2 }}>
      <Box sx={{ my: 2 }}>
        <Typography variant="h6" gutterBottom>
          Web Page Decryptor
        </Typography>
        <Stack spacing={2}>
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
              fullWidth
              startIcon={<CloudUploadIcon />}
            >
              Upload Mapping File
            </Button>
          </label>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleEncrypt}
            >
              Encrypt Page
            </Button>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={handleDecrypt}
            >
              Decrypt Page
            </Button>
          </Box>
          <Button variant='contained' color='primary' fullWidth onClick={handleEncriptWithTooltip}>Encript With Tooltip</Button>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            startIcon={<AddIcon />}
            onClick={handleAddRow}
          >
            Add New Mapping
          </Button>
          <Button
            variant="outlined"
            color="primary"
            fullWidth
            startIcon={<SaveIcon />}
            onClick={handleExport}
          >
            Export Mappings
          </Button>
        </Stack>
        <Box sx={{ height: 400, width: '100%', mt: 2 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 5, page: 0 },
              },
            }}
            pageSizeOptions={[5]}
            checkboxSelection
            disableRowSelectionOnClick
            editMode="row"
            processRowUpdate={(newRow) => {
              console.log('Processing row update:', newRow);
              const result = handleRowEdit(newRow);
              console.log('Row edit completed with result:', result);
              return result;
            }}
            onProcessRowUpdateError={(error) => {
              console.error('Error updating row:', error);
              setError('Failed to update row');
            }}
            key={rows.length} // Force re-render when rows change
          />
        </Box>
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

        {/* Add New Row Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog}>
          <DialogTitle>Add New Mapping</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Encrypted Text"
                value={newRow.encrypted}
                onChange={(e) => setNewRow({ ...newRow, encrypted: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Original Text"
                value={newRow.original}
                onChange={(e) => setNewRow({ ...newRow, original: e.target.value })}
                fullWidth
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveNewRow} variant="contained" color="primary">
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onClose={handleExportClose}>
          <DialogTitle>Export Mappings</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1, minWidth: '300px' }}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={exportFormat}
                  label="Format"
                  onChange={(e) => setExportFormat(e.target.value as XLSX.BookType)}
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="xlsx">XLSX</MenuItem>
                  <MenuItem value="xls">XLS</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Encryption Password"
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                fullWidth
                required
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleExportClose}>Cancel</Button>
            <Button onClick={handleExportSubmit} variant="contained" color="primary">
              Export
            </Button>
          </DialogActions>
        </Dialog>

        {/* Upload Password Dialog */}
        <Dialog open={showUploadPasswordDialog} onClose={() => setShowUploadPasswordDialog(false)}>
          <DialogTitle>Enter Decryption Password</DialogTitle>
          <DialogContent>
            <TextField
              label="Password"
              type="password"
              value={uploadPassword}
              onChange={(e) => setUploadPassword(e.target.value)}
              fullWidth
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowUploadPasswordDialog(false)}>Cancel</Button>
            <Button onClick={handleUploadPasswordSubmit} variant="contained" color="primary">
              Decrypt
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  )
}

export default App
