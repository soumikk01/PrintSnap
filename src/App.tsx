/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Printer, Upload, RotateCcw, LayoutGrid, AlertCircle, CheckCircle2, Download, SlidersHorizontal, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [printCount, setPrintCount] = useState(30); // 5x6 grid fits well on A4
  const [margin, setMargin] = useState(10); // mm
  const [spacing, setSpacing] = useState(2); // mm gap between photos
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(0);

  const [photoSizeOption, setPhotoSizeOption] = useState("indian_passport");
  const [customWidthCm, setCustomWidthCm] = useState(3.5);
  const [customHeightCm, setCustomHeightCm] = useState(4.5);
  const [customWidthPx, setCustomWidthPx] = useState(413);
  const [customHeightPx, setCustomHeightPx] = useState(531);
  const [customDpi, setCustomDpi] = useState(300);

  const fileInputRef = useRef<HTMLInputElement>(null);

  let photoWidthMM = 35;
  let photoHeightMM = 45;

  if (photoSizeOption === "custom_cm") {
    photoWidthMM = customWidthCm * 10 || 35;
    photoHeightMM = customHeightCm * 10 || 45;
  } else if (photoSizeOption === "custom_dpi") {
    photoWidthMM = (customWidthPx / (customDpi || 300)) * 25.4 || 35;
    photoHeightMM = (customHeightPx / (customDpi || 300)) * 25.4 || 45;
  }

  // Auto-calculate best grid
  const cols = Math.max(1, Math.floor((A4_WIDTH_MM - margin * 2) / (photoWidthMM + spacing)));
  const rows = Math.max(1, Math.floor((A4_HEIGHT_MM - margin * 2) / (photoHeightMM + spacing)));
  const maxPhotos = cols * rows;

  // Sync print count if grid changes
  useEffect(() => {
    if (printCount > maxPhotos) {
      setPrintCount(maxPhotos);
    }
  }, [maxPhotos, printCount]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setBrightness(0);
        setContrast(0);
        setTemperature(0);
        setSaturation(0);
        setZoom(1); // Reset zoom
        setOffsetY(0); // Reset offset
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setImage(null);
    setBrightness(0);
    setContrast(0);
    setTemperature(0);
    setSaturation(0);
    setZoom(1);
    setOffsetY(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const bVal = 1 + (brightness / 100);
  const cVal = 1 + (contrast / 100);
  const sVal = 1 + (saturation / 100);
  const hVal = temperature / 2; // deg

  const imageFilter = `brightness(${bVal}) contrast(${cVal}) saturate(${sVal}) hue-rotate(${hVal}deg)`;

  const handleAutoFix = () => {
    setBrightness(15);
    setContrast(5);
    setTemperature(-10);
    setSaturation(-5);
  };

  const exportHighResJPEG = async () => {
    if (!image) return;
    
    // A4 format at 300 DPI
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const pxPerMm = 11.811;
    canvas.width = A4_WIDTH_MM * pxPerMm;
    canvas.height = A4_HEIGHT_MM * pxPerMm;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const paddingPx = margin * pxPerMm;
    const photoWidthPx = photoWidthMM * pxPerMm;
    const photoHeightPx = photoHeightMM * pxPerMm;
    const spacingPx = spacing * pxPerMm;
    
    const imgObj = new Image();
    imgObj.src = image;
    await new Promise((resolve) => (imgObj.onload = resolve));
    
    ctx.filter = imageFilter;
    
    const gridTotalWidth = (cols * photoWidthPx) + ((cols - 1) * spacingPx);
    const startX = (canvas.width - gridTotalWidth) / 2;
    
    let drawnCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (drawnCount >= printCount) break;
        
        const x = startX + c * (photoWidthPx + spacingPx);
        const y = paddingPx + r * (photoHeightPx + spacingPx);
        
        const imgAspect = imgObj.width / imgObj.height;
        const boxAspect = photoWidthPx / photoHeightPx;
        let drawW = photoWidthPx;
        let drawH = photoHeightPx;
        let cx = 0; let cy = 0;
        
        if (imgAspect > boxAspect) {
          drawW = photoHeightPx * imgAspect;
          cx = (photoWidthPx - drawW) / 2;
        } else {
          drawH = photoWidthPx / imgAspect;
          cy = 0;
        }
        
        const zW = drawW * zoom;
        const zH = drawH * zoom;
        const zCx = cx - (zW - drawW)/2;
        const zCy = cy - (zH - drawH)/2 + (offsetY / 100 * photoHeightPx);
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, photoWidthPx, photoHeightPx);
        ctx.clip();
        ctx.drawImage(imgObj, x + zCx, y + zCy, zW, zH);
        ctx.restore();
        
        ctx.lineWidth = Math.max(1, 0.1 * pxPerMm);
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(x, y, photoWidthPx, photoHeightPx);
        
        drawnCount++;
      }
    }
    
    const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
    const link = document.createElement("a");
    link.download = "passport-photos-highres.jpg";
    link.href = dataUrl;
    link.click();
  };

  const imgStyle: React.CSSProperties = {
    filter: imageFilter,
    transform: `scale(${zoom}) translateY(${offsetY}%)`,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'top center' // Focus on the head by default
  };

  return (
    <div className="min-h-screen bg-bento-bg text-bento-text-main font-sans selection:bg-blue-100 flex flex-col overflow-x-hidden">
      {/* Navbar - hidden on print */}
      <header className="h-16 bg-white border-b border-bento-border flex items-center justify-between px-6 shrink-0 sticky top-0 z-50 no-print">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl text-bento-accent">PrintSnap</span>
          <span className="font-light opacity-60 text-xl hidden sm:inline">| Passport Studio</span>
        </div>

        <div className="flex items-center gap-3">
          {image && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={exportHighResJPEG}
                  className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-all active:scale-95 shadow-sm flex items-center gap-2 hidden md:flex"
                >
                  <Download size={16} className="text-slate-500" />
                  <span>Export JPEG</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-1.5 bg-bento-success text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all active:scale-95 shadow-sm shadow-emerald-200 flex items-center gap-2"
                >
                  <Printer size={16} />
                  <span>Print Now</span>
                </button>
              </div>
              <div className="text-[9px] text-slate-400 font-medium no-print uppercase tracking-tighter">If print fails, use 'Open in new tab'</div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 p-4 lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden no-print">
        {/* Left Panel: Layout Settings */}
        <div className="bento-card no-print lg:overflow-y-auto">
          <div className="bento-label">Layout Settings</div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[13px] font-medium">Page Size</p>
              <select className="w-full p-2.5 border border-bento-border rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-bento-accent/20">
                <option>A4 (210 x 297 mm)</option>
              </select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[13px] font-medium">Photo Size</p>
                <select 
                  value={photoSizeOption}
                  onChange={(e) => setPhotoSizeOption(e.target.value)}
                  className="w-full p-2.5 border border-bento-border rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-bento-accent/20"
                >
                  <option value="indian_passport">35 x 45 mm (Indian Passport)</option>
                  <option value="custom_cm">Custom Size (cm)</option>
                  <option value="custom_dpi">Custom Resolution (px/dpi)</option>
                </select>
              </div>

              {photoSizeOption === "custom_cm" && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-bento-border">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Width (cm)</p>
                    <input 
                      type="number" 
                      value={customWidthCm} 
                      onChange={e => setCustomWidthCm(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-bento-accent"
                      step="0.1"
                      min="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Height (cm)</p>
                    <input 
                      type="number" 
                      value={customHeightCm} 
                      onChange={e => setCustomHeightCm(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-bento-accent"
                      step="0.1"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {photoSizeOption === "custom_dpi" && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-bento-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Width (px)</p>
                      <input 
                        type="number" 
                        value={customWidthPx} 
                        onChange={e => setCustomWidthPx(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-bento-accent"
                        min="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Height (px)</p>
                      <input 
                        type="number" 
                        value={customHeightPx} 
                        onChange={e => setCustomHeightPx(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-bento-accent"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Resolution (DPI)</p>
                    <input 
                      type="number" 
                      value={customDpi} 
                      onChange={e => setCustomDpi(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-bento-accent"
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[13px] font-medium">Spacing / Margin</p>
                <span className="text-[11px] font-bold text-bento-accent bg-blue-50 px-1.5 rounded">{spacing}mm</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                value={spacing} 
                onChange={(e) => setSpacing(Number(e.target.value))}
                className="w-full accent-bento-accent cursor-pointer" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[13px] font-medium">Photos Count</p>
                <span className="text-[11px] font-bold text-bento-accent bg-blue-50 px-1.5 rounded">{printCount}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max={maxPhotos} 
                value={printCount} 
                onChange={(e) => setPrintCount(Number(e.target.value))}
                className="w-full accent-bento-accent cursor-pointer" 
              />
            </div>
          </div>

          <div className="mt-8 lg:mt-auto pt-5 border-t border-bento-border space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-bento-text-sub">Total Photos:</span>
              <span className="font-bold">{printCount}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-[10px] text-slate-500 italic mt-2">
              Note: Preview scaling may look slightly different from actual 1:1 print.
            </div>
          </div>
        </div>

        {/* Center Area: Print Preview */}
        <div className="bento-card border-2 border-dashed border-bento-border bg-slate-400 justify-center items-center overflow-auto relative p-4 lg:p-0 group min-h-[400px]">
          <div className="absolute top-4 left-4 z-10 bento-label bg-white/40 backdrop-blur px-2 py-1 rounded hidden lg:block">
            Screen Preview
          </div>
          
          <div 
            className="bg-white shadow-[0_10px_25px_rgba(0,0,0,0.15)] origin-center transition-transform"
            style={{
              width: `${A4_WIDTH_MM}mm`,
              height: `${A4_HEIGHT_MM}mm`,
              padding: `${margin}mm`,
              transform: 'scale(0.5)', 
            }}
          >
            {image ? (
              <div 
                className="grid justify-items-center content-start overflow-hidden h-full"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${photoWidthMM}mm)`,
                  gap: `${spacing}mm`
                }}
              >
                {Array.from({ length: printCount }).map((_, i) => (
                  <div 
                    key={i}
                    className="border border-slate-100 overflow-hidden"
                    style={{
                      width: `${photoWidthMM}mm`,
                      height: `${photoHeightMM}mm`,
                    }}
                  >
                    <img 
                      src={image} 
                      className="grayscale-[0.05]" 
                      style={imgStyle}
                      alt="Passport" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full border border-dashed border-slate-300 flex flex-col items-center justify-center">
                <LayoutGrid size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">A4 Workspace</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Assets & Enhancements */}
        <div className="bento-card no-print lg:overflow-y-auto">
          <div className="bento-label">Active Image</div>
          
          <div className="relative rounded-lg overflow-hidden mb-4 border border-bento-border shadow-sm bg-slate-50">
            {image ? (
              <img 
                src={image} 
                className="w-full h-auto block max-h-[200px] object-contain mx-auto" 
                style={{ filter: imageFilter }}
                alt="Source" 
              />
            ) : (
              <div className="aspect-[3/4] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Upload size={32} className="mb-2 opacity-20" />
                <p className="text-xs">No image loaded</p>
              </div>
            )}
            {image && (
              <div className="absolute top-2 right-2">
                <span className="bg-bento-success text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shadow-sm">Selected</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 border border-dashed border-bento-border bg-white rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-bento-accent transition-all flex items-center justify-center gap-2 mb-6"
          >
            <Upload size={16} className="text-bento-accent" />
            <span>{image ? 'Replace Photo' : 'Upload Photo'}</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          
          {/* Photo Adjustments */}
          <div className="bento-label">Position & Scale</div>
          <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-lg border border-bento-border">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Zoom</p>
                <span className="text-[10px] font-mono font-bold text-bento-accent">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="2.5" 
                step="0.01"
                value={zoom} 
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-bento-accent" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Vertical Fix</p>
                <span className="text-[10px] font-mono font-bold text-bento-accent">{offsetY}%</span>
              </div>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                step="1"
                value={offsetY} 
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-bento-accent" 
              />
            </div>
            <p className="text-[10px] text-slate-400 italic leading-tight">Use "Vertical Fix" to prevent heads from being cut off.</p>
          </div>

          <div className="flex justify-between items-end mb-3">
            <div className="bento-label !mb-0">Color Correction</div>
            <button 
              onClick={handleAutoFix}
              className="text-[10px] bg-bento-accent/10 text-bento-accent px-2 py-1 rounded font-bold hover:bg-bento-accent hover:text-white transition-colors flex items-center gap-1"
            >
              <Settings2 size={12} /> Auto Fix for Print
            </button>
          </div>
          
          <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-lg border border-bento-border">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Brightness</p>
                <span className="text-[10px] font-mono font-bold text-bento-accent">
                  {brightness > 0 ? `+${brightness}` : brightness}
                </span>
              </div>
              <input 
                type="range" min="-50" max="50" step="1"
                value={brightness} onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-bento-accent" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Contrast</p>
                <span className="text-[10px] font-mono font-bold text-bento-accent">
                  {contrast > 0 ? `+${contrast}` : contrast}
                </span>
              </div>
              <input 
                type="range" min="-30" max="30" step="1"
                value={contrast} onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-bento-accent" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Temp. (Warmth)</p>
                <span className="text-[10px] font-mono font-bold text-bento-accent">
                  {temperature > 0 ? `+${temperature}` : temperature}
                </span>
              </div>
              <input 
                type="range" min="-30" max="30" step="1"
                value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-bento-accent" 
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Saturation</p>
                <span className="text-[10px] font-mono font-bold text-bento-accent">
                  {saturation > 0 ? `+${saturation}` : saturation}
                </span>
              </div>
              <input 
                type="range" min="-30" max="30" step="1"
                value={saturation} onChange={(e) => setSaturation(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-bento-accent" 
              />
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            <button 
              onClick={() => setPrintCount(maxPhotos)}
              className="w-full py-3 bg-bento-accent text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-100 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              Fill Entire Page
            </button>
            
            <div className="p-3 bg-amber-50 rounded-lg text-[10px] text-amber-700 leading-relaxed border border-amber-200/60 shadow-sm flex gap-2 items-start mt-4">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
              <p>
                <span className="font-bold uppercase tracking-wider block mb-0.5 text-[9px] opacity-80">UX Tip</span>
                For best print results: Use High Quality print, Glossy paper, and disable printer auto color correction.
              </p>
            </div>
            
            <div className="p-3 bg-blue-50/50 rounded-lg text-[11px] text-bento-text-sub text-center leading-relaxed border border-blue-100/50">
              {photoSizeOption === "indian_passport" ? (
                <>Indian Standard: <span className="font-bold text-bento-text-main">3.5cm x 4.5cm</span></>
              ) : (
                <>Current Size: <span className="font-bold text-bento-text-main">{(photoWidthMM / 10).toFixed(2)}cm x {(photoHeightMM / 10).toFixed(2)}cm</span></>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Actual Print Content (Optimized for hard print) */}
      <div className="print-area">
        <div 
          className="print-page-layout"
          style={{
            width: `${A4_WIDTH_MM}mm`,
            height: `${A4_HEIGHT_MM}mm`,
            padding: `${margin}mm`,
          }}
        >
          {image && (
            <div 
              className="print-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${photoWidthMM}mm)`,
                gap: `${spacing}mm`
              }}
            >
              {Array.from({ length: printCount }).map((_, i) => (
                <div 
                  key={i}
                  style={{
                    width: `${photoWidthMM}mm`,
                    height: `${photoHeightMM}mm`,
                    border: '0.1mm solid rgba(0,0,0,0.1)', // Subtle cut lines
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={image} 
                    style={imgStyle}
                    alt="Passport Print" 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .print-area { display: none; }
        }
        @media print {
          body {
            visibility: hidden;
            background: white !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  );
}
