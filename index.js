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
const FORCA_PULO = 18;
const VELOCIDADE_MOVIMENTO = 5;

// --- CONFIGURAÇÕES DO TEACHABLE MACHINE ---
const URL = "COLE_AQUI_O_LINK_DO_SEU_MODELO/"; // <-- ATENÇÃO: COLOQUE SEU LINK AQUI!
let model, webcam, maxPredictions;


// --- INICIALIZAÇÃO DO JOGO ---
botaoIniciar.addEventListener('click', () => {
    telaInicial.style.display = 'none';
    secaoJogo.style.display = 'flex';
    iniciarJogo();
});

botaoReset.addEventListener('click', () => {
    location.reload(); // Simplesmente recarrega a página para reiniciar
});

// Inicializa o modelo do Teachable Machine e a webcam
async function initTeachableMachine() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true; // Espelha a câmera
    webcam = new tmImage.Webcam(200, 200, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);
}

// Loop de predição do Teachable Machine
async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

// Realiza a predição com base na imagem da webcam
async function predict() {
    if (isGameOver) return;
    const prediction = await model.predict(webcam.canvas);
    
    let maiorProbabilidade = 0;
    let classePredominante = '';

    for (let i = 0; i < maxPredictions; i++) {
        if(prediction[i].probability.toFixed(2) > maiorProbabilidade) {
            maiorProbabilidade = prediction[i].probability.toFixed(2);
            classePredominante = prediction[i].className;
        }
    }
    
    // Controla o personagem com base na predição
    if (classePredominante === "Direita") {
        moverDireita();
    } else if (classePredominante === "Esquerda") {
        moverEsquerda();
    } else { // Neutro
        pararMovimentoHorizontal();
    }
}

// --- LÓGICA DO JOGO ---

function iniciarJogo() {
    isGameOver = false;
    score = 0;
    scoreDisplay.innerHTML = `Pontos: ${score}`;
    initTeachableMachine(); // Inicia a câmera e o modelo
    criarPlataformas();
    personagem.style.bottom = personagemBottom + 'px';
    personagem.style.left = personagemLeft + 'px';
    requestAnimationFrame(gameLoop); // Inicia o loop do jogo
}

function gameLoop() {
    if (isGameOver) {
        fimDeJogo();
        return;
    }

    aplicarGravidade();
    moverPersonagem();
    verificarColisoes();
    
    // Movimenta as plataformas para baixo se o personagem subir
    if (personagemBottom > ALTURA_CAMPO / 2) {
        personagemBottom = ALTURA_CAMPO / 2; // Mantém o personagem no meio da tela
        plataformas.forEach(plataforma => {
            plataforma.bottom -= velocidadeVertical;
            plataforma.visual.style.bottom = plataforma.bottom + 'px';
            if (plataforma.bottom < -20) {
                // Remove a plataforma que saiu da tela e cria uma nova no topo
                plataformas.shift();
                campoJogo.removeChild(plataforma.visual);
                score += 10;
                scoreDisplay.innerHTML = `Pontos: ${score}`;
                
                let novaPlataforma = new Plataforma(ALTURA_CAMPO - 20);
                plataformas.push(novaPlataforma);
            }
        });
    }

    // Condição de fim de jogo
    if (personagemBottom < 0) {
        isGameOver = true;
    }

    requestAnimationFrame(gameLoop);
}

function aplicarGravidade() {
    personagemBottom -= velocidadeVertical;
    velocidadeVertical -= GRAVIDADE;
}

function moverPersonagem() {
    personagemLeft += velocidadeHorizontal;
    // Impede o personagem de sair pelas laterais
    if (personagemLeft > LARGURA_CAMPO - 60) {
        personagemLeft = LARGURA_CAMPO - 60;
    }
    if (personagemLeft < 0) {
        personagemLeft = 0;
    }

    personagem.style.bottom = personagemBottom + 'px';
    personagem.style.left = personagemLeft + 'px';
}

function pular() {
    velocidadeVertical = FORCA_PULO;
}

// --- CONTROLES VINDOS DO TEACHABLE MACHINE ---
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
        this.left = Math.random() * (LARGURA_CAMPO - 85); // 85 é a largura da plataforma
        this.visual = document.createElement('div');

        const visual = this.visual;
        visual.classList.add('plataforma');
        visual.style.left = this.left + 'px';
        visual.style.bottom = this.bottom + 'px';
        campoJogo.appendChild(visual);
    }
}

function criarPlataformas() {
    for (let i = 0; i < QTD_PLATAFORMAS; i++) {
        let gap = ALTURA_CAMPO / QTD_PLATAFORMAS;
        let novaPlataformaBottom = 100 + i * gap;
        let novaPlataforma = new Plataforma(novaPlataformaBottom);
        plataformas.push(novaPlataforma);
    }
}

function verificarColisoes() {
    plataformas.forEach(plataforma => {
        // Verifica se o personagem está caindo e colidindo com a parte de cima da plataforma
        if (
            (personagemBottom >= plataforma.bottom) &&
            (personagemBottom <= plataforma.bottom + 20) &&
            ((personagemLeft + 60) >= plataforma.left) && // +60 é a largura do personagem
            (personagemLeft <= (plataforma.left + 85)) && // +85 é a largura da plataforma
            (velocidadeVertical < 0)
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