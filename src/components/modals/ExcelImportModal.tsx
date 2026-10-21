import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Building,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { MediaAsset, STANDARD_VENDORS } from '../../types/mediaAsset';
import {
  parseExcelToAssets,
  generateSampleExcelTemplate,
  ImportValidationResult,
} from '../../utils/excelImport';
import { formatCurrency, formatNumberCompact } from '../../utils/formatters';

interface ExcelImportModalProps {
  onClose: () => void;
  onImportComplete: (newAssets: MediaAsset[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  onClose,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ImportValidationResult | null>(null);
  const [defaultVendor, setDefaultVendor] = useState<string>('Blaze Media (Pvt) Ltd');
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [apiSyncStatus, setApiSyncStatus] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger file download of the standard template
  const handleDownloadTemplate = async () => {
    try {
      // Try backend API first
      const res = await fetch('/api/assets/template');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Blaze_OOH_Media_Asset_Template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // fallback to client-side SheetJS generation
    }

    const templateBytes = generateSampleExcelTemplate();
    const blob = new Blob([templateBytes as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Blaze_OOH_Media_Asset_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setApiSyncStatus('Parsing Excel workbook via SheetJS & validation engine...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = parseExcelToAssets(arrayBuffer);

      // Also notify backend API
      try {
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        await fetch('/api/assets/import-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            filename: selectedFile.name,
          }),
        });
      } catch (e) {
        // Backend API communication optional
      }

      setParsedResult(result);
      setStep('preview');
    } catch (err: any) {
      alert(`Failed to parse Excel file: ${err.message || 'Invalid format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Commit parsed assets to the live database
  const handleCommitImport = async () => {
    if (!parsedResult || parsedResult.validAssets.length === 0) return;

    setIsCommitting(true);

    // Apply default vendor if row was missing vendor
    const finalizedAssets = parsedResult.validAssets.map((asset) => ({
      ...asset,
      vendor: asset.vendor || defaultVendor,
    }));

    try {
      // Synchronize with Express backend API
      await fetch('/api/assets/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: finalizedAssets }),
      });
    } catch {
      // offline / client sync
    }

    onImportComplete(finalizedAssets);
    setIsCommitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-hidden select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs">
        {/* Windows Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Excel Outdoor Media Ingestion Wizard</span>
                <span className="font-mono text-emerald-400 text-xs font-normal">
                  [API: http://app2.blaze.com.pk/api/assets]
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Batch upload and synchronize outdoor advertising inventory (.xlsx, .xls, .csv)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Download standard Excel column format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Excel Template (.xlsx)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="px-5 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-4 text-xs font-medium">
          <span
            className={`flex items-center gap-1.5 ${
              step === 'upload' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Upload Spreadsheet</span>
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span
            className={`flex items-center gap-1.5 ${
              step === 'preview' ? 'text-amber-400 font-bold' : 'text-slate-500'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Review & Validate Ingestion</span>
          </span>
          <ArrowRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-500 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
              3
            </span>
            <span>Commit to Database</span>
          </span>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 text-slate-300">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Drag and Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-950/50 hover:bg-slate-900/60 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">
                  Choose an Excel File or Drag & Drop Here
                </h3>
                <p className="text-xs text-slate-400 max-w-md mb-3">
                  Upload complete lists of outdoor media assets. Compatible with Microsoft Excel (.xlsx, .xls) and CSV sheets.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Supports up to 50MB</span>
                  <span>·</span>
                  <span>Auto-detects columns: Site Code, Title, Vendor, City, Area, Dimensions, Rental, SEC</span>
                </div>
              </div>

              {/* Template Instructions Banner */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Standard Blaze OOH Excel Format Specification
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Columns: Site Code, Title, Vendor (Concessionaire), City, Area, Type, Width, Height, Illumination, Monthly Rental (PKR), Daily Traffic, SEC Class.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Preview & Validation Step */
            parsedResult && (
              <div className="space-y-4">
                {/* Summary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Source Workbook</span>
                    <span className="font-semibold text-slate-200 truncate block">
                      {file?.name || 'Uploaded File'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {parsedResult.totalRows} raw rows
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-emerald-900/60 bg-emerald-950/20">
                    <span className="text-emerald-400 text-[10px] block font-semibold">
                      Validated Assets
                    </span>
                    <span className="font-mono text-xl font-bold text-emerald-300">
                      {parsedResult.validAssets.length}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Ready to ingest</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Warnings / Issues</span>
                    <span className="font-mono text-xl font-bold text-amber-400">
                      {parsedResult.errors.length}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {parsedResult.errors.length === 0 ? 'Clean dataset' : 'Rows skipped'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Default Vendor</span>
                    <select
                      value={defaultVendor}
                      onChange={(e) => setDefaultVendor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-200 mt-0.5 focus:outline-hidden"
                    >
                      {STANDARD_VENDORS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Validation Warnings List if any */}
                {parsedResult.errors.length > 0 && (
                  <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{parsedResult.errors.length} row validation warning(s):</span>
                    </div>
                    <ul className="text-[11px] text-amber-200/80 list-disc pl-5 space-y-0.5 max-h-20 overflow-y-auto">
                      {parsedResult.errors.map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.field} — {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Parsed Rows Preview Table */}
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                  <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      Ingestion Preview ({parsedResult.validAssets.length} Assets)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target Host: http://app2.blaze.com.pk/
                    </span>
                  </div>

                  <div className="max-h-72 overflow-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-950 text-[11px] text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Site Code</th>
                          <th className="py-2 px-3">Site Title</th>
                          <th className="py-2 px-3">Vendor / Concessionaire</th>
                          <th className="py-2 px-3">City & Area</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Dimensions</th>
                          <th className="py-2 px-3 text-right">Vendor Rate</th>
                          <th className="py-2 px-3 text-right">Blaze Rate</th>
                          <th className="py-2 px-3 text-right">Daily Traffic</th>
                          <th className="py-2 px-3 text-center">SEC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {parsedResult.validAssets.map((asset, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="py-2 px-3 font-mono text-amber-400 text-[11px] font-bold">
                              {asset.code}
                            </td>
                            <td className="py-2 px-3 max-w-[200px] truncate text-slate-200 font-medium">
                              {asset.title}
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-medium">
                              {asset.vendor || defaultVendor}
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              {asset.city} · {asset.area}
                            </td>
                            <td className="py-2 px-3 text-slate-300">{asset.type}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">
                              {asset.dimensions.widthFt}×{asset.dimensions.heightFt} ft
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300 text-right">
                              {formatCurrency(asset.cost.vendorRatePkr ?? Math.round(asset.cost.monthlyRentalPkr * 0.7), 'PKR')}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-amber-400 text-right">
                              {formatCurrency(asset.cost.blazeRatePkr ?? asset.cost.monthlyRentalPkr, 'PKR')}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-400 text-right">
                              {formatNumberCompact(asset.profiling.dailyTrafficVehicles)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 font-mono font-bold text-[10px]">
                                {asset.profiling.secCategory}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Endpoint: POST /api/assets/batch-save</span>
          </div>

          <div className="flex items-center gap-2">
            {step === 'preview' && (
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
              >
                Choose Another File
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            {step === 'preview' && (
              <button
                onClick={handleCommitImport}
                disabled={isCommitting || !parsedResult?.validAssets.length}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synchronizing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Commit {parsedResult?.validAssets.length} Assets to Database</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
