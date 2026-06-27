let currentChartData = null;
let audioInst = null;
let audioVoice1 = null;
let audioVoice2 = null;
let isPlaying = false;
let animationFrameId = null;
let ignorarSiguienteScroll = false; 

const alturaCelda = 45; 
let globalZoomFactor = 0.65;
let notaSeleccionada = null; 

window.onload = function() {
    renderizarProyectosArchivados();
    const workspace = document.getElementById('scroll-workspace');
    if (workspace) {
        workspace.addEventListener('click', function(e) {
            if (!e.target.closest('.grid-cell')) {
                deseleccionarNotaActual();
            }
        });
    }
};

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`panel-${tabId}`).classList.add('active');
}

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    document.querySelectorAll('.theme-select-card').forEach(c => c.classList.remove('active-theme'));
    document.getElementById(`theme-${themeName}-btn`).classList.add('active-theme');
}

function cambiarZoomDesdeAjustes(valor) {
    globalZoomFactor = parseFloat(valor);
    document.getElementById('zoom-val-display').innerText = globalZoomFactor.toFixed(2);
    
    const container = document.getElementById('grilla-dinamica-container');
    if (container) container.style.transform = `scale(${globalZoomFactor})`;
}

function abrirModalNuevoChart() { irAPaso1(); document.getElementById('modal-nuevo-chart').classList.add('active'); }
function cerrarModalNuevoChart() { document.getElementById('modal-nuevo-chart').classList.remove('active'); }
function irAPaso2() { document.getElementById('step-1').classList.remove('active'); document.getElementById('step-2').classList.add('active'); }
function irAPaso1() { document.getElementById('step-2').classList.remove('active'); document.getElementById('step-1').classList.add('active'); }

function actualizarNombreArchivo(inputId, labelId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if(input.files.length > 0) label.innerText = input.files[0].name;
}

function crearProyectoFinalFiel() {
    const fileInst = document.getElementById('file-inst').files[0];
    const fileV1 = document.getElementById('file-inst-v1').files[0];
    const fileV2 = document.getElementById('file-inst-v2').files[0];

    if (!fileInst) { alert("El inst.ogg es obligatorio."); return; }
    const bpmInput = parseFloat(document.getElementById('song-bpm').value.trim()) || 160;
    const nameInput = document.getElementById('song-name').value.trim();

    limpiarAudiosExistentes();

    audioInst = new Audio(URL.createObjectURL(fileInst));
    if(fileV1) audioVoice1 = new Audio(URL.createObjectURL(fileV1));
    if(fileV2) audioVoice2 = new Audio(URL.createObjectURL(fileV2));

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();

    reader.onload = function(e) {
        audioCtx.decodeAudioData(e.target.result, function(buffer) {
            const duracionSegundos = buffer.duration;
            const totalSteps = Math.ceil((bpmInput / 60) * duracionSegundos * 4);
            const filasFinales = Math.ceil(totalSteps / 16) * 16;

            currentChartData = {
                id: 'chart_' + Date.now(),
                songName: nameInput,
                bpm: bpmInput,
                author: document.getElementById('song-author').value.trim(),
                charter: document.getElementById('song-charter').value.trim(),
                totalRows: filasFinales,
                notes: {}
            };

            generarEstructuraGrilla(filasFinales);
            cargarDatosEnMesa(fileV1, fileV2, nameInput, bpmInput);
            cambiarZoomDesdeAjustes(document.getElementById('setting-zoom').value);

            cerrarModalNuevoChart();
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('editor-workspace').classList.add('active');
        });
    };
    reader.readAsArrayBuffer(fileInst);
}

function limpiarAudiosExistentes() {
    if(audioInst) { audioInst.pause(); audioInst = null; }
    if(audioVoice1) { audioVoice1.pause(); audioVoice1 = null; }
    if(audioVoice2) { audioVoice2.pause(); audioVoice2 = null; }
    isPlaying = false;
    deseleccionarNotaActual();
    cancelAnimationFrame(animationFrameId);
}

