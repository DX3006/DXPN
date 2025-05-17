var tempoAniPadrao = 2000;
var audio = new Audio("audio.mp3");
audio.volume = .5;
cdPadrao = 10;
cdUser = {};
var DEBUG_MODE = false; // Defina como true para ativar logs adicionais de depuração
var audioEnabled = false; // Flag para verificar se o áudio está habilitado
var userInteracted = false; // Flag para verificar se o usuário interagiu com a página

// Verifica se a URL contém parâmetro de modo de depuração
if (window.location.search.includes('debug=true')) {
    DEBUG_MODE = true;
    console.log('Modo de depuração ativado');
}

// Verifica se estamos em modo de teste local
var isLocalTest = window.location.pathname.includes('test_local.html');
if (isLocalTest) {
    console.log('Modo de teste local ativado');
}

/* 
if(sessionStorage.teste == undefined){
    sessionStorage.teste=0
}else{
    sessionStorage.teste++
}
console.log(sessionStorage.teste )
 */

var twitchOAuthToken = null;
var channelId = null;
var clientId = 'apprklrt7e4tasfoq8rjonw99edjxu';
var redirectURI = 'https://dx3006.github.io/DXPN/';
// O escopo foi atualizado para incluir os necessários para EventSub
var scope = 'channel:read:redemptions channel:manage:redemptions';
var ws;
var sessionId = null;


listaPedidos = []

function parseFragment(hash) {
    var match = hash.match(/access_token=(\w+)/);
    if (match) {
        twitchOAuthToken = match[1]
        return twitchOAuthToken;
    } else {
        return null;
    }
};




function authUrl() {
    sessionStorage.twitchOAuthState = nonce(15);
    var url = 'https://id.twitch.tv/oauth2/authorize' +
        '?response_type=token' +
        '&client_id=' + clientId +
        '&redirect_uri=' + redirectURI +
        '&scope=' + scope;
    return url
}
// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function heartbeat() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING' }));
    }
}

// Função para inscrever-se em eventos de resgates de pontos de canal usando EventSub
async function subscribeToEvents() {
    if (!sessionId || !twitchOAuthToken || !channelId) return;
    
    try {
        // Cria uma inscrição para eventos de resgate de pontos de canal
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + twitchOAuthToken,
                'Client-Id': clientId,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'channel.channel_points_custom_reward_redemption.add',
                version: '1',
                condition: {
                    broadcaster_user_id: channelId
                },
                transport: {
                    method: 'websocket',
                    session_id: sessionId
                }
            })
        });
        
        const data = await response.json();
        console.log('Inscrição EventSub:', data);
    } catch (error) {
        console.error('Erro ao inscrever-se em eventos:', error);
    }
}






function connect() {
    var heartbeatInterval = 1000 * 60; // ms entre PINGs
    var reconnectInterval = 1000 * 3; // ms para esperar antes de reconectar
    var heartbeatHandle;

    // Nova URL do EventSub WebSockets
    ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    ws.onopen = function (event) {
        console.log("Socket Opened");
        heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
    };

    ws.onmessage = function (event) {
        const message = JSON.parse(event.data);
        console.log("message:", message.metadata?.message_type || message.type);
        console.log(message);

        // Processar mensagens do EventSub WebSocket
        if (message.metadata) {
            switch (message.metadata.message_type) {
                case 'session_welcome':
                    // Quando recebemos a mensagem de boas-vindas, obtemos o ID da sessão
                    sessionId = message.payload.session.id;
                    console.log("Session ID:", sessionId);
                    // Inscrever-se em eventos após receber o ID de sessão
                    subscribeToEvents();
                    break;
                    
                case 'session_keepalive':
                    // Mensagens keepalive, nada a fazer
                    break;
                    
                case 'notification':                    // Processar notificação de evento
                    if (message.payload.subscription.type === 'channel.channel_points_custom_reward_redemption.add') {
                        // Exibir o evento original para depuração
                        if (DEBUG_MODE) {
                            console.log("Evento original EventSub:", message.payload.event);
                        }
                        
                        // Formatar os dados para manter compatibilidade com o código existente
                        const redemptionEvent = message.payload.event;
                        const redemptionData = {
                            data: {
                                redemption: {
                                    id: redemptionEvent.id,
                                    user: {
                                        id: redemptionEvent.user_id,
                                        display_name: redemptionEvent.user_name
                                    },
                                    user_input: redemptionEvent.user_input || "",
                                    reward: {
                                        title: redemptionEvent.reward.title,
                                        background_color: redemptionEvent.reward.background_color,
                                        image: redemptionEvent.reward.image,
                                        default_image: redemptionEvent.reward.default_image || {
                                            url_1x: "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png",
                                            url_4x: "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png"
                                        }
                                    }
                                }
                            }
                        };
                        console.log("Redenção recebida:", redemptionData);
                        listaPedidos.push(redemptionData);
                    }
                    break;
                    
                case 'session_reconnect':
                    // Reconectar usando a nova URL fornecida
                    const reconnectUrl = message.payload.session.reconnect_url;
                    console.log("Reconnecting to:", reconnectUrl);
                    clearInterval(heartbeatHandle);
                    ws.close();
                    ws = new WebSocket(reconnectUrl);
                    break;
                    
                default:
                    console.log("Mensagem desconhecida:", message);
            }
        }
    };

    ws.onclose = function (event) {
        console.log("WebSocket closed:", event.code, event.reason);
        clearInterval(heartbeatHandle);
        // Reconectar após um intervalo, a menos que o fechamento seja intencional
        if (event.code !== 1000) {
            setTimeout(connect, reconnectInterval);
        }
    };

    ws.onerror = function (error) {
        console.error("WebSocket error:", error);
    };
}


