import { html, useState, useEffect } from '../preact.js';

export function CalibrationMatrixPanel() {
    const defaultMatrix = {
        gradeA: 90,
        gradeB: 75,
        gradeC: 50,
        gradeD: 25,
        minCurrentA: 6.0,
        maxCurrentA: 9.5,
        minSparkmA: 40.0
    };

    const [matrix, setMatrix] = useState(() => {
        try {
            const saved = localStorage.getItem('coil_cal_matrix');
            return saved ? JSON.parse(saved) : defaultMatrix;
        } catch (e) {
            return defaultMatrix;
        }
    });

    const [msg, setMsg] = useState('');

    const saveMatrix = () => {
        try {
            localStorage.setItem('coil_cal_matrix', JSON.stringify(matrix));
            setMsg('✅ Standar Kalibrasi Berhasil Disimpan!');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg('❌ Gagal menyimpan');
        }
    };

    const resetMatrix = () => {
        setMatrix(defaultMatrix);
        localStorage.removeItem('coil_cal_matrix');
        setMsg('🔄 Reset ke Standar Pabrikan');
        setTimeout(() => setMsg(''), 3000);
    };

    return html`
        <details class="panel" style="margin-top: 6px; border-color: var(--border-sharp); background: rgba(0,0,0,0.25);">
            <summary class="panel-header" style="cursor: pointer; user-select: none; color: var(--neon-yellow, #ffe600); font-weight: 700; font-size: 0.74rem;">
                ⚖️ TABEL MATRIKS KALIBRASI SKOR KELAYAKAN CUSTOM ▾
            </summary>

            <div style="padding-top: 8px; font-size: 0.72rem; display: flex; flex-direction: column; gap: 8px;">
                <div style="color: var(--text-muted);">
                    Atur batas persentase kelayakan koil sesuai hasil temuan uji bengkel Anda:
                </div>

                <!-- GRADE THRESHOLD ROWS -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px;">
                    <div style="background: rgba(0, 255, 102, 0.06); border: 1px solid var(--neon-green); border-radius: 4px; padding: 6px;">
                        <strong style="color: var(--neon-green);">🟩 GRADE A (PRIMA):</strong><br/>
                        ≥ <input type="number" value=${matrix.gradeA} min="80" max="100" style="width: 45px; background: #000; color: #fff; border: 1px solid #444;" onInput=${(e) => setMatrix({...matrix, gradeA: parseInt(e.target.value) || 90})} /> %
                    </div>

                    <div style="background: rgba(255, 230, 0, 0.06); border: 1px solid var(--neon-yellow); border-radius: 4px; padding: 6px;">
                        <strong style="color: var(--neon-yellow);">🟨 GRADE B (DEGRADASI):</strong><br/>
                        ≥ <input type="number" value=${matrix.gradeB} min="60" max="89" style="width: 45px; background: #000; color: #fff; border: 1px solid #444;" onInput=${(e) => setMatrix({...matrix, gradeB: parseInt(e.target.value) || 75})} /> %
                    </div>

                    <div style="background: rgba(255, 149, 0, 0.06); border: 1px solid var(--neon-orange); border-radius: 4px; padding: 6px;">
                        <strong style="color: var(--neon-orange);">🟧 GRADE C (HIDUP-MATI):</strong><br/>
                        ≥ <input type="number" value=${matrix.gradeC} min="40" max="74" style="width: 45px; background: #000; color: #fff; border: 1px solid #444;" onInput=${(e) => setMatrix({...matrix, gradeC: parseInt(e.target.value) || 50})} /> %
                    </div>

                    <div style="background: rgba(255, 45, 85, 0.06); border: 1px solid var(--neon-red); border-radius: 4px; padding: 6px;">
                        <strong style="color: var(--neon-red);">🟥 GRADE D (MATI SURI):</strong><br/>
                        ≥ <input type="number" value=${matrix.gradeD} min="10" max="49" style="width: 45px; background: #000; color: #fff; border: 1px solid #444;" onInput=${(e) => setMatrix({...matrix, gradeD: parseInt(e.target.value) || 25})} /> %
                    </div>
                </div>

                <!-- TOLERANCE LIMITS -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 4px; flex-wrap: wrap; gap: 6px;">
                    <span>Arus Primer Normal: <strong>${matrix.minCurrentA}A - ${matrix.maxCurrentA}A</strong></span>
                    <span>Arus Api Busi Min: <strong>${matrix.minSparkmA} mA</strong></span>
                </div>

                <!-- BUTTON ACTIONS -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <div style="display: flex; gap: 6px;">
                        <button class="btn" style="padding: 4px 10px; font-size: 0.7rem; font-weight: bold; border-color: var(--neon-green); color: var(--neon-green);" onClick=${saveMatrix}>
                            💾 SIMPAN KALIBRASI
                        </button>
                        <button class="btn" style="padding: 4px 8px; font-size: 0.7rem;" onClick=${resetMatrix}>
                            🔄 RESET
                        </button>
                    </div>
                    ${msg ? html`<span style="font-size: 0.72rem; color: var(--neon-green); font-weight: bold;">${msg}</span>` : ''}
                </div>
            </div>
        </details>
    `;
}