function generarEstructuraGrilla(filas) {
    const oponente = document.getElementById('cols-oponente');
    const jugador = document.getElementById('cols-jugador');
    oponente.innerHTML = ''; jugador.innerHTML = '';

    for (let c = 0; c < 4; c++) {
        const col = document.createElement('div'); col.className = 'grid-column';
        for (let f = 0; f < filas; f++) {
            const cell = document.createElement('div'); cell.className = 'grid-cell';
            cell.id = `cell-${f}-${c}`;
            cell.onclick = (e) => manejarClickCelda(e, f, c, cell);
            col.appendChild(cell);
        }
        oponente.appendChild(col);
    }
    for (let c = 4; c < 8; c++) {
        const col = document.createElement('div'); col.className = 'grid-column';
        for (let f = 0; f < filas; f++) {
            const cell = document.createElement('div'); cell.className = 'grid-cell';
            cell.id = `cell-${f}-${c}`;
            cell.onclick = (e) => manejarClickCelda(e, f, c, cell);
            col.appendChild(cell);
        }
        jugador.appendChild(col);
    }
}

function deseleccionarNotaActual() {
    if (notaSeleccionada) {
        const prevCell = document.getElementById(notaSeleccionada);
        if (prevCell) prevCell.classList.remove('selected-note');
        notaSeleccionada = null;
    }
}

function manejarClickCelda(e, f, c, cell) {
    e.stopPropagation(); 
    const id = `cell-${f}-${c}`;
    const key = `${f}-${c}`;

    if (currentChartData.notes[key]) {
        if (notaSeleccionada === id) {
            delete currentChartData.notes[key];
            cell.innerHTML = '';
            cell.classList.remove('selected-note');
            notaSeleccionada = null;
        } else {
            deseleccionarNotaActual();
            notaSeleccionada = id;
            cell.classList.add('selected-note');
        }
    } else {
        deseleccionarNotaActual();
        currentChartData.notes[key] = { len: 0 };
        const circulo = document.createElement('div');
        circulo.className = `grid-note-circle note-col-${c % 4}`;
        cell.appendChild(circulo);
        
        notaSeleccionada = id;
        cell.classList.add('selected-note');
    }
}

function ajustarLongitudNota(dir) {
    if (!notaSeleccionada) return;
    
    const cell = document.getElementById(notaSeleccionada);
    if (!cell) return;
    
    const parts = notaSeleccionada.replace('cell-', '').split('-');
    const f = parseInt(parts[0]); 
    const c = parseInt(parts[1]);
    const key = `${f}-${c}`;
    
    if (!currentChartData.notes[key]) return;
    
    let len = currentChartData.notes[key].len || 0;
    len = Math.max(0, len + dir); 
    currentChartData.notes[key].len = len;
    
    let line = cell.querySelector('.sustain-line');
    if (!line) {
        line = document.createElement('div');
        line.className = 'sustain-line';
        cell.appendChild(line);
    }
    
    line.style.height = (len * alturaCelda) + 'px';
    if (len === 0) line.remove();
}

function cargarDatosEnMesa(v1, v2, name, bpm) {
    document.getElementById('track-player-label').innerText = v1 ? v1.name : "No Player Voice";
    document.getElementById('track-enemy-label').innerText = v2 ? v2.name : "No Enemy Voice";
    document.getElementById('display-song-name').innerText = name;
    document.getElementById('display-song-bpm').innerText = "BPM: " + bpm;
}