function sleepTime(timeS) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timeS)
    })
}

function playAnimation(direc) {


    document.getElementById("anchor").removeAttribute("style")
    document.getElementById("anchor").removeAttribute("class")
    document.getElementById("box").removeAttribute("class")

    void document.getElementById("box").offsetWidth;

    if (direc == 0) {
        /* console.log("play in"); */
        document.getElementById("anchor").classList.add("anchorAniIn")
        document.getElementById("box").classList.add("boxAniIn")
    } else {
        /* console.log("play out"); */
        document.getElementById("anchor").classList.add("anchorAniOut")
        document.getElementById("box").classList.add("boxAniOut")
    }


    /* timer=window.setTimeout(
    function(){
            document.getElementById("anchor").style.display = "none";
    },4000); */
}

function hexIsLightColor(hex){
    // Verificar se a cor está em formato válido e tem pelo menos 7 caracteres (#RRGGBB)
    if (!hex || typeof hex !== 'string' || hex.length < 7) {
        // Cor padrão se inválida
        document.getElementById("box").style.backgroundColor = "#6441a5"; // Roxo da Twitch
        return false; // Cores escuras usam texto branco
    }
    
    try {
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        
        // Cálculo da luminosidade percebida
        const gray = r * 0.2126 + g * 0.7152 + b * 0.0722;
        
        if (DEBUG_MODE) {
            console.log(`Cor: ${hex}, Luminosidade: ${gray}`);
        }
        
        document.getElementById("box").style.backgroundColor = hex;
        return gray > 127;
    } catch (error) {
        console.error("Erro ao processar cor:", error);
        document.getElementById("box").style.backgroundColor = "#6441a5"; // Roxo da Twitch
        return false; // Cores escuras usam texto branco
    }
}


function loadImage(elen, img) {
    return new Promise((resolve, reject) => {
        // Verificar se a URL da imagem é válida
        if (!img || typeof img !== 'string') {
            // Se não for válida, usar uma imagem padrão
            img = "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png";
            if (DEBUG_MODE) {
                console.log("URL de imagem inválida, usando imagem padrão");
            }
        }
        
        // Configurar handlers de eventos
        elen.onload = function () {
            resolve();
        };
        
        elen.onerror = function (error) {
            console.error("Erro ao carregar imagem:", error);
            // Em caso de erro, tentar uma imagem padrão
            elen.src = "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png";
            resolve();
        };
        
        // Tentar carregar a imagem
        elen.src = img;
    });
}
  
  

