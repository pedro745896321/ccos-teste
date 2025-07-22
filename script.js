// Variáveis globais para a câmera
let currentStream;
let photoTakenBlob; // Para armazenar o blob da imagem capturada
let rotationAngle = 0; // Variável para o ângulo de rotação em graus (0, 90, 180, 270)

// --- FUNÇÕES DA CÂMERA ---
function openCameraModal() {
    document.getElementById('cameraModal').style.display = 'block';
    startCamera();
}

function closeCameraModal() {
    document.getElementById('cameraModal').style.display = 'none';
    stopCamera();
    resetCameraControls();
}

async function startCamera() {
    const video = document.getElementById('camera-feed');
    const takePhotoButton = document.getElementById('take-photo-button');
    const retryPhotoButton = document.getElementById('retry-photo-button');
    const usePhotoButton = document.getElementById('use-photo-button');
    const rotateLeftButton = document.getElementById('rotate-left-button');
    const rotateRightButton = document.getElementById('rotate-right-button');
    const downloadPhotoButton = document.getElementById('download-photo-button');

    try {
        // Solicita acesso à câmera
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Tenta usar a câmera traseira
        video.srcObject = currentStream;
        video.play();

        takePhotoButton.style.display = 'inline-block';
        retryPhotoButton.style.display = 'none';
        usePhotoButton.style.display = 'none';
        rotateLeftButton.style.display = 'none';
        rotateRightButton.style.display = 'none';
        downloadPhotoButton.style.display = 'none';
        video.style.display = 'block';
        document.getElementById('photo-canvas').style.display = 'none'; // Garante que o canvas esteja escondido
        rotationAngle = 0; // Reseta o ângulo ao iniciar a câmera

    } catch (err) {
        console.error("Erro ao acessar a câmera: ", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões ou se há outra aplicação usando-a.");
        closeCameraModal();
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
}

function takePhoto() {
    const video = document.getElementById('camera-feed');
    const photoCanvas = document.getElementById('photo-canvas');
    const context = photoCanvas.getContext('2d');

    // Define o tamanho do canvas para o tamanho do vídeo
    photoCanvas.width = video.videoWidth;
    photoCanvas.height = video.videoHeight;

    // Desenha o frame atual do vídeo no canvas
    context.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);

    // Esconde o vídeo e mostra a imagem capturada no canvas
    video.style.display = 'none';
    photoCanvas.style.display = 'block';

    // Atualiza os botões de controle, mostrando os de rotação e download
    document.getElementById('take-photo-button').style.display = 'none';
    document.getElementById('retry-photo-button').style.display = 'inline-block';
    document.getElementById('use-photo-button').style.display = 'inline-block';
    document.getElementById('rotate-left-button').style.display = 'inline-block';
    document.getElementById('rotate-right-button').style.display = 'inline-block';
    document.getElementById('download-photo-button').style.display = 'inline-block';

    // Armazena a imagem como Blob para enviar ao OCR, resetando o ângulo para a foto original
    rotationAngle = 0; // A foto inicial não tem rotação
    photoCanvas.toBlob((blob) => {
        photoTakenBlob = blob;
    }, 'image/jpeg', 0.95); // Qualidade da imagem

    // AQUI É A MUDANÇA: usePhoto() NÃO é mais chamado automaticamente.
    // O usuário deverá clicar no botão "Usar Foto" para enviar ao OCR.
}

function retryPhoto() {
    startCamera(); // Reinicia a câmera e o estado dos botões
    resetCameraControls(); // Chama para garantir que tudo esteja no estado inicial
}

// Função para redimensionar a imagem
async function resizeImage(fileBlob, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
        reader.readAsDataURL(fileBlob);
    });
}