function togglePlayPause() {
    if(!audioInst) return;
    const btn = document.getElementById('btn-play-pause');
    if(isPlaying) {
        audioInst.pause(); if(audioVoice1) audioVoice1.pause(); if(audioVoice2) audioVoice2.pause();
        isPlaying = false; btn.innerText = "Reproducir (>)"; btn.classList.remove('playing');
        cancelAnimationFrame(animationFrameId);
    } else {
        const t = audioInst.currentTime;
        if(audioVoice1) audioVoice1.currentTime = t; if(audioVoice2) audioVoice2.currentTime = t;
        audioInst.play(); if(audioVoice1) audioVoice1.play(); if(audioVoice2) audioVoice2.play();
        isPlaying = true; btn.innerText = "Pausar (||)"; btn.classList.add('playing');
        animationFrameId = requestAnimationFrame(actualizarPlaybackFiel);
    }
}

function actualizarPlaybackFiel() {
    if(!audioInst) return;
    const tiempoActual = audioInst.currentTime;
    const stepDuration = (60 / currentChartData.bpm) / 4;
    const currentStep = tiempoActual / stepDuration;
    
    const posicionPx = currentStep * alturaCelda;

    if (isPlaying) {
        const workspace = document.getElementById('scroll-workspace');
        ignorarSiguienteScroll = true; 
        workspace.scrollTop = (posicionPx * globalZoomFactor);
    }
    actualizarContadorDeTiempo(tiempoActual);

    if(isPlaying) {
        if(tiempoActual >= audioInst.duration) { togglePlayPause(); audioInst.currentTime = 0; }
        else { animationFrameId = requestAnimationFrame(actualizarPlaybackFiel); }
    }
}

function manejarScrollManual() {
    if (!audioInst || !currentChartData) return;
    if (ignorarSiguienteScroll) { ignorarSiguienteScroll = false; return; }
    if (isPlaying) togglePlayPause(); 

    const workspace = document.getElementById('scroll-workspace');
    const posicionPxReal = workspace.scrollTop / globalZoomFactor;
    const stepDuration = (60 / currentChartData.bpm) / 4;
    let nuevoTiempo = (posicionPxReal / alturaCelda) * stepDuration;

    if (nuevoTiempo < 0) nuevoTiempo = 0;
    if (nuevoTiempo > audioInst.duration) nuevoTiempo = audioInst.duration;

    audioInst.currentTime = nuevoTiempo;
    if (audioVoice1) audioVoice1.currentTime = nuevoTiempo;
    if (audioVoice2) audioVoice2.currentTime = nuevoTiempo;
    actualizarContadorDeTiempo(nuevoTiempo);
}

