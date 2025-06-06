let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');
let pseudoInput = document.getElementById('pseudo');
let countrySelect = document.getElementById('country');
let nextBtn = document.getElementById('nextBtn');
let imgInput = document.getElementById('imgInput');
let canvas = document.getElementById('imageOverlay');
let ctx = canvas.getContext('2d');
let recordBtn = document.getElementById('recordBtn');
let downloadLink = document.getElementById('downloadLink');

let localStream, pc, dataChannel, recorder, chunks = [];
let socket = new WebSocket("wss://chatroul-production.up.railway.app");
let clientId = Math.random().toString(36).substring(2, 10);
let peerId = null;

let allPeers = [];

fetch('peers.json')
  .then(res => res.json())
  .then(data => {
    allPeers = data;
    console.log("Liste des pairs disponibles :", allPeers);
    findRandomPeer();
  });

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  if (data.to !== clientId) return;

  switch (data.type) {
    case "offer":
      await createPeer(false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "answer", answer, to: data.from });
      peerId = data.from;
      break;

    case "answer":
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      break;

    case "ice":
      if (data.candidate) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (e) {
          console.warn("ICE error:", e);
        }
      }
      break;
  }
};

function send(msg) {
  msg.from = clientId;
  socket.send(JSON.stringify(msg));
}

async function startCall() {
  if (!peerId || peerId === clientId) {
    alert("Aucun interlocuteur disponible pour le moment.");
    return;
  }
  await createPeer(true);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  send({ type: "offer", offer, to: peerId });
}

async function createPeer(isCaller) {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  pc = new RTCPeerConnection();
  pc.onicecandidate = (e) => {
    if (e.candidate) send({ type: "ice", candidate: e.candidate, to: peerId });
  };
  pc.ontrack = (e) => {
    remoteVideo.srcObject = e.streams[0];
  };

  if (isCaller) {
    dataChannel = pc.createDataChannel("chat");
    setupDataChannel();
  } else {
    pc.ondatachannel = (e) => {
      dataChannel = e.channel;
      setupDataChannel();
    };
  }

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
}

function setupDataChannel() {
  dataChannel.onmessage = ev => {
    let data = JSON.parse(ev.data);
    if (data.type === "image") showImage(data.payload);
  };
}

function showImage(base64) {
  let img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };
  img.src = base64;
}

imgInput.onchange = () => {
  let file = imgInput.files[0];
  let reader = new FileReader();
  reader.onload = () => {
    if (dataChannel?.readyState === "open") {
      dataChannel.send(JSON.stringify({ type: "image", payload: reader.result }));
    }
  };
  reader.readAsDataURL(file);
};

recordBtn.onclick = () => {
  recorder = new MediaRecorder(localStream);
  chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    let blob = new Blob(chunks, { type: 'audio/webm' });
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'session_audio.webm';
    downloadLink.style.display = 'inline';
    downloadLink.textContent = "Télécharger l'audio";
  };
  recorder.start();
  setTimeout(() => recorder.stop(), 10000);
};

document.getElementById('startBtn').onclick = () => {
  findRandomPeer();
};

nextBtn.onclick = () => location.reload();

function findRandomPeer() {
  const selfId = clientId;
  const filtered = allPeers.filter(p => p.id !== selfId);

  if (filtered.length === 0) {
    alert("Aucun autre pair disponible pour le moment.");
    return;
  }

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  peerId = random.id;
  console.log("Connexion à :", random);
  startCall();
}

// Chargement de la liste des pays avec drapeaux
fetch('flags.json').then(res => res.json()).then(data => {
  data.forEach(c => {
    let opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.name;
    countrySelect.appendChild(opt);
  });
});