// Função para desenhar a imagem no canvas com rotação
async function drawRotatedImage() {
    if (!photoTakenBlob) return;

    const img = new Image();
    img.src = URL.createObjectURL(photoTakenBlob); // Cria um URL temporário a partir do blob

    img.onload = () => {
        const photoCanvas = document.getElementById('photo-canvas');
        const context = photoCanvas.getContext('2d');

        let originalWidth = img.width;
        let originalHeight = img.height;

        let newWidth = originalWidth;
        let newHeight = originalHeight;

        if (rotationAngle === 90 || rotationAngle === 270) {
            newWidth = originalHeight;
            newHeight = originalWidth;
        }

        photoCanvas.width = newWidth;
        photoCanvas.height = newHeight;

        context.clearRect(0, 0, photoCanvas.width, photoCanvas.height); // Limpa o canvas

        context.save(); // Salva o estado atual do canvas

        context.translate(photoCanvas.width / 2, photoCanvas.height / 2); // Move o ponto de origem para o centro

        context.rotate(rotationAngle * Math.PI / 180); // Rotaciona

        context.drawImage(img, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);

        context.restore(); // Restaura o estado anterior do canvas

        // Atualiza o blob da imagem com a imagem rotacionada do canvas
        photoCanvas.toBlob((blob) => {
            photoTakenBlob = blob;
        }, 'image/jpeg', 0.95);

        URL.revokeObjectURL(img.src); // Libera o URL do objeto
    };
}

// Funções para girar a imagem
function rotateLeft() {
    rotationAngle = (rotationAngle - 90 + 360) % 360; // Garante que o ângulo fique entre 0 e 270
    drawRotatedImage();
}

function rotateRight() {
    rotationAngle = (rotationAngle + 90) % 360;
    drawRotatedImage();
}

// Função para iniciar o download da foto
function downloadPhoto() {
    if (!photoTakenBlob) {
        showNotification("Não há foto para baixar.", true);
        return;
    }

    const url = URL.createObjectURL(photoTakenBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'foto_capturada.jpg'; // Nome do arquivo a ser baixado
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Libera o URL do objeto
    showNotification("Foto baixada!", false);
}


async function usePhoto() {
    if (!photoTakenBlob) {
        showNotification("Nenhuma foto foi capturada.", true);
        return;
    }

    closeCameraModal(); // Fecha o modal da câmera

    const ocrSpinner = document.getElementById('ocr-spinner');
    const extractButton = document.querySelector('button[onclick="enviarImagemOCR()"]');
    extractButton.disabled = true;
    ocrSpinner.style.display = 'inline-block';
    showNotification("Enviando foto para OCR...", false);

    let imageToSend = photoTakenBlob; // Usa o blob que já foi potencialmente rotacionado

    // Verifica o tamanho do arquivo e redimensiona se for maior que 1MB
    if (photoTakenBlob.size > 1024 * 1024) { // 1MB em bytes
        showNotification("Redimensionando imagem para envio...", false);
        imageToSend = await resizeImage(photoTakenBlob, 1200, 1200, 0.8);
        if (!imageToSend) {
            showNotification("Falha ao redimensionar a imagem.", true);
            extractButton.disabled = false;
            ocrSpinner.style.display = 'none';
            return;
        }
    }

    const formData = new FormData();
    formData.append("apikey", "K89510033988957");
    formData.append("language", "por");
    formData.append("file", imageToSend, "camera_photo.jpg");
    formData.append("OCREngine", "2");

    try {
        const resposta = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
        });
        const dados = await resposta.json();

        if (dados.IsErroredOnProcessing || !dados.ParsedResults || dados.ParsedResults.length === 0) {
            const errorMessage = dados.ErrorMessage ? dados.ErrorMessage.join(". ") : "Ocorreu um erro desconhecido no OCR.";
            showNotification("Erro ao processar a imagem: " + errorMessage, true);
            return;
        }

        const textoExtraido = dados.ParsedResults[0].ParsedText;
        document.getElementById("display-ocr-text").textContent = textoExtraido;
        document.getElementById("ocr-display-area").style.display = 'block';
        showNotification("Texto extraído com sucesso!", false);

    } catch (erro) {
        console.error("Falha na requisição OCR:", erro);
        showNotification("Falha na requisição OCR: " + erro.message, true);
    } finally {
        extractButton.disabled = false;
        ocrSpinner.style.display = 'none';
    }
}

// Reseta o estado dos controles da câmera e variáveis de rotação
function resetCameraControls() {
    document.getElementById('take-photo-button').style.display = 'inline-block';
    document.getElementById('retry-photo-button').style.display = 'none';
    document.getElementById('use-photo-button').style.display = 'none';
    document.getElementById('rotate-left-button').style.display = 'none';
    document.getElementById('rotate-right-button').style.display = 'none';
    document.getElementById('download-photo-button').style.display = 'none';
    document.getElementById('camera-feed').style.display = 'block';
    document.getElementById('photo-canvas').style.display = 'none';
    photoTakenBlob = null;
    rotationAngle = 0; // Reseta o ângulo
}

