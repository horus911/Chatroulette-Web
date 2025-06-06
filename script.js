// 🎥 Variables WebRTC
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isMuted = false;
let camOn = true;
let usingFrontCamera = true;

// 🌍 HTML Elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const stopBtn = document.getElementById("stopBtn");
const muteBtn = document.getElementById("muteBtn");
const camBtn = document.getElementById("camBtn");
const flipBtn = document.getElementById("flipBtn");
const chatArea = document.getElementById("chatArea");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const emojiBtn = document.getElementById("emojiBtn");
const downloadLink = document.getElementById("downloadLink");

// 🔊 Audio record
let mediaRecorder, audioChunks = [];

// 🌐 ICE Servers
const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

// 🎬 Start call
async function startCall() {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode: usingFrontCamera ? "user" : "environment" }
  });

  localVideo.srcObject = localStream;

  peerConnection = new RTCPeerConnection(iceServers);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    remoteStream.addTrack(event.track);
  };

  // TODO: WebSocket ou Netlify Function
  console.log("Appel démarré (Signaling à venir)");
}

// 🔘 Boutons principaux
startBtn.onclick = () => startCall();

stopBtn.onclick = () => {
  if (peerConnection) peerConnection.close();
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localVideo.srcObject = null;
  }
  remoteVideo.srcObject = null;
  console.log("Appel terminé");
};

nextBtn.onclick = () => {
  stopBtn.onclick();
  startCall(); // Simulé
};

muteBtn.onclick = () => {
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
};

camBtn.onclick = () => {
  camOn = !camOn;
  localStream.getVideoTracks().forEach(track => track.enabled = camOn);
  camBtn.textContent = camOn ? "Cam On" : "Cam Off";
};

flipBtn.onclick = async () => {
  usingFrontCamera = !usingFrontCamera;
  localStream.getTracks().forEach(t => t.stop());
  await startCall();
};

// 💬 Chat texte
sendBtn.onclick = sendMessage;
chatInput.onkeypress = (e) => {
  if (e.key === "Enter") sendMessage();
};

function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatArea.value += `Moi: ${msg}\n`;
  chatInput.value = "";
  // TODO: envoyer par dataChannel
}

// 😀 Emoji
emojiBtn.onclick = () => {
  chatInput.value += "😊";
  chatInput.focus();
};

// 🖼️ Envoi image
document.getElementById("imgInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.src = reader.result;
    img.style.maxWidth = "100px";
    chatArea.value += "📷 Image envoyée\n";
    chatArea.scrollTop = chatArea.scrollHeight;
  };
  reader.readAsDataURL(file);
});

// 🎙️ Audio record
document.getElementById("recordBtn").onclick = () => {
  if (!localStream) return alert("Démarre un appel.");
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    audioChunks = [];
    mediaRecorder = new MediaRecorder(localStream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = "enregistrement.webm";
      downloadLink.style.display = "inline-block";
      downloadLink.textContent = "🎧 Télécharger audio";
    };
    mediaRecorder.start();
    document.getElementById("recordBtn").textContent = "⏹️ Stop rec";
  } else {
    mediaRecorder.stop();
    document.getElementById("recordBtn").textContent = "🎙️ Enregistrer audio";
  }
};

// 🎨 Changer thème
document.getElementById("themeBtn").onclick = () => {
  document.body.classList.toggle("dark");
};

// 🕵️ Incognito
document.getElementById("incognitoBtn").onclick = () => {
  const f = "blur(10px)";
  localVideo.style.filter = localVideo.style.filter ? "" : f;
  remoteVideo.style.filter = remoteVideo.style.filter ? "" : f;
};

// 🌈 Filtres vidéo
const filters = ["grayscale(1)", "sepia(1)", "invert(1)", "none"];
let filterIndex = 0;

document.getElementById("filterBtn").onclick = () => {
  filterIndex = (filterIndex + 1) % filters.length;
  remoteVideo.style.filter = filters[filterIndex];
};

// 🌍 Pays
fetch("flags.json")
  .then(res => res.json())
  .then(flags => {
    const select = document.getElementById("country");
    flags.forEach(flag => {
      const opt = document.createElement("option");
      opt.value = flag.code;
      opt.textContent = `${flag.emoji} ${flag.name}`;
      select.appendChild(opt);
    });
  });