function actualizarContadorDeTiempo(tiempo) {
    let mins = Math.floor(tiempo / 60); let secs = Math.floor(tiempo % 60); let ms = Math.floor((tiempo % 1) * 100);
    const stepDuration = (60 / currentChartData.bpm) / 4;
    const currentBeat = (tiempo / stepDuration) / 4;
    document.getElementById('txt-time').innerHTML = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}.${ms.toString().padStart(2,'0')}`;
    document.querySelectorAll('.bottom-playback-bar span')[1].innerText = `Beat: ${currentBeat.toFixed(2)}`;
}

function renderizarProyectosArchivados() {
    const grid = document.getElementById('lista-proyectos-grid'); if (!grid) return;
    grid.innerHTML = `<div class="folder-card new-project" onclick="abrirModalNuevoChart()"><div class="folder-icon">➕</div><h3>Nuevo Chart</h3></div>`;
    let proyectos = JSON.parse(localStorage.getItem('fnf_mobile_charts')) || [];
    proyectos.forEach(proy => {
        const card = document.createElement('div'); card.className = 'folder-card';
        card.innerHTML = `
            <button class="delete-project-btn" onclick="eliminarProyectoArchivado(event, '${proy.id}')">X</button>
            <div class="folder-icon" onclick="cargarProyectoDesdeArchivo('${proy.id}')">🎵</div>
            <h3 onclick="cargarProyectoDesdeArchivo('${proy.id}')">${proy.songName}</h3>
            <p style="font-size:11px; color:var(--text-sub);">BPM: ${proy.bpm}</p>`;
        grid.appendChild(card);
    });
}

function eliminarProyectoArchivado(event, id) {
    event.stopPropagation(); if(!confirm("¿Eliminar chart?")) return;
    let proyectos = JSON.parse(localStorage.getItem('fnf_mobile_charts')) || [];
    proyectos = proyectos.filter(p => p.id !== id); localStorage.setItem('fnf_mobile_charts', JSON.stringify(proyectos));
    renderizarProyectosArchivados();
}

function cargarProyectoDesdeArchivo(id) {
    let proyectos = JSON.parse(localStorage.getItem('fnf_mobile_charts')) || [];
    const proy = proyectos.find(p => p.id === id); if(!proy) return;
    currentChartData = proy; limpiarAudiosExistentes();
    generarEstructuraGrilla(currentChartData.totalRows);
    for(let key in currentChartData.notes) {
        const parts = key.split('-'); const f = parts[0]; const c = parts[1];
        const cell = document.getElementById(`cell-${f}-${c}`);
        if(cell) {
            const circulo = document.createElement('div'); circulo.className = `grid-note-circle note-col-${c % 4}`; cell.appendChild(circulo);
            const noteData = currentChartData.notes[key];
            if (noteData && noteData.len > 0) {
                const line = document.createElement('div'); line.className = 'sustain-line';
                line.style.height = (noteData.len * alturaCelda) + 'px';
                cell.appendChild(line);
            }
        }
    }
    cargarDatosEnMesa(null, null, currentChartData.songName, currentChartData.bpm);
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('editor-workspace').classList.add('active');
    cambiarZoomDesdeAjustes(0.65);
}

window.addEventListener('keydown', function(e) { if(e.code === "Space") { e.preventDefault(); togglePlayPause(); } });
function toggleMenuArchivos(event) { event.stopPropagation(); document.getElementById('menu-archivos-wrapper').classList.toggle('open'); }
window.addEventListener('click', function() { const wrapper = document.getElementById('menu-archivos-wrapper'); if(wrapper) wrapper.classList.remove('open'); });

function procesarArchivoFNFC(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data && data.songName) {
                currentChartData = data; limpiarAudiosExistentes(); generarEstructuraGrilla(currentChartData.totalRows);
                for(let key in currentChartData.notes) {
                    const parts = key.split('-'); const f = parts[0]; const c = parts[1];
                    const cell = document.getElementById(`cell-${f}-${c}`);
                    if(cell) {
                        const circulo = document.createElement('div'); circulo.className = `grid-note-circle note-col-${c % 4}`; cell.appendChild(circulo);
                        const noteData = currentChartData.notes[key];
                        if (noteData && noteData.len > 0) {
                            const line = document.createElement('div'); line.className = 'sustain-line';
                            line.style.height = (noteData.len * alturaCelda) + 'px';
                            cell.appendChild(line);
                        }
                    }
                }
                cargarDatosEnMesa(null, null, currentChartData.songName, currentChartData.bpm);
                document.getElementById('main-menu').classList.add('hidden');
                document.getElementById('editor-workspace').classList.add('active');
                cambiarZoomDesdeAjustes(0.65);
            }
        } catch(err) { alert("Error al leer archivo .fnfc"); }
    };
    reader.readAsText(file);
}

function menuNuevoChart() { exitEditor(); abrirModalNuevoChart(); }
function menuAbrirChart() { document.getElementById('import-fnfc-input').click(); }
function menuGuardarChartTo() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentChartData, null, 4));
    const dlElem = document.createElement('a'); dlElem.setAttribute("href", dataStr);
    dlElem.setAttribute("download", `${currentChartData.songName.toLowerCase()}.fnfc`); dlElem.click();
}
function menuExit() { exitEditor(); }
function exitEditor() { limpiarAudiosExistentes(); document.getElementById('editor-workspace').classList.remove('active'); document.getElementById('main-menu').classList.remove('hidden'); renderizarProyectosArchivados(); }