// Adicione os event listeners para os botões da câmera e de rotação
document.getElementById('take-photo-button').addEventListener('click', takePhoto);
document.getElementById('retry-photo-button').addEventListener('click', retryPhoto);
document.getElementById('use-photo-button').addEventListener('click', usePhoto);
document.getElementById('rotate-left-button').addEventListener('click', rotateLeft);
document.getElementById('rotate-right-button').addEventListener('click', rotateRight);
document.getElementById('download-photo-button').addEventListener('click', downloadPhoto);


// NOVA FUNÇÃO: Transferir texto do OCR para o textarea de input
function transferirParaInput() {
    const textoOCR = document.getElementById("display-ocr-text").textContent;
    if (textoOCR && textoOCR !== "Nenhum texto extraído ainda.") {
        document.getElementById("input-lista").value = textoOCR;
        gerarTabela(); // Já chama a função para gerar a tabela automaticamente
        showNotification("Texto transferido para o editor!", false);
    } else {
        showNotification("Não há texto extraído para transferir.", true);
    }
}


// --- FUNÇÕES DE LÓGICA E MANIPULAÇÃO DA TABELA (Originais mantidas e aprimoradas) ---

function updateNomeCount() {
    const totalNomes = document.querySelectorAll("#tabela-gerada tr").length;
    const nomesConcluidos = document.querySelectorAll("#tabela-gerada input[type='checkbox']:checked").length;
    const nomesRestantes = totalNomes - nomesConcluidos;
    document.getElementById("contador-nomes").textContent = nomesRestantes;
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, ''); // Garante que só há números aqui

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calcDigito = (base, peso) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) {
            soma += parseInt(base.charAt(i)) * (peso - i);
        }
        let resto = (soma * 10) % 11;
        return (resto === 10 || resto === 11) ? 0 : resto;
    };

    const digito1 = calcDigito(cpf.substring(0, 9), 10);
    const digito2 = calcDigito(cpf.substring(0, 9) + digito1, 11);

    return cpf.endsWith(`${digito1}${digito2}`);
}

function gerarTabela() {
    const inputText = document.getElementById("input-lista").value;
    const linhas = inputText.split("\n").map(l => l.trim()).filter(l => l !== "");

    const listaFormatada = [];
    const nomesSemCPF = [];
    const tabela = document.getElementById("tabela-gerada");
    tabela.innerHTML = ""; // Limpa a tabela existente

    // Regex para CPF, agora mais flexível para 'O' ou '0' e diversos separadores
    // Busca 11 caracteres que sejam 0-9 ou O/o
    const regexCPF = /[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2}/;
    const regexNome = /^(?:[0-9]{1,2}\s*-\s*)?([A-ZÀ-Ýa-zà-ÿ'´`]+\s+[A-ZÀ-Ýa-zà-ÿ'´`]+(?:(?:\s+|,\s*)[A-ZÀ-Ýa-zà-ÿ'´`]+)*)/;

    let nomeEncontrado = "";
    let cpfEncontrado = "";
    let emailEncontrado = "-";

    // Vamos iterar linha por linha para identificar o que é o quê
    linhas.forEach(linha => {
        // Ignorar linhas que contêm a frase de horário
        if (linha.toUpperCase().includes("6:00 H ATE 21:00 H")) {
            return; // Pula esta linha
        }

        // Tentar encontrar CPF na linha atual
        const cpfsMatch = linha.match(regexCPF);
        if (cpfsMatch) {
            // Substitui 'O'/'o' por '0' e remove caracteres não numéricos
            cpfEncontrado = cpfsMatch[0].replace(/[Oo]/g, '0').replace(/\D/g, '');
        }

        // Tentar encontrar nome na linha atual
        const nomesMatch = linha.match(regexNome);
        if (nomesMatch && nomesMatch[1]) {
            nomeEncontrado = capitalizarNome(nomesMatch[1].trim());
        }

        // Se encontrarmos um nome E um CPF na mesma iteração, ou se é a última linha de um bloco lógico
        // Consideraremos um "bloco" como nome seguido de cpf (e o horário que ignoramos)
        // Se encontramos um nome e um CPF, ou se encontramos um CPF e já temos um nome, então processamos
        if (nomeEncontrado && cpfEncontrado) {
            adicionarNaTabela(nomeEncontrado, cpfEncontrado, emailEncontrado);

            if (validarCPF(cpfEncontrado)) {
                listaFormatada.push(`[NOME]: ${nomeEncontrado} [CPF]: ${cpfEncontrado}`);
            } else {
                nomesSemCPF.push(`${nomeEncontrado} (CPF Inválido: ${cpfEncontrado})`);
            }

            // Resetar para o próximo bloco
            nomeEncontrado = "";
            cpfEncontrado = "";
            emailEncontrado = "-";
        }
    });

    // Adiciona quaisquer nomes que restaram sem CPF (ex: últimas linhas que só tem nome)
    // Isso é um fallback caso o CPF não seja encontrado na linha imediatamente após o nome.
    // É uma heurística, mas pode ajudar a capturar mais dados.
    if (nomeEncontrado && !cpfEncontrado) {
        nomesSemCPF.push(nomeEncontrado);
    }


    document.getElementById("output-lista").textContent = listaFormatada.join("\n");
    updateNomeCount(); // Atualiza a contagem após gerar a tabela

    // Exibe os nomes sem CPF em um alerta
    if (nomesSemCPF.length > 0) {
        alert("Os seguintes nomes não contêm CPF válido ou detectável (ou foram ignorados):\n" + nomesSemCPF.join("\n"));
    }
}


