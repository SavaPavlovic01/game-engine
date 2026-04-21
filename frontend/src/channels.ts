export interface ChannelOps {
    onMessage: ((e: MessageEvent<any>) => any) | null;
    onOpen: ((e: Event) => any) | null;
    onError: ((e: RTCErrorEvent) => any) | null;
    onClose: ((e: Event) => any) | null;
}

export enum LobbyOps {
    makeLobby,
    playerConnected,
}

export interface LobbyChannelMsg {
    operation: LobbyOps;
    values: any;
}