async function lista() {
    while (true) {
        /* console.log("rodou"); */
        if (listaPedidos.length > 0) {
            sleepT = tempoAniPadrao + 1200;
            playAni = false

            j = listaPedidos[0];
            listaPedidos.shift()
            /* console.log("entrou na lista"); */            // Adaptação para trabalhar com o formato de dados do EventSub
            // Verificar se todos os dados necessários existem
            if (!j.data || !j.data.redemption || !j.data.redemption.reward || !j.data.redemption.user) {
                console.error("Dados de redenção inválidos:", j);
                continue; // Pular este item se estiver incompleto
            }
            
            title = j.data.redemption.reward.title || "Recompensa";
            // O campo user_input pode existir ou não, dependendo da recompensa
            userInput = j.data.redemption.user_input ? String(j.data.redemption.user_input).trim() : "";
            userID = j.data.redemption.user.id || "anonymous";
            userName = j.data.redemption.user.display_name || "Usuário";

            if (cdUser[userID] == undefined) {
                cdUser[userID] = {}
            }

            d = new Date();
            if (cdUser[userID][title] == undefined || d - cdUser[userID][title] >= 1000 * cdPadrao) {
                cdUser[userID][title] = d

                document.getElementById("nome").innerHTML = userName
                document.getElementById("acao").innerHTML = title;                // Obter URL da imagem da recompensa com tratamento de erro
                let imageUrl;
                try {
                    const reward = j.data.redemption.reward;
                    
                    // Verificar se existe uma imagem personalizada
                    if (reward.image && (reward.image.url_4x || reward.image.url_1x)) {
                        imageUrl = reward.image.url_4x || reward.image.url_1x;
                    } 
                    // Se não tiver imagem personalizada, usar a padrão
                    else if (reward.default_image && (reward.default_image.url_4x || reward.default_image.url_1x)) {
                        imageUrl = reward.default_image.url_4x || reward.default_image.url_1x;
                    } 
                    // Caso de fallback, usar uma imagem padrão da Twitch
                    else {
                        imageUrl = "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png";
                    }
                    
                    if (DEBUG_MODE) {
                        console.log("URL da imagem:", imageUrl);
                    }
                } catch (error) {
                    console.error("Erro ao obter URL da imagem:", error);
                    imageUrl = "https://static-cdn.jtvnw.net/custom-reward-images/default-1.png";
                }
                
                // Carregar a imagem
                await loadImage(document.getElementById("img"), imageUrl);


                hex = j["data"]["redemption"]["reward"]["background_color"]

                if( hexIsLightColor(hex) ) {
                    document.getElementById("nome").style.color = "#112"
                    document.getElementById("acao").style.color = "#112"
                } else {
                    document.getElementById("nome").style.color = "#fff"
                    document.getElementById("acao").style.color = "#fff"
                }
                

                      if (audio.duration > sleepT) {
                    sleepT = audio.duration * 1000 - 700
                }
                
                // Reproduz o áudio apenas se o usuário já interagiu com a página
                if (userInteracted) {
                    try {
                        // Promessa de reprodução de áudio com tratamento de erro
                        const playPromise = audio.play();
                        
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                console.warn("Não foi possível reproduzir áudio:", error.message);
                                // Se o erro for por falta de interação, desativa o áudio para não mostrar mais erros
                                if (error.name === "NotAllowedError") {
                                    audioEnabled = false;
                                    showAudioEnableMessage();
                                }
                            });
                        }
                    } catch (e) {
                        console.warn("Erro ao tentar reproduzir áudio:", e);
                    }
                } else if (DEBUG_MODE) {
                    console.log("Áudio desativado - aguardando interação do usuário");
                }
                
                playAnimation(0);
                playAni = true

                await sleepTime(sleepT);
                playAnimation(1);
                await sleepTime(1000);

                document.getElementById("anchor").style.display = "none";
                /* console.log("final"); */
            }else{
                console.log(userName+" got caught in the cooldown for the reward "+title);
            }
        } else {
            await sleepTime(1000);
        }
        
    }
}

function fail() {
    console.log(authUrl())
    window.history.pushState("object or string", "Title", window.location.protocol+"//"+window.location.host+window.location.pathname)
    $('.login-box').attr("href", authUrl());
    $('#login').show()
}

function tfail() {
    console.log(authUrl())
    //window.history.pushState("object or string", "Title", window.location.protocol+"//"+window.location.host+window.location.pathname)
    $('.login-box').attr("href", authUrl());
    $('#login').hide()
    $('#fail').show()
}


async function iniciar() {
    console.log(window.location)
    hash=document.location.hash
    if(parseFragment(hash)) {
        if(hash.match(/scope=/)){
            window.history.pushState("object or string", "Title",window.location.protocol+"//"+window.location.host+window.location.pathname+"#access_token="+twitchOAuthToken)
        }
        console.log(twitchOAuthToken)
        var h = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + twitchOAuthToken
            }
        };
        try {
            const data = await fetch('https://id.twitch.tv/oauth2/validate', h).then(function (response) {
                return response.json();
            })
            if (data.error == undefined) {
                channelId = data.user_id;
                console.log(channelId)
                $('#animation').show()
                connect() // Conectar ao EventSub WebSocket
                lista()    // Iniciar processamento das notificações
            } else {
                console.log("falha na autenticação:", data.error)
                tfail();
            }
        } catch (error) {
            console.error("Erro ao validar token:", error);
            tfail();
        }
    } else {
        fail();
    }
};


