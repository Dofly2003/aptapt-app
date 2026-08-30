import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import "./DokumenEditor.css";
import {
  getAllDokumenEditor, createDokumenEditor, updateDokumenEditor, removeDokumenEditor,
} from "../../services/dokumenEditorService";

/* ─── CONSTANTS ─── */
const COLORS = [
  '#000000','#434343','#666666','#999999','#B7B7B7','#CCCCCC','#D9D9D9','#FFFFFF',
  '#FF0000','#FF4500','#FF8C00','#FFD700','#FFFF00','#90EE90','#00FF7F','#00FA9A',
  '#00FFFF','#1E90FF','#0000FF','#6A0DAD','#800080','#FF00FF','#FF69B4','#FFC0CB',
  '#8B0000','#A52A2A','#D2691E','#8B8000','#556B2F','#228B22','#006400','#2E8B57',
  '#008B8B','#00008B','#191970','#4B0082','#9400D3','#8B008B','#C71585','#FF1493',
];
const FONTS = [
  'Calibri','Arial','Times New Roman','Georgia','Verdana','Tahoma',
  'Trebuchet MS','Courier New','Palatino Linotype','Garamond','Impact',
];

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export default function DokumenEditor() {
  const navigate   = useNavigate();
  const editorRef  = useRef(null);
  const pageRef    = useRef(null);
  const fileRef    = useRef(null);
  const imgRef     = useRef(null);
  const toastTimer = useRef(null);
  const rulerRef   = useRef(null);

  /* ── state ── */
  const [docs,      setDocs]     = useState([]);
  const [curId,     setCurId]    = useState(null);
  const [docName,   setDocName]  = useState('Dokumen1');
  const [docNRef]   = useState({ n: 2 });
  const [tab,       setTab]      = useState('home');
  const [sidebar,   setSidebar]  = useState(true);
  const [zoom,      setZoomSt]   = useState(100);

  const [cpShow, setCpShow]   = useState(false);
  const [cpTarget,setCpTgt]   = useState('text');
  const [cpPos,   setCpPos]   = useState({ top: 0, left: 0 });
  const [textClr, setTextClr] = useState('#000000');
  const [hiClr,   setHiClr]   = useState('#FFFF00');

  const [wc, setWc] = useState(0);
  const [cc, setCc] = useState(0);
  const [pg, setPg] = useState(1);

  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState('');
  const [toastMsg,setToastMsg]  = useState('');
  const [toastOn, setToastOn]   = useState(false);

  const [fmt, setFmt] = useState({
    bold:false,italic:false,underline:false,strikeThrough:false,
    subscript:false,superscript:false,
    justifyLeft:false,justifyCenter:false,justifyRight:false,justifyFull:false,
    insertUnorderedList:false,insertOrderedList:false,
  });
  const [fontFamily, setFontFamily] = useState('Calibri');
  const [fontSize,   setFontSize]   = useState(12);

  /* ── helper: toast ── */
  const toast = useCallback((msg) => {
    setToastMsg(msg); setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 2800);
  }, []);

  /* ── helper: loading ── */
  const showLoad = (msg) => { setLoadMsg(msg||'Memproses...'); setLoading(true); };
  const hideLoad = () => setLoading(false);

  /* ── execCommand ── */
  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    syncFmt();
  }, []);

  /* ── sync toolbar states ── */
  const syncFmt = useCallback(() => {
    const cmds = ['bold','italic','underline','strikeThrough','subscript','superscript',
                  'justifyLeft','justifyCenter','justifyRight','justifyFull',
                  'insertUnorderedList','insertOrderedList'];
    const next = {};
    cmds.forEach(c => { try { next[c] = document.queryCommandState(c); } catch { next[c]=false; } });
    setFmt(prev => ({ ...prev, ...next }));
  }, []);

  /* ── sync status bar ── */
  const syncStatus = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const txt = ed.innerText || '';
    const w = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    setWc(w); setCc(txt.length);
    const pages = Math.max(1, Math.ceil(ed.scrollHeight / 931));
    setPg(pages);
  }, []);

  /* ── draw ruler ── */
  const drawRuler = useCallback(() => {
    const c = rulerRef.current;
    if (!c) return;
    const W = 794, H = 22, L = 100, R = 100;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#D8D8D8';
    ctx.fillRect(0, 0, L, H);
    ctx.fillRect(W - R, 0, R, H);
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(L, 0, W - L - R, H);
    ctx.strokeStyle = '#C0C0C0'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0,H-0.5); ctx.lineTo(W,H-0.5); ctx.stroke();
    ctx.font = '9px Segoe UI,system-ui'; ctx.textAlign = 'center';
    const work = W - L - R;
    for (let px = 0; px <= work; px += 10) {
      const x = L + px, big = px % 50 === 0;
      ctx.strokeStyle = '#888'; ctx.lineWidth = big ? 0.8 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, big ? 8 : 12); ctx.lineTo(x, H - 1); ctx.stroke();
      if (big && px > 0 && px < work) {
        ctx.fillStyle = '#555';
        ctx.fillText((Math.round(px / 37.8 * 10) / 10) + '', x, 7);
      }
    }
    ctx.strokeStyle = '#2B579A'; ctx.lineWidth = 1;
    [L, W - R].forEach(x => { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); });
  }, []);

  /* ── load Firestore docs ── */
  const loadList = useCallback(async () => {
    try {
      const list = await getAllDokumenEditor();
      setDocs(list);
    } catch { /* silent */ }
  }, []);

  /* ── init ── */
  useEffect(() => {
    drawRuler();
    loadList().then(() => {
      // start with a blank doc
      newDocLocal();
    });
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* ── document management ── */
  const flushHtml = useCallback(() => {
    return editorRef.current?.innerHTML || '';
  }, []);

  function newDocLocal() {
    const name = 'Dokumen' + docNRef.n++;
    setDocName(name);
    setCurId(null);
    if (editorRef.current) editorRef.current.innerHTML = '';
    syncStatus();
  }

  async function selectDoc(doc) {
    setDocName(doc.judul);
    setCurId(doc.id);
    if (editorRef.current) editorRef.current.innerHTML = DOMPurify.sanitize(doc.konten || '');
    syncStatus();
  }

  async function saveDoc() {
    const konten = flushHtml();
    const data = { judul: docName.trim() || 'Tanpa Judul', konten };
    try {
      if (curId) {
        await updateDokumenEditor(curId, data);
        setDocs(prev => prev.map(d => d.id === curId ? { ...d, ...data } : d));
      } else {
        const id = await createDokumenEditor(data);
        const newDoc = { id, ...data };
        setDocs(prev => [newDoc, ...prev]);
        setCurId(id);
      }
      toast('✓ Dokumen tersimpan: ' + data.judul);
    } catch { toast('✕ Gagal menyimpan'); }
  }

  async function deleteDoc(id, e) {
    e.stopPropagation();
    if (!confirm('Hapus dokumen ini?')) return;
    try {
      await removeDokumenEditor(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      if (curId === id) newDocLocal();
      toast('Dokumen dihapus');
    } catch { toast('✕ Gagal menghapus'); }
  }

  /* ── formatting helpers ── */
  function applyFont(f) { setFontFamily(f); exec('fontName', f); }

  function applyFontSize(pt) {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    exec('fontSize', 7);
    ed.querySelectorAll('font[size="7"]').forEach(el => {
      const sp = document.createElement('span');
      sp.style.fontSize = pt + 'pt';
      sp.innerHTML = el.innerHTML;
      el.replaceWith(sp);
    });
  }

  function growFont() { const v = Math.min(96, fontSize + 2); setFontSize(v); applyFontSize(v); }
  function shrinkFont() { const v = Math.max(6, fontSize - 2); setFontSize(v); applyFontSize(v); }
  function applyBlock(tag) { exec('formatBlock', tag); }

  function toggleBQ() {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const node = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
    if (node?.closest('blockquote')) exec('formatBlock', 'p');
    else exec('formatBlock', 'blockquote');
  }

  /* ── insert helpers ── */
  function insertTable() {
    const r = prompt('Jumlah baris:', '3');
    const c = prompt('Jumlah kolom:', '3');
    if (!r || !c) return;
    const rows = Math.min(50, Math.max(1, +r));
    const cols = Math.min(20, Math.max(1, +c));
    let h = '<table>';
    for (let i = 0; i < rows; i++) h += '<tr>' + '<td>&nbsp;</td>'.repeat(cols) + '</tr>';
    h += '</table><p><br></p>';
    exec('insertHTML', h);
  }

  function insertImage() {
    imgRef.current?.click();
  }

  function handleImageFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 2 MB");
      e.target.value = '';
      return;
    }
    const r = new FileReader();
    r.onload = ev => exec('insertHTML', `<img src="${ev.target.result}" style="max-width:100%;height:auto;display:block;margin:4px 0">`);
    r.readAsDataURL(f);
    e.target.value = '';
  }

  function insertHR() { exec('insertHTML', '<hr><p><br></p>'); }

  function insertPB() {
    exec('insertHTML', '<div class="we-pb">——— Halaman Baru ———</div><p><br></p>');
  }

  function insertLink() {
    const url = prompt('Masukkan URL:', 'https://');
    if (!url) return;
    if (!url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('/')) {
      alert('URL tidak valid. Gunakan format https://...');
      return;
    }
    const sel = window.getSelection();
    const txt = (sel && !sel.isCollapsed) ? sel.toString() : url;
    const safeUrl = url.replace(/"/g, '&quot;');
    const safeTxt = txt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    exec('insertHTML', `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTxt}</a>`);
  }

  function setLineSpace(v) {
    if (editorRef.current) editorRef.current.style.lineHeight = v;
  }

  /* ── color picker ── */
  function showCP(target, e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setCpTgt(target);
    setCpPos({ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 220) });
    setCpShow(v => !v);
  }

  function applyColor(c) {
    if (cpTarget === 'text') { setTextClr(c); exec('foreColor', c); }
    else { setHiClr(c); exec('backColor', c); }
    setCpShow(false);
  }

  /* ── zoom ── */
  function setZoom(v) {
    const val = Math.min(200, Math.max(40, +v));
    setZoomSt(val);
    if (editorRef.current?.closest('.we-doc-area')) {
      // apply zoom to doc-area children
    }
  }

  /* ── import ── */
  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const ext = file.name.split('.').pop().toLowerCase();
    showLoad('Mengimpor ' + file.name + '…');
    try {
      let html = '';
      if (ext === 'txt') {
        const t = await file.text();
        html = t.split('\n').map(l => `<p>${escHtml(l) || '<br>'}</p>`).join('');
      } else if (ext === 'docx' || ext === 'doc') {
        const mammoth = (await import('mammoth')).default;
        const buf = await file.arrayBuffer();
        const res = await mammoth.convertToHtml({ arrayBuffer: buf });
        html = res.value;
      } else if (ext === 'pdf') {
        html = await readPDF(file);
      } else {
        toast('Format tidak didukung. Gunakan PDF, DOCX, atau TXT.');
        return;
      }
      if (editorRef.current) editorRef.current.innerHTML = DOMPurify.sanitize(html);
      const name = file.name.replace(/\.[^.]+$/, '');
      setDocName(name);
      setCurId(null);
      syncStatus();
      toast('✓ Berhasil diimpor: ' + file.name);
    } catch (err) {
      toast('✕ Gagal impor: ' + err.message);
    } finally { hideLoad(); }
  }

  async function readPDF(file) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
    ).href;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let html = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const ct   = await page.getTextContent();
      let txt = '';
      ct.items.forEach(it => { if ('str' in it) txt += it.str + (it.hasEOL ? '\n' : ''); });
      html += txt.split('\n').map(l => `<p>${escHtml(l) || '<br>'}</p>`).join('');
      if (p < pdf.numPages) html += '<hr>';
    }
    return html;
  }

  /* ── export PDF ── */
  async function exportPDF() {
    showLoad('Mengekspor PDF…');
    try {
      const pg = pageRef.current;
      const canvas = await html2canvas(pg, {
        scale: 2, useCORS: true, backgroundColor: '#fff', logging: false,
      });
      const img = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw  = pdf.internal.pageSize.getWidth();
      const ph  = pdf.internal.pageSize.getHeight();
      const sh  = (canvas.height * pw) / canvas.width;
      if (sh <= ph) {
        pdf.addImage(img, 'JPEG', 0, 0, pw, sh);
      } else {
        let y = 0;
        while (y < sh) {
          if (y > 0) pdf.addPage();
          pdf.addImage(img, 'JPEG', 0, -y, pw, sh);
          y += ph;
        }
      }
      pdf.save((docName || 'dokumen') + '.pdf');
      toast('✓ PDF tersimpan');
    } catch (err) { toast('✕ Gagal ekspor PDF: ' + err.message); }
    finally { hideLoad(); }
  }

  /* ── export Word ── */
  function exportWord() {
    const body = DOMPurify.sanitize(editorRef.current?.innerHTML || '');
    const name = docName || 'dokumen';
    const mht = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>
@page WordSection1{size:21cm 29.7cm;margin:2.54cm;}
div.WordSection1{page:WordSection1;}
body{font-family:Calibri,'Segoe UI',sans-serif;font-size:12pt;line-height:1.5;color:#000;}
h1{font-size:18pt;font-weight:700;color:#1F3864;}
h2{font-size:14pt;font-weight:700;color:#2F5496;}
h3{font-size:12pt;font-weight:700;}
table{border-collapse:collapse;width:100%;}
td,th{border:1pt solid #BFBFBF;padding:5pt 8pt;}
th{background:#D6DCE4;font-weight:600;}
blockquote{border-left:3pt solid #5B9BD5;padding-left:12pt;font-style:italic;color:#555;}
</style>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
</head><body><div class="WordSection1">${body}</div></body></html>`;
    const blob = new Blob(['﻿', mht], { type: 'application/msword' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = name + '.doc'; a.click();
    URL.revokeObjectURL(url);
    toast('✓ Word tersimpan: ' + name + '.doc');
  }

  /* ── render ── */
  return (
    <div className="we-root" onClick={() => setCpShow(false)}>

      {/* ── TITLE BAR ── */}
      <div className="we-tbar">
        <div className="we-logo">W</div>
        <div className="we-qa-btns">
          <button className="we-qa-btn" title="Simpan (Ctrl+S)" onClick={saveDoc}>💾</button>
          <button className="we-qa-btn" title="Batalkan" onClick={() => exec('undo')}>↩</button>
          <button className="we-qa-btn" title="Ulangi"   onClick={() => exec('redo')}>↪</button>
          <button className="we-qa-btn" title="Cetak"    onClick={() => window.print()}>🖨</button>
        </div>
        <div className="we-tbar-title">{docName} — Word Editor</div>
        <button className="we-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* ── RIBBON TABS ── */}
      <div className="we-rtabs">
        {['home','insert','format','view'].map(t => (
          <button
            key={t}
            className={`we-rtab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {{ home:'Beranda', insert:'Sisipkan', format:'Format', view:'Tampilan' }[t]}
          </button>
        ))}
      </div>

      {/* ── RIBBON BODY ── */}
      <div className="we-ribbon">

        {/* ═══ BERANDA ═══ */}
        <div className={`we-rpanel${tab==='home' ? ' active' : ''}`}>

          {/* Papan Klip */}
          <div className="we-rgroup">
            <div className="we-rgroup-tools" style={{gap:'4px'}}>
              <button className="we-rb big" onClick={() => fileRef.current?.click()}>
                <span className="bigicon">📥</span>Impor
              </button>
              <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                <button className="we-rb" style={{fontSize:'11px'}} onClick={() => exec('cut')}>✂ Potong</button>
                <button className="we-rb" style={{fontSize:'11px'}} onClick={() => exec('copy')}>📋 Salin</button>
                <button className="we-rb" style={{fontSize:'11px'}} onClick={() => exec('paste')}>📌 Tempel</button>
              </div>
            </div>
            <div className="we-glabel">Papan Klip</div>
          </div>

          {/* Font */}
          <div className="we-rgroup">
            <div className="we-rgroup-tools rows">
              <div className="we-rrow">
                <select className="we-font-sel" value={fontFamily}
                  onChange={e => applyFont(e.target.value)}>
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
                <input type="number" className="we-fsize-in" value={fontSize} min={6} max={96}
                  onChange={e => setFontSize(+e.target.value)}
                  onBlur={e => applyFontSize(+e.target.value)}
                  onKeyDown={e => e.key==='Enter' && applyFontSize(+e.target.value)} />
                <button className="we-rb" title="Perbesar" onClick={growFont}>A<sup>+</sup></button>
                <button className="we-rb" title="Perkecil" onClick={shrinkFont}>A<sub>-</sub></button>
                <button className="we-rb" title="Hapus format" onClick={() => exec('removeFormat')} style={{fontSize:'11px'}}>✕A</button>
              </div>
              <div className="we-rrow">
                <button className={`we-rb${fmt.bold?' on':''}`} onClick={() => exec('bold')}
                  title="Tebal (Ctrl+B)" style={{fontWeight:700,fontSize:'14px'}}>B</button>
                <button className={`we-rb${fmt.italic?' on':''}`} onClick={() => exec('italic')}
                  title="Miring (Ctrl+I)" style={{fontStyle:'italic',fontSize:'14px',fontFamily:'Georgia,serif'}}>I</button>
                <button className={`we-rb${fmt.underline?' on':''}`} onClick={() => exec('underline')}
                  title="Garis bawah" style={{textDecoration:'underline',fontSize:'13px'}}>U</button>
                <button className={`we-rb${fmt.strikeThrough?' on':''}`} onClick={() => exec('strikeThrough')}
                  title="Coret" style={{textDecoration:'line-through',fontSize:'13px'}}>S</button>
                <button className={`we-rb${fmt.subscript?' on':''}`} onClick={() => exec('subscript')}
                  title="Subskrip" style={{fontSize:'10px'}}>x<sub>2</sub></button>
                <button className={`we-rb${fmt.superscript?' on':''}`} onClick={() => exec('superscript')}
                  title="Superskrip" style={{fontSize:'10px'}}>x<sup>2</sup></button>
                <div className="we-rsep"/>
                <div className="we-color-strip" onClick={e => showCP('text',e)} title="Warna Teks">
                  <span style={{fontSize:'13px',fontWeight:700,lineHeight:1}}>A</span>
                  <div className="we-cswatch" style={{background:textClr}}/>
                </div>
                <div className="we-color-strip" onClick={e => showCP('highlight',e)} title="Sorotan">
                  <span style={{fontSize:'15px',lineHeight:1}}>🖍</span>
                  <div className="we-cswatch" style={{background:hiClr}}/>
                </div>
              </div>
            </div>
            <div className="we-glabel">Font</div>
          </div>

          {/* Paragraf */}
          <div className="we-rgroup">
            <div className="we-rgroup-tools rows">
              <div className="we-rrow">
                <button className={`we-rb${fmt.insertUnorderedList?' on':''}`} title="Daftar Butir"
                  onClick={() => exec('insertUnorderedList')}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="0" y="2" width="2" height="2"/><rect x="4" y="2" width="10" height="2" rx="1"/>
                    <rect x="0" y="6" width="2" height="2"/><rect x="4" y="6" width="10" height="2" rx="1"/>
                    <rect x="0" y="10" width="2" height="2"/><rect x="4" y="10" width="10" height="2" rx="1"/>
                  </svg>
                </button>
                <button className={`we-rb${fmt.insertOrderedList?' on':''}`} title="Daftar Bernomor"
                  onClick={() => exec('insertOrderedList')}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <text x="0" y="4" fontSize="4">1.</text><rect x="4" y="2" width="10" height="2" rx="1"/>
                    <text x="0" y="8.5" fontSize="4">2.</text><rect x="4" y="6" width="10" height="2" rx="1"/>
                    <text x="0" y="13" fontSize="4">3.</text><rect x="4" y="10" width="10" height="2" rx="1"/>
                  </svg>
                </button>
                <button className="we-rb" title="Kurangi inden" onClick={() => exec('outdent')}>⇤</button>
                <button className="we-rb" title="Tambah inden"  onClick={() => exec('indent')}>⇥</button>
                <div className="we-rsep"/>
                <button className="we-rb" title="Kutipan" onClick={toggleBQ}>❝</button>
                <button className="we-rb" title="Normal" style={{fontSize:'10px'}}
                  onClick={() => applyBlock('p')}>¶</button>
              </div>
              <div className="we-rrow">
                <button className={`we-rb${fmt.justifyLeft?' on':''}`} title="Rata Kiri" onClick={() => exec('justifyLeft')}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="9" height="2" rx="1"/>
                    <rect x="0" y="9" width="14" height="2" rx="1"/><rect x="0" y="13" width="7" height="2" rx="1"/>
                  </svg>
                </button>
                <button className={`we-rb${fmt.justifyCenter?' on':''}`} title="Tengah" onClick={() => exec('justifyCenter')}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="0" y="1" width="14" height="2" rx="1"/><rect x="2" y="5" width="10" height="2" rx="1"/>
                    <rect x="0" y="9" width="14" height="2" rx="1"/><rect x="3" y="13" width="8" height="2" rx="1"/>
                  </svg>
                </button>
                <button className={`we-rb${fmt.justifyRight?' on':''}`} title="Rata Kanan" onClick={() => exec('justifyRight')}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="0" y="1" width="14" height="2" rx="1"/><rect x="5" y="5" width="9" height="2" rx="1"/>
                    <rect x="0" y="9" width="14" height="2" rx="1"/><rect x="7" y="13" width="7" height="2" rx="1"/>
                  </svg>
                </button>
                <button className={`we-rb${fmt.justifyFull?' on':''}`} title="Justify" onClick={() => exec('justifyFull')}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="5" width="14" height="2" rx="1"/>
                    <rect x="0" y="9" width="14" height="2" rx="1"/><rect x="0" y="13" width="14" height="2" rx="1"/>
                  </svg>
                </button>
                <div className="we-rsep"/>
                <button className="we-rb" title="Hapus tautan" style={{fontSize:'11px'}} onClick={() => exec('unlink')}>🔗✕</button>
                <button className="we-rb" title="Tautan"       style={{fontSize:'11px'}} onClick={insertLink}>🔗</button>
              </div>
            </div>
            <div className="we-glabel">Paragraf</div>
          </div>

          {/* Gaya */}
          <div className="we-rgroup">
            <div className="we-rgroup-tools" style={{flexWrap:'wrap',maxWidth:'180px',gap:'3px',alignContent:'flex-start',paddingTop:'4px'}}>
              <button className="we-sty-btn we-sty-n"  onClick={() => applyBlock('p')}>Normal</button>
              <button className="we-sty-btn we-sty-h1" onClick={() => applyBlock('h1')}>Judul 1</button>
              <button className="we-sty-btn we-sty-h2" onClick={() => applyBlock('h2')}>Judul 2</button>
              <button className="we-sty-btn we-sty-h3" onClick={() => applyBlock('h3')}>Judul 3</button>
            </div>
            <div className="we-glabel">Gaya</div>
          </div>

          {/* Ekspor */}
          <div className="we-rgroup">
            <div className="we-rgroup-tools" style={{flexDirection:'column',gap:'4px',justifyContent:'center'}}>
              <button className="we-act-btn we-act-primary" onClick={exportPDF}>📄 Ekspor PDF</button>
              <button className="we-act-btn we-act-success" onClick={exportWord}>📝 Ekspor Word</button>
            </div>
            <div className="we-glabel">Ekspor</div>
          </div>
        </div>

        {/* ═══ SISIPKAN ═══ */}
        <div className={`we-rpanel${tab==='insert' ? ' active' : ''}`}>
          <div className="we-rgroup">
            <div className="we-rgroup-tools" style={{gap:'6px'}}>
              <button className="we-rb big" onClick={insertTable}><span className="bigicon">🗃</span>Tabel</button>
              <button className="we-rb big" onClick={insertImage}><span className="bigicon">🖼</span>Gambar</button>
              <button className="we-rb big" onClick={insertHR}><span className="bigicon">—</span>Garis</button>
              <button className="we-rb big" onClick={insertPB}><span className="bigicon">📄</span>Hlm<br/>Baru</button>
              <button className="we-rb big" onClick={insertLink}><span className="bigicon">🔗</span>Tautan</button>
              <button className="we-rb big" onClick={() => exec('insertHTML','<p><br></p><p><br></p><p><br></p>')}>
                <span className="bigicon">↵</span>Baris<br/>Baru
              </button>
            </div>
            <div className="we-glabel">Sisipkan</div>
          </div>
        </div>

        {/* ═══ FORMAT ═══ */}
        <div className={`we-rpanel${tab==='format' ? ' active' : ''}`}>
          <div className="we-rgroup">
            <div className="we-rgroup-tools rows">
              <div className="we-rrow">
                <label style={{fontSize:'11px',color:'#666',width:'90px'}}>Spasi baris:</label>
                <select className="we-fmt-sel" defaultValue="1.5" onChange={e => setLineSpace(e.target.value)}>
                  {['1.0','1.15','1.5','2.0','2.5','3.0'].map(v =>
                    <option key={v} value={v}>{v} baris</option>)}
                </select>
              </div>
            </div>
            <div className="we-glabel">Spasi</div>
          </div>
          <div className="we-rgroup">
            <div className="we-rgroup-tools rows">
              <div className="we-rrow">
                <label style={{fontSize:'11px',color:'#666',width:'80px'}}>Margin kiri:</label>
                <input type="number" className="we-fsize-in" style={{width:'50px'}} defaultValue="100"
                  id="ml-val" onChange={() => {
                    const l = document.getElementById('ml-val')?.value;
                    const r = document.getElementById('mr-val')?.value;
                    if(pageRef.current){ pageRef.current.style.paddingLeft=l+'px'; pageRef.current.style.paddingRight=r+'px'; }
                  }}/> px
              </div>
              <div className="we-rrow">
                <label style={{fontSize:'11px',color:'#666',width:'80px'}}>Margin kanan:</label>
                <input type="number" className="we-fsize-in" style={{width:'50px'}} defaultValue="100"
                  id="mr-val" onChange={() => {
                    const l = document.getElementById('ml-val')?.value;
                    const r = document.getElementById('mr-val')?.value;
                    if(pageRef.current){ pageRef.current.style.paddingLeft=l+'px'; pageRef.current.style.paddingRight=r+'px'; }
                  }}/> px
              </div>
            </div>
            <div className="we-glabel">Margin</div>
          </div>
        </div>

        {/* ═══ TAMPILAN ═══ */}
        <div className={`we-rpanel${tab==='view' ? ' active' : ''}`}>
          <div className="we-rgroup">
            <div className="we-rgroup-tools" style={{gap:'6px'}}>
              <button className="we-rb big" onClick={() => setSidebar(v => !v)}><span className="bigicon">☰</span>Panel</button>
              <button className="we-rb big" onClick={() => setZoom(zoom+10)}><span className="bigicon">🔍</span>+Besar</button>
              <button className="we-rb big" onClick={() => setZoom(zoom-10)}><span className="bigicon">🔎</span>−Kecil</button>
              <button className="we-rb big" onClick={() => setZoom(100)}><span className="bigicon">⊡</span>100%</button>
            </div>
            <div className="we-glabel">Tampilan</div>
          </div>
          <div className="we-rgroup">
            <div className="we-rgroup-tools" style={{flexDirection:'column',gap:'4px',justifyContent:'center'}}>
              <button className="we-act-btn we-act-neutral" onClick={() => window.print()}>🖨 Cetak</button>
              <button className="we-act-btn we-act-neutral" onClick={() => exec('selectAll')}>⊞ Pilih Semua</button>
            </div>
            <div className="we-glabel">Alat</div>
          </div>
        </div>
      </div>

      {/* ── RULER ── */}
      <div className="we-ruler-wrap">
        <canvas ref={rulerRef} className="ruler-canvas" height="22" />
      </div>

      {/* ── HIDDEN INPUTS ── */}
      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{display:'none'}} onChange={handleImport} />
      <input ref={imgRef}  type="file" accept="image/*"              style={{display:'none'}} onChange={handleImageFile} />

      {/* ── COLOR PICKER ── */}
      {cpShow && (
        <div className="we-cpop" style={{top:cpPos.top, left:cpPos.left}} onClick={e => e.stopPropagation()}>
          <div className="we-cpop-title">{cpTarget==='text' ? 'Warna Teks' : 'Sorotan Teks'}</div>
          <div className="we-cgrid">
            {COLORS.map(c => (
              <div key={c} className="we-csw" style={{background:c}} title={c} onClick={() => applyColor(c)} />
            ))}
          </div>
          <div className="we-cpop-custom">
            <span>Kustom:</span>
            <input type="color" defaultValue={cpTarget==='text' ? textClr : hiClr}
              onChange={e => applyColor(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="we-main">

        {/* Sidebar */}
        <div className={`we-sidebar${sidebar ? '' : ' off'}`}>
          <div className="we-sb-head">
            <span>Dokumen</span>
            <button className="we-sb-new" onClick={newDocLocal}>+ Baru</button>
          </div>
          <div className="we-doc-list">
            {docs.length === 0 && (
              <div style={{padding:'12px 10px',fontSize:'10px',color:'#999',textAlign:'center'}}>
                Belum ada dokumen tersimpan
              </div>
            )}
            {docs.map(doc => (
              <div key={doc.id} className={`we-di${doc.id===curId?' on':''}`}
                onClick={() => selectDoc(doc)}>
                <span style={{fontSize:'14px',flexShrink:0}}>📄</span>
                <span>{doc.judul}</span>
                <button className="we-di-del" onClick={e => deleteDoc(doc.id, e)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Doc area */}
        <div className="we-doc-area" style={{zoom: zoom/100}}>
          <div className="we-page" ref={pageRef}>
            <div
              className="we-editor"
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onKeyUp={() => { syncFmt(); syncStatus(); }}
              onMouseUp={syncFmt}
            />
            <div className="we-pgnum">{pg}</div>
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div className="we-sbar">
        <span>📄 Hal. <strong>{pg}</strong></span>
        <span className="we-sbar-sep">│</span>
        <span>📝 <strong>{wc}</strong> kata</span>
        <span className="we-sbar-sep">│</span>
        <span>🔤 <strong>{cc}</strong> karakter</span>
        <div className="we-sbar-right">
          <span>{zoom}%</span>
          <input type="range" className="we-zoom-sl" min={40} max={200} value={zoom}
            onChange={e => setZoom(+e.target.value)} />
          <span>Bahasa Indonesia</span>
          <button className="we-back-btn" onClick={saveDoc} style={{background:'rgba(255,255,255,0.15)'}}>
            💾 Simpan
          </button>
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div className="we-loading">
          <div className="we-loading-box">
            <div className="we-spin" />
            <div style={{fontSize:'13px',color:'#555'}}>{loadMsg}</div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`we-toast${toastOn?' show':''}`}>{toastMsg}</div>
    </div>
  );
}