function capitalizarNome(nome) {
    return nome.split(" ").map(p => {
        const lower = p.toLowerCase();
        if (['da', 'de', 'do', 'dos', 'das', 'e', 'santo', 'santa'].includes(lower)) { // Adicionado 'e', 'santo', 'santa'
            return lower;
        }
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join(" ");
}

function adicionarNaTabela(nome, cpf, email) {
    let tabela = document.getElementById("tabela-gerada");
    const cpfValido = validarCPF(cpf);
    // Adiciona uma classe para CPF inválido, para poder estilizá-lo com CSS
    const classeCPF = cpfValido ? "" : "cpf-invalido";
    const titleCPF = cpfValido ? "" : "title='CPF inválido!'";

    let novaLinha = `
        <tr>
            <td><input type="checkbox"></td>
            <td><button onclick="copiarTexto('${nome}')">${nome || '-'}</button></td>
            <td class="${classeCPF}" ${titleCPF}><button onclick="copiarTexto('${cpf}')">${cpf || '-'}</button></td>
            <td><button onclick="copiarTexto('${email}')">${email || '-'}</button></td>
        </tr>
    `;
    tabela.innerHTML += novaLinha;
}

function filtrarTabela() {
    const termo = document.getElementById("pesquisa").value.toLowerCase();
    const linhas = document.getElementById("tabela-gerada").getElementsByTagName("tr");

    for (let i = 0; i < linhas.length; i++) {
        const nome = linhas[i].getElementsByTagName("td")[1];
        if (nome) {
            const textoNome = nome.textContent.toLowerCase();
            linhas[i].style.display = textoNome.includes(termo) ? "" : "none";
        }
    }
}

function copiarLista() {
    let texto = document.getElementById("output-lista").textContent;
    copiarTexto(texto);
    showNotification("Lista copiada!", false);
}

function gerarEmail() {
    const horario = document.getElementById("horario").value;
    const nomesInput = document.getElementById("nomes").value;
    const nomes = nomesInput.split(',').map(nome => nome.trim()).join('\n');

    const emailText = `Prezados,

${horario},

Estou passando para informar que todas as pessoas mencionados na lista estão cadastrados.
Caso a foto dos colaboradores não seja aceita, é necessário que se dirijam ao setor fiscal da unidade para fazer a correção.

Atenciosamente,

${nomes}`;

    document.getElementById("email-gerado").textContent = emailText.trim();
    showNotification("E-mail gerado!", false);
}

function copiarTexto(texto) {
    const tempInput = document.createElement("textarea");
    tempInput.value = texto;
    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    document.body.appendChild(tempInput);

    tempInput.select();
    try {
        document.execCommand("copy");
        showNotification("Copiado com sucesso!", false);
    } catch (err) {
        console.error("Erro ao copiar texto:", err);
        showNotification("Erro ao copiar texto.", true);
    } finally {
        document.body.removeChild(tempInput);
    }
}

function copiarEmail() {
    const emailText = document.getElementById("email-gerado").textContent;
    copiarTexto(emailText);
}

function showNotification(message, isError) {
    const notification = document.getElementById("copy-notification");
    notification.textContent = message;
    notification.style.backgroundColor = isError ? "#f44336" : "#4CAF50";
    notification.classList.add("show");
    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

// --- INTEGRAÇÃO COM OCR.space ---
async function enviarImagemOCR() {
    const inputFile = document.getElementById("imagem-upload");
    if (inputFile.files.length === 0) {
        showNotification("Por favor, selecione uma imagem para enviar.", true);
        return;
    }

    let arquivo = inputFile.files[0];
    const ocrSpinner = document.getElementById('ocr-spinner');
    const extractButton = document.querySelector('button[onclick="enviarImagemOCR()"]');

    extractButton.disabled = true;
    ocrSpinner.style.display = 'inline-block';
    showNotification("Enviando imagem para OCR...", false);

    // Verifica o tamanho do arquivo e redimensiona se for maior que 1MB
    if (arquivo.size > 1024 * 1024) { // 1MB em bytes
        showNotification("Redimensionando imagem para envio...", false);
        arquivo = await resizeImage(arquivo, 1200, 1200, 0.8);
        if (!arquivo) {
            showNotification("Falha ao redimensionar a imagem.", true);
            extractButton.disabled = false;
            ocrSpinner.style.display = 'none';
            return;
        }
    }

    const formData = new FormData();
    formData.append("apikey", "K89510033988957");
    formData.append("language", "por");
    formData.append("file", arquivo, "uploaded_image.jpg"); // Adicione o nome do arquivo com a extensão
    formData.append("OCREngine", "2");

    try {
        const resposta = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
        });
        const dados = await resposta.json();

        if (dados.IsErroredOnProcessing || !dados.ParsedResults || dados.ParsedResults.length === 0) {
            const errorMessage = dados.ErrorMessage ? dados.ErrorMessage.join(". ") : "Ocorreu um erro desconhecido no OCR.";
            showNotification("Erro ao processar a imagem: " + errorMessage, true);
            return;
        }

        const textoExtraido = dados.ParsedResults[0].ParsedText;
        document.getElementById("display-ocr-text").textContent = textoExtraido;
        document.getElementById("ocr-display-area").style.display = 'block';
        showNotification("Texto extraído com sucesso!", false);

    } catch (erro) {
        console.error("Falha na requisição OCR:", erro);
        showNotification("Falha na requisição OCR: " + erro.message, true);
    } finally {
        extractButton.disabled = false;
        ocrSpinner.style.display = 'none';
    }
}

// --- EVENTOS DA TABELA ---
document.getElementById("tabela-gerada").addEventListener("change", function(e) {
    if (e.target.type === "checkbox") {
        const linha = e.target.closest("tr");
        if (!linha) return;

        const estaMarcado = e.target.checked;

        linha.querySelectorAll("td button").forEach(botao => {
            if (estaMarcado) {
                botao.classList.add("riscado", "desativado");
            } else {
                botao.classList.remove("riscado", "desativado");
            }
        });

        linha.querySelectorAll("td").forEach(td => {
            if (estaMarcado) {
                td.classList.add("riscado");
            } else {
                td.classList.remove("riscado");
            }
        });

        if (estaMarcado) {
            const tbody = linha.parentElement;
            tbody.appendChild(linha);

            linha.classList.add("pular");
            linha.addEventListener('animationend', () => {
                linha.classList.remove("pular");
            }, { once: true });
        }
        updateNomeCount();
    }
});

// Lógica para alternar o modo noturno e carregar preferência
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        this.textContent = '☀️';
    } else {
        localStorage.setItem('darkMode', 'disabled');
        this.textContent = '🌙';
    }
});

// Verifica a preferência do usuário ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').textContent = '☀️';
    } else {
        document.getElementById('dark-mode-toggle').textContent = '🌙';
    }
    updateNomeCount();
    // Esconde a área de exibição do OCR no carregamento inicial
    document.getElementById("ocr-display-area").style.display = 'none';
});