async function changeLanguage(lang){
    language = await fetch('language.json').then(function (response) {
        return response.json();
    })
    
    if(language[lang]==undefined){
        lang=lang.split("-")[0]    
        if(language[lang]==undefined){ 
            lang="en"
        }
    }
    key=Object.keys(language[lang])
    for(c1=0;c1<key.length;c1++){
        comp=document.getElementsByClassName(key[c1])
        for(c2=0;c2<comp.length;c2++){
            comp[c2].innerHTML=language[lang][key[c1]]
        }
    }
}

// Função para criar e exibir uma mensagem sobre habilitação de áudio
function showAudioEnableMessage() {
    // Verificar se a mensagem já existe
    if (document.getElementById('audio-enable-message')) {
        return;
    }
    
    // Criar elemento de mensagem
    const messageDiv = document.createElement('div');
    messageDiv.id = 'audio-enable-message';
    messageDiv.style.position = 'fixed';
    messageDiv.style.bottom = '10px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '10px 15px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.fontFamily = 'Lato, sans-serif';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    messageDiv.style.cursor = 'pointer';
    
    // Texto da mensagem de acordo com o idioma
    let messageText;
    const lang = navigator.language.split('-')[0];
    
    switch(lang) {
        case 'pt':
            messageText = 'Clique aqui para habilitar o som das notificações';
            break;
        case 'es':
            messageText = 'Haga clic aquí para habilitar el sonido de las notificaciones';
            break;
        default:
            messageText = 'Click here to enable notification sounds';
    }
    
    messageDiv.textContent = messageText;
    
    // Adicionar manipulador de clique
    messageDiv.addEventListener('click', function() {
        enableAudio();
        document.body.removeChild(messageDiv);
    });
    
    // Adicionar à página
    document.body.appendChild(messageDiv);
}

// Função para habilitar o áudio
function enableAudio() {
    userInteracted = true;
    audioEnabled = true;
    
    // Tenta reproduzir e pausar o áudio imediatamente para "desbloquear" o áudio
    try {
        const silentPlay = audio.play();
        if (silentPlay !== undefined) {
            silentPlay.then(() => {
                audio.pause();
                audio.currentTime = 0;
                console.log("Áudio habilitado com sucesso!");
            }).catch(err => {
                console.warn("Não foi possível habilitar o áudio:", err);
            });
        }
    } catch (e) {
        console.warn("Erro ao tentar habilitar áudio:", e);
    }
}

// Adiciona manipulador global de erros
window.addEventListener('error', function(event) {
    console.error('Erro capturado:', event.error);
    // Não deixar o erro interromper totalmente a execução
    event.preventDefault();
    return true;
});

// Manipulador de promessas não tratadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promessa não tratada:', event.reason);
    // Não deixar o erro interromper totalmente a execução
    event.preventDefault();
    return true;
});

// Adicionar listeners para detecção de interação do usuário
['click', 'touchstart', 'keydown'].forEach(eventType => {
    document.addEventListener(eventType, function() {
        if (!userInteracted) {
            userInteracted = true;
            audioEnabled = true;
            
            // Remover a mensagem se ela estiver visível
            const messageDiv = document.getElementById('audio-enable-message');
            if (messageDiv) {
                document.body.removeChild(messageDiv);
            }
            
            if (DEBUG_MODE) {
                console.log("Interação do usuário detectada - áudio habilitado");
            }
        }
    }, { once: false });
});

// Adiciona um ouvinte para eventos simulados (para o modo de teste)
if (isLocalTest) {
    window.addEventListener('simulatedRedemption', function(e) {
        console.log('Evento simulado recebido:', e.detail);
        listaPedidos.push(e.detail);
        if (!document.getElementById('animation').style.display || 
            document.getElementById('animation').style.display === 'none') {
            document.getElementById('animation').style.display = 'block';
            // Iniciar o processamento de notificações se ainda não estiver rodando
            if (listaPedidos.length === 1) {
                lista();
            }
        }
    });
    // No modo de teste, mostrar a animação diretamente
    document.getElementById('animation').style.display = 'block';
} else {
    // Fluxo normal para uso com Twitch
    iniciar();
    changeLanguage(navigator.language);
}