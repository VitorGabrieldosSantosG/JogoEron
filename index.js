// --- ELEMENTOS DO JOGO ---
const campoJogo = document.getElementById('campoJogo');
const personagem = document.getElementById('personagem');
const telaInicial = document.getElementById('telaInicial');
const secaoJogo = document.getElementById('secaoJogo');
const telaFimDeJogo = document.getElementById('telaFimDeJogo');
const botaoIniciar = document.getElementById('botaoIniciar');
const botaoReset = document.getElementById('botaoReset');
const scoreDisplay = document.getElementById('score');
const pontuacaoFinalDisplay = document.getElementById('pontuacaoFinal');

// --- CONFIGURAÇÕES DO JOGO ---
const LARGURA_CAMPO = 400;
const ALTURA_CAMPO = 600;
let isGameOver = false;
let score = 0;
let plataformas = [];
const QTD_PLATAFORMAS = 5;

// --- CONFIGURAÇÕES DO PERSONAGEM ---
let personagemLeft = 50;
let personagemBottom = 150;
let velocidadeVertical = 0;
let velocidadeHorizontal = 0;
const GRAVIDADE = 0.9;
const FORCA_PULO = 15;
const VELOCIDADE_MOVIMENTO = 2.5;

// --- CONFIGURAÇÕES DO TEACHABLE MACHINE ---
const URL = "https://teachablemachine.withgoogle.com/models/0N1eNo-gc/"; // Seu link do Teachable Machine
let model, webcam, maxPredictions;


// --- INICIALIZAÇÃO DO JOGO ---
botaoIniciar.addEventListener('click', () => {
    telaInicial.style.display = 'none';
    secaoJogo.style.display = 'flex';
    iniciarJogo();
});

botaoReset.addEventListener('click', () => {
    location.reload(); 
});

async function initTeachableMachine() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    const flip = true;
    webcam = new tmImage.Webcam(200, 200, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);
    document.getElementById("webcam-container").appendChild(webcam.canvas);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (isGameOver) return;
    const prediction = await model.predict(webcam.canvas);
    let maiorProbabilidade = 0;
    let classePredominante = '';
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability.toFixed(2) > maiorProbabilidade) {
            maiorProbabilidade = prediction[i].probability.toFixed(2);
            classePredominante = prediction[i].className;
        }
    }
    if (classePredominante === "Direita") {
        moverDireita();
    } else if (classePredominante === "Esquerda") {
        moverEsquerda();
    } else {
        pararMovimentoHorizontal();
    }
}

// --- LÓGICA DO JOGO ---

function iniciarJogo() {
    isGameOver = false;
    score = 0;
    scoreDisplay.innerHTML = `Pontos: ${score}`;
    initTeachableMachine();
    criarPlataformas();
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (isGameOver) {
        fimDeJogo();
        return;
    }
    aplicarGravidade();
    moverPersonagem();
    verificarColisoes();
    if (personagemBottom > ALTURA_CAMPO / 2) {
        let scrollSpeed = velocidadeVertical;
        plataformas.forEach(plataforma => {
            plataforma.bottom -= scrollSpeed;
            plataforma.visual.style.bottom = plataforma.bottom + 'px';
        });

        // **CORREÇÃO**: Gerar plataformas de forma mais inteligente
        let plataformaMaisBaixa = plataformas[0];
        if (plataformaMaisBaixa.bottom < -20) {
            plataformas.shift();
            campoJogo.removeChild(plataformaMaisBaixa.visual);
            score += 10;
            scoreDisplay.innerHTML = `Pontos: ${score}`;
            
            // Pega a última plataforma (a mais alta) para basear a posição da nova
            let ultimaPlataforma = plataformas[plataformas.length - 1];
            let novaPlataforma = new Plataforma(ultimaPlataforma.bottom + (ALTURA_CAMPO / QTD_PLATAFORMAS));
            plataformas.push(novaPlataforma);
        }
    }
    if (personagemBottom < -60) { // Damos uma margem maior para a morte
        isGameOver = true;
    }
    requestAnimationFrame(gameLoop);
}

function aplicarGravidade() {
    personagemBottom += velocidadeVertical;
    velocidadeVertical -= GRAVIDADE;
    personagem.style.bottom = personagemBottom + 'px';
}

