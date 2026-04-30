import type { ChannelOps } from './channel/channels.js';
import { backendUrl } from './constants.js';

export class WebRtcHandler {
    public init() {}

    public static async openChannel(
        label: string,
        ops: ChannelOps,
        ordered: boolean = false,
        maxRetransmits: number = 0,
    ) {
        const pc = new RTCPeerConnection();

        const dc = pc.createDataChannel(label, {
            ordered: ordered,
            maxRetransmits: maxRetransmits,
        });

        dc.onopen = ops.onOpen;

        dc.onmessage = ops.onMessage;

        dc.onerror = ops.onError;
        dc.onclose = ops.onClose;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise<void>((resolve) => {
            if (pc.iceGatheringState === 'complete') return resolve();
            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') resolve();
            };
        });

        const localDesc = pc.localDescription!;

        const res = await fetch(`${backendUrl}/offer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sdp: localDesc.sdp,
                type: localDesc.type,
            }),
        });

        const answer = await res.json();
        await pc.setRemoteDescription(answer);
        return dc;
    }
}
