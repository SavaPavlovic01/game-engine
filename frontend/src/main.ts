async function start() {
  const pc = new RTCPeerConnection();

  const dc = pc.createDataChannel("data", {
    ordered: false,
    maxRetransmits: 0,
  });

  dc.onopen = () => {
    console.log("DataChannel open");
    dc.send("hello from client 👋");
  };

  dc.onmessage = (e) => {
    console.log("Server:", e.data);
  };

  dc.onerror = (e) => console.error("DC error:", e);
  dc.onclose = () => console.log("DC closed");

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise<void>(resolve => {
    if (pc.iceGatheringState === "complete") return resolve();
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") resolve();
    };
  });

  const localDesc = pc.localDescription!;

  const res = await fetch("http://localhost:8080/offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sdp: localDesc.sdp,
      type: localDesc.type,
    }),
  });

  const answer = await res.json();
  await pc.setRemoteDescription(answer);
}

start().catch(console.error);
