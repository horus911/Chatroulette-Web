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

let localStream, remoteStream, pc, dataChannel, recorder, chunks = [];

// Load countries
fetch('flags.json').then(res => res.json()).then(data => {
  data.forEach(c => {
    let opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.name;
    countrySelect.appendChild(opt);
  });
});

async function startCall() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  pc = new RTCPeerConnection();
  dataChannel = pc.createDataChannel("chat");

  pc.onicecandidate = e => e.candidate && sendSignal({ ice: e.candidate });
  pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
  pc.ondatachannel = e => {
    e.channel.onmessage = ev => {
      let data = JSON.parse(ev.data);
      if (data.type === "image") showImage(data.payload);
    };
  };

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  let offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  sendSignal({ offer });
}

function sendSignal(msg) {
  // Remplacer par un vrai serveur WebSocket si besoin
  console.log("Signal:", msg);
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
    dataChannel.send(JSON.stringify({ type: "image", payload: reader.result }));
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
  setTimeout(() => recorder.stop(), 10000); // stop après 10 secondes
};

document.getElementById('startBtn').onclick = startCall;
nextBtn.onclick = () => location.reload();
