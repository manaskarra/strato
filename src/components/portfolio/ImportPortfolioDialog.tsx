'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortfolioHolding } from '@/lib/types';
import { Upload, FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import { fetchCurrentPrice, fetchFundamentals } from '@/lib/api';

interface ImportPortfolioDialogProps {
  onImport: (holdings: PortfolioHolding[], mode: 'replace' | 'append') => void;
}

interface RawCSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  symbol: string | null;
  shares: string | null;
  avgCost: string | null;
  purchaseDate: string | null;
  commission: string | null;
}

export function ImportPortfolioDialog({ onImport }: ImportPortfolioDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [rawData, setRawData] = useState<RawCSVRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    symbol: null,
    shares: null,
    avgCost: null,
    purchaseDate: null,
    commission: null,
  });
  const [parsedHoldings, setParsedHoldings] = useState<PortfolioHolding[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);

    Papa.parse<RawCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setErrors(['CSV file is empty']);
          return;
        }

        const cols = Object.keys(results.data[0]);
        setColumns(cols);
        setRawData(results.data);

        // Auto-detect common column names
        const autoMapping: ColumnMapping = {
          symbol: null,
          shares: null,
          avgCost: null,
          purchaseDate: null,
          commission: null,
        };

        cols.forEach(col => {
          const lower = col.toLowerCase();
          if (!autoMapping.symbol && (lower.includes('symbol') || lower.includes('ticker') || col === 'Symbol' || col === 'Ticker')) {
            autoMapping.symbol = col;
          }
          if (!autoMapping.shares && (lower.includes('share') || lower.includes('quantity') || lower.includes('qty') || col === 'Shares' || col === 'Quantity')) {
            autoMapping.shares = col;
          }
          if (!autoMapping.avgCost && (lower.includes('price') || lower.includes('cost') || lower.includes('avgcost') || col === 'Price' || col === 'Cost')) {
            autoMapping.avgCost = col;
          }
          if (!autoMapping.purchaseDate && (lower.includes('date') || lower.includes('purchase') || col === 'Date')) {
            autoMapping.purchaseDate = col;
          }
          if (!autoMapping.commission && (lower.includes('commission') || lower.includes('fee') || col === 'Commission')) {
            autoMapping.commission = col;
          }
        });

        setColumnMapping(autoMapping);
        setStep('mapping');
      },
      error: (error) => {
        setErrors([`Failed to parse CSV: ${error.message}`]);
      },
    });
  };

  const handleMapColumns = async () => {
    if (!columnMapping.symbol || !columnMapping.shares || !columnMapping.avgCost) {
      setErrors(['Please map required fields: Ticker/Symbol, Quantity, and Purchase Price']);
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    const validationErrors: string[] = [];
    const holdings: PortfolioHolding[] = [];

    // Process all rows
    for (const [index, row] of rawData.entries()) {
      const symbol = row[columnMapping.symbol!]?.trim().toUpperCase();
      const sharesStr = row[columnMapping.shares!];
      const avgCostStr = row[columnMapping.avgCost!];
      const commissionStr = columnMapping.commission ? row[columnMapping.commission] : '0';

      // Validate required fields
      if (!symbol || !sharesStr || !avgCostStr) {
        validationErrors.push(`Row ${index + 1}: Missing required data`);
        continue;
      }

      const shares = parseFloat(sharesStr);
      const avgCost = parseFloat(avgCostStr);
      const commission = parseFloat(commissionStr || '0');

      // Validate numeric fields
      if (isNaN(shares) || shares <= 0) {
        validationErrors.push(`Row ${index + 1}: Invalid quantity for ${symbol}`);
        continue;
      }
      if (isNaN(avgCost) || avgCost <= 0) {
        validationErrors.push(`Row ${index + 1}: Invalid price for ${symbol}`);
        continue;
      }

      try {
        // Fetch real-time price and fundamentals
        const [currentPrice, fundamentals] = await Promise.all([
          fetchCurrentPrice(symbol),
          fetchFundamentals(symbol).catch(() => null),
        ]);

        // Ensure currentPrice is valid
        // For crypto with very high cost basis, the API might return 0
        // Only fallback if price is 0 AND symbol is not crypto (crypto should never be near avgCost)
        const isCrypto = symbol.includes('-USD') || symbol.includes('BTC') || symbol.includes('ETH');
        const validCurrentPrice = currentPrice > 0 ? currentPrice : (isCrypto ? avgCost * 0.95 : avgCost);

        if (currentPrice === 0) {
          validationErrors.push(`Row ${index + 1}: Could not fetch live price for ${symbol}, using estimated value`);
        }

        const totalCost = (avgCost * shares) + commission;
        const effectiveAvgCost = totalCost / shares;
        const value = shares * validCurrentPrice;
        const gainLoss = value - totalCost;
        const gainLossPercent = totalCost > 0 ? ((value - totalCost) / totalCost) * 100 : 0;

        holdings.push({
          id: `${Date.now()}-${index}`,
          symbol,
          name: fundamentals?.General?.Name || symbol,
          shares,
          avgCost: effectiveAvgCost,
          currentPrice: validCurrentPrice,
          value,
          gainLoss,
          gainLossPercent,
          sector: fundamentals?.General?.Sector || 'Technology',
          assetType: fundamentals?.General?.Type || 'Common Stock',
          geography: fundamentals?.General?.CountryISO === 'USA' ? 'US' : 'International',
          weight: 0,
        });
      } catch (error) {
        // Fallback if API fails - use estimated price
        const totalCost = (avgCost * shares) + commission;
        const effectiveAvgCost = totalCost / shares;
        const currentPrice = avgCost * 1.05; // Conservative estimate
        const value = shares * currentPrice;
        const gainLoss = value - totalCost;
        const gainLossPercent = ((value - totalCost) / totalCost) * 100;

        holdings.push({
          id: `${Date.now()}-${index}`,
          symbol,
          name: symbol,
          shares,
          avgCost: effectiveAvgCost,
          currentPrice,
          value,
          gainLoss,
          gainLossPercent,
          sector: 'Technology',
          assetType: 'Stock',
          geography: 'US',
          weight: 0,
        });

        validationErrors.push(`Row ${index + 1}: Using estimated price for ${symbol} (API unavailable)`);
      }
    }

    setIsProcessing(false);

    if (validationErrors.length > 0 && holdings.length === 0) {
      setErrors(validationErrors);
    } else if (holdings.length === 0) {
      setErrors(['No valid holdings found in the CSV file']);
    } else {
      setParsedHoldings(holdings);
      if (validationErrors.length > 0) {
        setErrors(validationErrors); // Show warnings but still proceed
      } else {
        setErrors([]);
      }
      setStep('preview');
    }
  };

  const handleImport = (mode: 'replace' | 'append') => {
    onImport(parsedHoldings, mode);
    setOpen(false);
    // Reset state
    setParsedHoldings([]);
    setErrors([]);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setRawData([]);
    setColumns([]);
    setColumnMapping({
      symbol: null,
      shares: null,
      avgCost: null,
      purchaseDate: null,
      commission: null,
    });
    setParsedHoldings([]);
    setErrors([]);
    setIsProcessing(false);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Portfolio from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file with your portfolio holdings'}
            {step === 'mapping' && 'Map your CSV columns to portfolio fields'}
            {step === 'preview' && 'Review and confirm your import'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: File Upload */}
          {step === 'upload' && (
            <>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-blue-500/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {fileName || 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
                    </div>
                  </div>
                </label>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Upload any CSV file from your broker. You'll be able to map the columns in the next step.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapping' && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-muted-foreground">• {rawData.length} rows</span>
                </div>

                {isProcessing ? (
                  <Alert className="border-blue-500/50 bg-blue-500/10">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                      <AlertDescription className="text-sm text-blue-500">
                        Fetching real-time prices from EODHD... This may take a moment.
                      </AlertDescription>
                    </div>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Map your CSV columns to the required fields below. Fields marked with * are required.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Ticker/Symbol <span className="text-red-500">*</span>
                    </label>
                    <Select value={columnMapping.symbol || ''} onValueChange={(val) => setColumnMapping({...columnMapping, symbol: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <Select value={columnMapping.shares || ''} onValueChange={(val) => setColumnMapping({...columnMapping, shares: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Purchase Price <span className="text-red-500">*</span>
                    </label>
                    <Select value={columnMapping.avgCost || ''} onValueChange={(val) => setColumnMapping({...columnMapping, avgCost: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Purchase Date</label>
                    <Select value={columnMapping.purchaseDate || ''} onValueChange={(val) => setColumnMapping({...columnMapping, purchaseDate: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Commission</label>
                    <Select value={columnMapping.commission || ''} onValueChange={(val) => setColumnMapping({...columnMapping, commission: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CSV Preview */}
                <div>
                  <p className="text-sm font-medium mb-2">Preview (first 5 rows)</p>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted sticky top-0 z-10">
                          <tr className="border-b border-border">
                            {columns.map(col => (
                              <th key={col} className="text-left py-2 px-3 font-medium whitespace-nowrap min-w-[100px]">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rawData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-b border-border hover:bg-muted/30">
                              {columns.map(col => (
                                <td key={col} className="py-2 px-3 whitespace-nowrap">
                                  {row[col]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <p className="text-sm font-medium">
                    Successfully parsed {parsedHoldings.length} holdings
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium">Symbol</th>
                        <th className="text-right py-2 px-3 font-medium">Shares</th>
                        <th className="text-right py-2 px-3 font-medium">Avg Cost</th>
                        <th className="text-right py-2 px-3 font-medium">Current Price</th>
                        <th className="text-right py-2 px-3 font-medium">Value</th>
                        <th className="text-right py-2 px-3 font-medium">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedHoldings.map((holding) => (
                        <tr key={holding.id} className="border-b border-border">
                          <td className="py-2 px-3 font-semibold">{holding.symbol}</td>
                          <td className="py-2 px-3 text-right">{holding.shares}</td>
                          <td className="py-2 px-3 text-right">${Number(holding.avgCost).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">${Number(holding.currentPrice || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-medium">${Number(holding.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className={`py-2 px-3 text-right font-medium ${(holding.gainLoss || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {(holding.gainLoss || 0) >= 0 ? '+' : ''}${Number(holding.gainLoss || 0).toFixed(2)} ({(holding.gainLossPercent || 0) >= 0 ? '+' : ''}{Number(holding.gainLossPercent || 0).toFixed(1)}%)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">Validation Errors:</p>
                <ul className="text-xs space-y-1">
                  {errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="font-medium">... and {errors.length - 5} more errors</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
          {step === 'mapping' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setStep('upload')} disabled={isProcessing}>
                Back
              </Button>
              <Button onClick={handleMapColumns} className="bg-blue-600 hover:bg-blue-700" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
          {step === 'preview' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => handleImport('append')}
                className="flex-1 sm:flex-initial"
              >
                Append to Existing
              </Button>
              <Button
                onClick={() => handleImport('replace')}
                className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700"
              >
                Replace All
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
