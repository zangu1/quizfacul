const apiKey = "qa_sk_527648f1bd014bfdebf52431b2e6d507ad75d3ef";
const quizId = "cmu4n5soc00a4u3utwre0lpmk";

const CHAVE_RANKING = "quizMentalista_ranking";
const TEMPO_POR_PERGUNTA = 15;

let todasPerguntas = [];
let perguntas = [];
let indice = 0;
let acertos = 0;
let erros = 0;
let temposResposta = [];
let timerInterval = null;
let tempoRestante = TEMPO_POR_PERGUNTA;
let dificuldadeSelecionada = "todas";


const imagensPorTexto = [
  { match: /simon baker|patrick jane/i, src: "img/simon-baker.jpg", alt: "Simon Baker" },
  { match: /red john/i, src: "img/red-john.jpeg", alt: "Red John" }
];

async function buscarPerguntas() {
  const status = document.getElementById("status");
  status.textContent = "Carregando perguntas...";

  try {
    const resposta = await axios.get("https://quizapi.io/api/v1/questions", {
      params: { quiz_id: quizId, include_answers: "true" },
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    todasPerguntas = resposta.data.data;
    status.textContent = "";
    montarTelaConfiguracao();
  } catch (erro) {
    console.error("Erro ao buscar perguntas:", erro);
    status.innerHTML = `<div class="alert alert-danger">Erro ao carregar o quiz. Veja o console (F12).</div>`;
  }
}

function dificuldadesDisponiveis() {
  const set = new Set(todasPerguntas.map(p => p.difficulty || "Não informado"));
  return Array.from(set);
}

function montarTelaConfiguracao() {
  const dificuldades = dificuldadesDisponiveis();
  const quizDiv = document.getElementById("quiz");

  const opcoesDificuldade = dificuldades
    .map(d => `<option value="${d}">${d}</option>`)
    .join("");

  quizDiv.innerHTML = `
    <div class="card shadow">
      <div class="card-body">
        <h5 class="card-title text-center mb-3">Configurar partida</h5>

        <div class="mb-3">
          <label for="selectDificuldade" class="form-label">Dificuldade</label>
          <select id="selectDificuldade" class="form-select">
            <option value="todas" selected>Todas</option>
            ${opcoesDificuldade}
          </select>
        </div>

        <div class="d-grid">
          <button id="btnIniciar" class="btn btn-primary">Iniciar quiz</button>
        </div>
      </div>
    </div>
    ${montarRankingHtml()}
  `;

  document.getElementById("btnIniciar").addEventListener("click", () => {
    dificuldadeSelecionada = document.getElementById("selectDificuldade").value;
    iniciarPartida();
  });
}

function iniciarPartida() {
  perguntas = dificuldadeSelecionada === "todas"
    ? [...todasPerguntas]
    : todasPerguntas.filter(p => (p.difficulty || "Não informado") === dificuldadeSelecionada);

  if (perguntas.length === 0) perguntas = [...todasPerguntas];

  indice = 0;
  acertos = 0;
  erros = 0;
  temposResposta = [];
  document.getElementById("placar").textContent = "";
  mostrarPergunta();
}

function imagemParaPergunta(pergunta) {
  return imagensPorTexto.find(item => item.match.test(pergunta.text)) || null;
}

function iniciarTimer() {
  clearInterval(timerInterval);
  tempoRestante = TEMPO_POR_PERGUNTA;
  atualizarBarraTimer();

  timerInterval = setInterval(() => {
    tempoRestante--;
    atualizarBarraTimer();
    if (tempoRestante <= 0) {
      clearInterval(timerInterval);
      responderPorTempoEsgotado();
    }
  }, 1000);
}

function atualizarBarraTimer() {
  const barra = document.getElementById("barraTimer");
  const texto = document.getElementById("tempoTexto");
  if (!barra) return;

  const pct = (tempoRestante / TEMPO_POR_PERGUNTA) * 100;
  barra.style.width = `${pct}%`;
  barra.className = "progress-bar " + (pct < 30 ? "bg-danger" : pct < 60 ? "bg-warning" : "bg-success");
  if (texto) texto.textContent = `${tempoRestante}s`;
}

function mostrarPergunta() {
  const pergunta = perguntas[indice];
  const quizDiv = document.getElementById("quiz");
  const imagem = imagemParaPergunta(pergunta);
  const imagemHtml = imagem
    ? `<img src="${imagem.src}" alt="${imagem.alt}" class="img-fluid rounded mb-3 pergunta-imagem" />`
    : "";

  const answersValidas = pergunta.answers.filter(a => a.text);

  quizDiv.innerHTML = `
    <div class="card shadow">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge rounded-pill text-bg-primary">Pergunta ${indice + 1} de ${perguntas.length}</span>
          <span class="badge rounded-pill text-bg-secondary">${pergunta.difficulty || "—"}</span>
        </div>

        <div class="progress mb-1" style="height: 8px;">
          <div id="barraTimer" class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
        </div>
        <div class="text-end small text-secondary mb-3" id="tempoTexto">${TEMPO_POR_PERGUNTA}s</div>

        ${imagemHtml}

        <p class="fs-5 fw-bold text-center mb-4">${pergunta.text}</p>

        <div class="d-grid gap-2" id="opcoes">
          ${answersValidas
            .map((a, i) => `<button class="btn btn-outline-light opcao" data-index="${i}">${a.text}</button>`)
            .join("")}
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll(".opcao").forEach(botao => {
    botao.addEventListener("click", () => responder(botao, pergunta));
  });

  iniciarTimer();
}

function responderPorTempoEsgotado() {
  const pergunta = perguntas[indice];
  const answersValidas = pergunta.answers.filter(a => a.text);
  const respostas = document.querySelectorAll(".opcao");

  erros++;
  temposResposta.push(TEMPO_POR_PERGUNTA);

  respostas.forEach((botao, i) => {
    botao.disabled = true;
    if (answersValidas[i].isCorrect) {
      botao.classList.remove("btn-outline-light");
      botao.classList.add("btn-success");
    }
  });

  document.getElementById("status").innerHTML =
    `<div class="text-warning small">Tempo esgotado!</div>`;

  setTimeout(avancar, 1200);
}

function responder(botaoClicado, pergunta) {
  clearInterval(timerInterval);

  const tempoUsado = TEMPO_POR_PERGUNTA - tempoRestante;
  temposResposta.push(tempoUsado);

  const answersValidas = pergunta.answers.filter(a => a.text);
  const respostas = document.querySelectorAll(".opcao");
  const indiceEscolhido = Number(botaoClicado.dataset.index);
  const acertou = answersValidas[indiceEscolhido].isCorrect;

  if (acertou) acertos++; else erros++;

  respostas.forEach((botao, i) => {
    botao.disabled = true;
    botao.classList.remove("btn-outline-light");
    if (answersValidas[i].isCorrect) {
      botao.classList.add("btn-success");
    } else if (i === indiceEscolhido) {
      botao.classList.add("btn-danger");
    }
  });

  setTimeout(avancar, 1000);
}

function avancar() {
  document.getElementById("status").innerHTML = "";
  indice++;
  if (indice < perguntas.length) {
    mostrarPergunta();
  } else {
    finalizarPartida();
  }
}

function finalizarPartida() {
  clearInterval(timerInterval);

  const total = perguntas.length;
  const tempoMedio = temposResposta.length
    ? (temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length).toFixed(1)
    : 0;

  salvarNoRanking({
    acertos,
    total,
    data: new Date().toLocaleDateString("pt-BR"),
    dificuldade: dificuldadeSelecionada
  });

  const quizDiv = document.getElementById("quiz");
  quizDiv.innerHTML = `
    <div class="card shadow">
      <div class="card-body text-center">
        <h4 class="mb-3">Fim do quiz!</h4>
        <div class="row g-2 mb-3">
          <div class="col-4">
            <div class="p-2 rounded bg-success bg-opacity-25">
              <div class="fs-4 fw-bold">${acertos}</div>
              <div class="small">Acertos</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 rounded bg-danger bg-opacity-25">
              <div class="fs-4 fw-bold">${erros}</div>
              <div class="small">Erros</div>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 rounded bg-primary bg-opacity-25">
              <div class="fs-4 fw-bold">${tempoMedio}s</div>
              <div class="small">Tempo médio</div>
            </div>
          </div>
        </div>
        <button id="btnJogarNovamente" class="btn btn-primary">Jogar novamente</button>
      </div>
    </div>
    ${montarRankingHtml()}
  `;

  document.getElementById("btnJogarNovamente").addEventListener("click", montarTelaConfiguracao);
}

function salvarNoRanking(resultado) {
  const ranking = obterRanking();
  ranking.push(resultado);
  ranking.sort((a, b) => (b.acertos / b.total) - (a.acertos / a.total));
  localStorage.setItem(CHAVE_RANKING, JSON.stringify(ranking.slice(0, 5)));
}

function obterRanking() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_RANKING)) || [];
  } catch {
    return [];
  }
}

function montarRankingHtml() {
  const ranking = obterRanking();
  if (ranking.length === 0) return "";

  const linhas = ranking
    .map((r, i) => `
      <tr>
        <td>${i + 1}º</td>
        <td>${r.acertos}/${r.total}</td>
        <td>${r.dificuldade === "todas" ? "Todas" : r.dificuldade}</td>
        <td>${r.data}</td>
      </tr>
    `)
    .join("");

  return `
    <div class="card shadow mt-3">
      <div class="card-body">
        <h6 class="card-title">🏆 Ranking local (top 5)</h6>
        <div class="table-responsive">
          <table class="table table-sm mb-0 align-middle">
            <thead>
              <tr><th>#</th><th>Pontuação</th><th>Dificuldade</th><th>Data</th></tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

buscarPerguntas();