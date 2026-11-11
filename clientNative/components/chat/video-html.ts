export function videoHtml(fileName: string,previewOnly=false) {
  const src = JSON.stringify(fileName).replace(/</g,'\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  html, body { margin: 0; width: 100%; height: 100%; background: #000; overflow: hidden; position: relative; }
  video, canvas { position: absolute; left: 0; top: 0; width: 100vw; height: 100vh; object-fit: contain; background: #000; }
  video { opacity: 0; }
</style>
</head>
<body>
<video id="v" playsinline webkit-playsinline preload="auto"></video>
<script>
  var v = document.getElementById('v');
  var priming = true;
  v.muted = true;
  v.preload = 'auto';
  v.src = ${src};
  function send(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  function paintPoster() {
    if (!v.videoWidth) return;
    var canvas = window.__poster;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;background:#000;';
      document.body.appendChild(canvas);
      window.__poster = canvas;
    }
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    var ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
  }
  function hidePoster() {
    if (!window.__poster) return;
    window.__poster.remove();
    window.__poster = null;
  }
  function showLive() {
    v.style.opacity = '1';
  }
  function finishPrime() {
    if (!priming) return;
    paintPoster();
    v.pause();
    v.muted = false;
    v.style.opacity = '0';
    priming = false;
    send({ t: 'meta', d: v.duration || 0 });
    send({ t: 'play', v: false, c: 0, d: v.duration || 0 });
    if (${JSON.stringify(previewOnly)}) {
      v.removeAttribute('src');
      v.load();
    }
  }
  function showOpeningFrame() {
    var armed = false;
    function onTime() {
      if (v.currentTime <= 0) return;
      v.removeEventListener('timeupdate', onTime);
      if (armed) return;
      armed = true;
      finishPrime();
    }
    v.addEventListener('timeupdate', onTime);
    var pending = v.play();
    if (pending && pending.catch) {
      pending.catch(function () {
        try { v.currentTime = 0.05; } catch (e) {}
        setTimeout(finishPrime, 80);
      });
    }
  }
  v.addEventListener('loadeddata', showOpeningFrame);
  v.addEventListener('seeked', function () {
    if (priming || !v.paused) return;
    paintPoster();
  });
  v.addEventListener('loadedmetadata', function () {
    send({ t: 'meta', d: v.duration });
  });
  v.addEventListener('timeupdate', function () {
    if (priming) return;
    send({ t: 'time', c: v.currentTime, d: v.duration });
  });
  v.addEventListener('play', function () {
    if (!priming) send({ t: 'play', v: true });
  });
  v.addEventListener('pause', function () {
    if (!priming) send({ t: 'play', v: false });
  });
  v.addEventListener('ended', function () {
    send({ t: 'play', v: false, c: v.duration, d: v.duration });
  });
  function onCmd(raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg.t === 'play') {
      priming = false;
      v.muted = false;
      hidePoster();
      showLive();
      if (v.currentTime < 0.2) v.currentTime = 0;
      v.play();
    }
    if (msg.t === 'pause') {
      paintPoster();
      v.pause();
      v.style.opacity = '0';
    }
    if (msg.t === 'seek' && typeof msg.c === 'number') {
      v.currentTime = msg.c;
    }
    if (msg.t === 'replay') {
      priming = false;
      v.muted = false;
      hidePoster();
      showLive();
      v.currentTime = 0;
      v.play();
    }
  }
  document.addEventListener('message', function (e) { onCmd(e.data); });
  window.addEventListener('message', function (e) { onCmd(e.data); });
</script>
</body>
</html>`;
}
