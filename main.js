
var tempoAniPadrao=2000;
var audio = new Audio("audio.mp3");
audio.volume= .5;

var twitchOAuthToken =null;
var channelId=null;
var clientId = 'apprklrt7e4tasfoq8rjonw99edjxu'; 
var redirectURI = 'https://dx3006.github.io/DXPN/';
var scope = 'channel_read channel:read:redemptions';
var ws;
listaPedidos=[]

function parseFragment(hash) {
    var match = hash.match(/access_token=(\w+)/);
    if(match){
        twitchOAuthToken = match[1]
        return twitchOAuthToken;
    }else{
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

    ws.onopen = function(event) {
        console.log("Socket Opened");
        heartbeat();
        heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
        listen("channel-points-channel-v1."+channelId);
    };

    ws.onmessage = function(event) {
        message = JSON.parse(event.data);
        console.log("message: "+message["type"])
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

    ws.onclose = function() {
        clearInterval(heartbeatHandle);
        setTimeout(connect, reconnectInterval);
    };

}


function sleepTime(timeS){
    return new Promise((resolve,reject) =>{
        setTimeout(()=>{
            resolve()
        },timeS)
    })
}

function playAnimation(direc){

    
    document.getElementById("anchor").removeAttribute("style")
    document.getElementById("anchor").removeAttribute("class")
    document.getElementById("box").removeAttribute("class")

    void  document.getElementById("box").offsetWidth;

    if(direc==0){
        /* console.log("play in"); */
        document.getElementById("anchor").classList.add("anchorAniIn")
        document.getElementById("box").classList.add("boxAniIn")
    }else{
        /* console.log("play out"); */
        document.getElementById("anchor").classList.add("anchorAniOut")
        document.getElementById("box").classList.add("boxAniOut")
    }
    
    
    /* timer=window.setTimeout(
    function(){
            document.getElementById("anchor").style.display = "none";
    },4000); */
}


async function lista(){
    while(true){
        /* console.log("rodou"); */
        if( listaPedidos.length>0 ){
            sleepT=tempoAniPadrao+1200;
            playAni=false

            j=listaPedidos[0];
            listaPedidos.shift()
            /* console.log("entrou na lista"); */




            hex=j["data"]["redemption"]["reward"]["background_color"]
            gray=parseInt(hex.substring(1,3),16)*0.2126+parseInt(hex.substring(3,5),16)*0.7152+parseInt(hex.substring(5,7),16)*0.0722
            
            document.getElementById("box").style.backgroundColor=hex;
            if(gray>127){
                document.getElementById("nome").style.color="#112"
                document.getElementById("acao").style.color="#112"
            }else{
                document.getElementById("nome").style.color="#fff"
                document.getElementById("acao").style.color="#fff"
            }


            document.getElementById("nome").innerHTML = j["data"]["redemption"]["user"]["display_name"]

            if(j["data"]["redemption"]["reward"]["image"]==null){
                document.getElementById("img").src = j["data"]["redemption"]["reward"]["default_image"]["url_4x"]
            }else{
                document.getElementById("img").src = j["data"]["redemption"]["reward"]["image"]["url_4x"]
            }

            title=j["data"]["redemption"]["reward"]["title"]

            document.getElementById("acao").innerHTML = title;


            if(audio.duration>sleepT){
                sleepT=audio.duration*1000-700
            }
            audio.play()
            playAnimation(0);
            playAni=true

            await sleepTime(sleepT);
            playAnimation(1);
            await sleepTime(1000);
            
            document.getElementById("anchor").style.display = "none";
            /* console.log("final"); */
        }else{
            await sleepTime(1000);
        }
    }
}


function fail(){
    console.log(authUrl())
    $('#login-box').attr("href", authUrl());
    $('#login').show()
}





async function iniciar() {
    if(parseFragment(document.location.hash)){
        console.log(twitchOAuthToken)
        var h = { 
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.twitchtv.v5+json',
                'Client-ID': clientId,
                'Authorization': 'OAuth '+ twitchOAuthToken
            }
        };    
        const data=await fetch('https://api.twitch.tv/kraken/channel', h).then(function(response) {
            return response.json();
        })
        if(data.status!=401){
            channelId=data["_id"];
            console.log(channelId)
            $('#animation').show()
            connect()
            lista()

        }else{
            console.log("fail")
            fail();
        }
    }else{
        fail();
    }
};

iniciar()