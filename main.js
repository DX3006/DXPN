var tempoAniPadrao = 2000;
var audio = new Audio("audio.mp3");
audio.volume = .5;
cdPadrao = 10;
cdUser = {};


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
var scope = 'channel:read:redemptions';
var ws;


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
    var url = 'https://api.twitch.tv/kraken/oauth2/authorize' +
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
    message = {
        type: 'PING'
    };
    ws.send(JSON.stringify(message));
}

function listen(topic) {
    message = {
        type: 'LISTEN',
        nonce: nonce(15),
        data: {
            topics: [topic],
            auth_token: twitchOAuthToken
        }
    };
    ws.send(JSON.stringify(message));
}






function connect() {
    var heartbeatInterval = 1000 * 60; //ms between PING's
    var reconnectInterval = 1000 * 3; //ms to wait before reconnect
    var heartbeatHandle;

    ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    ws.onopen = function (event) {
        console.log("Socket Opened");
        heartbeat();
        heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
        listen("channel-points-channel-v1." + channelId);
    };

    ws.onmessage = function (event) {
        message = JSON.parse(event.data);
        console.log("message: " + message["type"])
        console.log(message)

        if (message.type == 'RECONNECT') {
            console.log("Reconnecting...")
            setTimeout(connect, reconnectInterval);
        }
        if (message["type"] == "MESSAGE") {

            j = JSON.parse(message["data"]["message"])
            listaPedidos.push(j)

        }
    };

    ws.onclose = function () {
        clearInterval(heartbeatHandle);
        setTimeout(connect, reconnectInterval);
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
    gray = parseInt(hex.substring(1, 3), 16) * 0.2126 + parseInt(hex.substring(3, 5), 16) * 0.7152 + parseInt(hex.substring(5, 7), 16) * 0.0722;
    console.log(gray);
    document.getElementById("box").style.backgroundColor = hex;
    return gray > 127 ? true : false;
}


function loadImage(elen,img) {
    return new Promise((resolve, reject) => {
      elen.onload = function () {
        resolve()
      }
      elen.src =img;
  
    })
  }
  
  

async function lista() {
    while (true) {
        /* console.log("rodou"); */
        if (listaPedidos.length > 0) {
            sleepT = tempoAniPadrao + 1200;
            playAni = false

            j = listaPedidos[0];
            listaPedidos.shift()
            /* console.log("entrou na lista"); */

            title = j["data"]["redemption"]["reward"]["title"]
            userInput = String(j["data"]["redemption"]["user_input"]).trim()
            userID = j["data"]["redemption"]["user"]["id"];
            userName=j["data"]["redemption"]["user"]["display_name"]

            if (cdUser[userID] == undefined) {
                cdUser[userID] = {}
            }

            d = new Date();
            if (cdUser[userID][title] == undefined || d - cdUser[userID][title] >= 1000 * cdPadrao) {
                cdUser[userID][title] = d

                document.getElementById("nome").innerHTML = userName
                document.getElementById("acao").innerHTML = title;
                
                if (j["data"]["redemption"]["reward"]["image"] == null) {
                    await loadImage(document.getElementById("img"),j["data"]["redemption"]["reward"]["default_image"]["url_4x"])
                } else {
                    await loadImage(document.getElementById("img"),j["data"]["redemption"]["reward"]["image"]["url_4x"])
                }


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
                audio.play()
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
                'Accept': 'application/vnd.twitchtv.v5+json',
                'Authorization': 'OAuth ' + twitchOAuthToken
            }
        };
        const data = await fetch('https://api.twitch.tv/kraken', h).then(function (response) {
            return response.json();
        })
        if (data.error == undefined) {
            channelId = data.token.user_id;
            console.log(channelId)
            $('#animation').show()
            connect()
            lista()

        } else {
            console.log("fail")
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
        lang="en-US"
    }
    key=Object.keys(language[lang])
    for(c1=0;c1<key.length;c1++){
        comp=document.getElementsByClassName(key[c1])
        for(c2=0;c2<comp.length;c2++){
            comp[c2].innerHTML=language[lang][key[c1]]
        }
    }
}

iniciar()
changeLanguage(navigator.language)