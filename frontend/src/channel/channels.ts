export interface ChannelOps {
    onMessage: ((e: MessageEvent<any>) => any) | null;
    onOpen: ((e: Event) => any) | null;
    onError: ((e: RTCErrorEvent) => any) | null;
    onClose: ((e: Event) => any) | null;
}

export enum LobbyOps {
    makeLobby,
    playerConnected,
    joinLobby,
    broadcast,
    otherPlayerJoined,
    startGame,
}

export interface LobbyChannelMsg {
    operation: LobbyOps;
    values: any;
}

export interface LobbyRequestResponse {
    operation: LobbyOps;
    status: number;
    values: any;
}