function moverPersonagem() {
    personagemLeft += velocidadeHorizontal;
    if (personagemLeft > LARGURA_CAMPO - 60) {
        personagemLeft = LARGURA_CAMPO - 60;
    }
    if (personagemLeft < 0) {
        personagemLeft = 0;
    }
    personagem.style.left = personagemLeft + 'px';
}

function pular() {
    velocidadeVertical = FORCA_PULO;
}

function moverDireita() {
    velocidadeHorizontal = VELOCIDADE_MOVIMENTO;
}
function moverEsquerda() {
    velocidadeHorizontal = -VELOCIDADE_MOVIMENTO;
}
function pararMovimentoHorizontal() {
    velocidadeHorizontal = 0;
}

// --- LÓGICA DAS PLATAFORMAS ---

class Plataforma {
    constructor(novaPlataformaBottom) {
        this.bottom = novaPlataformaBottom;
        // **CORREÇÃO**: Limita o quão longe uma plataforma pode aparecer da outra
        let ultimaPlataformaLeft = plataformas.length > 0 ? plataformas[plataformas.length - 1].left : LARGURA_CAMPO / 2 - 42;
        let maxOffset = 150; // Máximo que pode variar para a esquerda ou direita
        let randomOffset = (Math.random() - 0.5) * maxOffset * 2;
        this.left = ultimaPlataformaLeft + randomOffset;

        // Garante que a plataforma não saia da tela
        if (this.left < 0) this.left = 10;
        if (this.left > LARGURA_CAMPO - 85) this.left = LARGURA_CAMPO - 95;

        this.visual = document.createElement('div');
        const visual = this.visual;
        visual.classList.add('plataforma');
        visual.style.left = this.left + 'px';
        visual.style.bottom = this.bottom + 'px';
        campoJogo.appendChild(visual);
    }
}

function criarPlataformas() {
    // **CORREÇÃO**: Limpa plataformas antigas se houver (útil para reiniciar)
    plataformas.forEach(p => campoJogo.removeChild(p.visual));
    plataformas = [];

    // **CORREÇÃO**: Cria uma plataforma inicial estável para o personagem não cair
    const plataformaInicialBottom = 30;
    const plataformaInicialLeft = LARGURA_CAMPO / 2 - 42; // Centralizada
    
    // Adiciona manualmente a primeira plataforma
    let plataformaInicial = {
        bottom: plataformaInicialBottom,
        left: plataformaInicialLeft,
        visual: document.createElement('div')
    };
    plataformaInicial.visual.classList.add('plataforma');
    plataformaInicial.visual.style.left = plataformaInicial.left + 'px';
    plataformaInicial.visual.style.bottom = plataformaInicial.bottom + 'px';
    campoJogo.appendChild(plataformaInicial.visual);
    plataformas.push(plataformaInicial);

    // **CORREÇÃO**: Posiciona o personagem em cima da plataforma inicial
    personagemBottom = plataformaInicialBottom + 20; // 20 é a altura da plataforma
    personagemLeft = plataformaInicial.left;
    personagem.style.bottom = personagemBottom + 'px';
    personagem.style.left = personagemLeft + 'px';
    
    // Cria as outras plataformas iniciais de forma mais natural
    for (let i = 1; i < QTD_PLATAFORMAS; i++) {
        let ultimaPlataforma = plataformas[plataformas.length - 1];
        let novaPlataformaBottom = ultimaPlataforma.bottom + (ALTURA_CAMPO / QTD_PLATAFORMAS);
        let novaPlataforma = new Plataforma(novaPlataformaBottom);
        plataformas.push(novaPlataforma);
    }
}

function verificarColisoes() {
    plataformas.forEach(plataforma => {
        if (
            (velocidadeVertical < 0) && // Apenas checa colisão se estiver caindo
            (personagemBottom > plataforma.bottom) &&
            (personagemBottom < plataforma.bottom + 20) &&
            ((personagemLeft + 60) > plataforma.left) &&
            (personagemLeft < (plataforma.left + 85))
        ) {
            pular();
        }
    });
}

function fimDeJogo() {
    webcam.stop();
    secaoJogo.style.display = 'none';
    telaFimDeJogo.style.display = 'flex';
    pontuacaoFinalDisplay.innerText = `Sua pontuação final foi: ${score}`;
}